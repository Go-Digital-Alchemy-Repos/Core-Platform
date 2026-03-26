import { eq, and, or, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { conversations, directMessages, type Conversation, type DirectMessage } from "@shared/schema";
import { users } from "@shared/schema";

export interface ParticipantInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
}

export interface ConversationWithParticipants extends Conversation {
  client: ParticipantInfo;
  professional: ParticipantInfo;
  lastMessage?: { content: string; createdAt: Date | null; senderId: string } | null;
  unreadCount: number;
}

export interface MessageWithSender extends DirectMessage {
  sender: ParticipantInfo;
}

const clientUsers = db.$with("client_users").as(
  db.select().from(users)
);

export class MessageStorage {
  async getOrCreateConversation(clientId: string, professionalId: string): Promise<Conversation> {
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.clientId, clientId), eq(conversations.professionalId, professionalId)));

    if (existing) return existing;

    const [created] = await db
      .insert(conversations)
      .values({ clientId, professionalId })
      .returning();

    return created;
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async getConversationsForUser(userId: string): Promise<ConversationWithParticipants[]> {
    const rows = await db
      .select()
      .from(conversations)
      .where(or(eq(conversations.clientId, userId), eq(conversations.professionalId, userId)))
      .orderBy(desc(conversations.updatedAt));

    if (rows.length === 0) return [];

    const results: ConversationWithParticipants[] = [];

    for (const conv of rows) {
      const [clientUser] = await db.select().from(users).where(eq(users.id, conv.clientId));
      const [professionalUser] = await db.select().from(users).where(eq(users.id, conv.professionalId));

      const [lastMsg] = await db
        .select()
        .from(directMessages)
        .where(eq(directMessages.conversationId, conv.id))
        .orderBy(desc(directMessages.createdAt))
        .limit(1);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(directMessages)
        .where(
          and(
            eq(directMessages.conversationId, conv.id),
            eq(directMessages.isRead, false),
            sql`${directMessages.senderId} != ${userId}`
          )
        );

      results.push({
        ...conv,
        client: {
          id: clientUser?.id ?? conv.clientId,
          firstName: clientUser?.firstName ?? null,
          lastName: clientUser?.lastName ?? null,
          profileImageUrl: clientUser?.profileImageUrl ?? null,
          role: clientUser?.role ?? "client",
        },
        professional: {
          id: professionalUser?.id ?? conv.professionalId,
          firstName: professionalUser?.firstName ?? null,
          lastName: professionalUser?.lastName ?? null,
          profileImageUrl: professionalUser?.profileImageUrl ?? null,
          role: professionalUser?.role ?? "therapist",
        },
        lastMessage: lastMsg
          ? { content: lastMsg.content, createdAt: lastMsg.createdAt, senderId: lastMsg.senderId }
          : null,
        unreadCount: Number(count),
      });
    }

    return results;
  }

  async getMessages(conversationId: string): Promise<MessageWithSender[]> {
    const msgs = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.conversationId, conversationId))
      .orderBy(directMessages.createdAt);

    const results: MessageWithSender[] = [];
    for (const msg of msgs) {
      const [sender] = await db.select().from(users).where(eq(users.id, msg.senderId));
      results.push({
        ...msg,
        sender: {
          id: sender?.id ?? msg.senderId,
          firstName: sender?.firstName ?? null,
          lastName: sender?.lastName ?? null,
          profileImageUrl: sender?.profileImageUrl ?? null,
          role: sender?.role ?? "client",
        },
      });
    }
    return results;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    extras?: { contentHtml?: string; attachmentUrl?: string; attachmentName?: string; attachmentType?: string }
  ): Promise<DirectMessage> {
    const [msg] = await db
      .insert(directMessages)
      .values({
        conversationId,
        senderId,
        content,
        contentHtml: extras?.contentHtml ?? null,
        attachmentUrl: extras?.attachmentUrl ?? null,
        attachmentName: extras?.attachmentName ?? null,
        attachmentType: extras?.attachmentType ?? null,
      })
      .returning();

    const now = new Date();
    await db
      .update(conversations)
      .set({ updatedAt: now, lastMessageAt: now })
      .where(eq(conversations.id, conversationId));

    return msg;
  }

  async markMessagesRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(directMessages.conversationId, conversationId),
          sql`${directMessages.senderId} != ${userId}`
        )
      );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const convs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(or(eq(conversations.clientId, userId), eq(conversations.professionalId, userId)));

    if (convs.length === 0) return 0;

    const convIds = convs.map((c) => c.id);
    let total = 0;
    for (const convId of convIds) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(directMessages)
        .where(
          and(
            eq(directMessages.conversationId, convId),
            eq(directMessages.isRead, false),
            sql`${directMessages.senderId} != ${userId}`
          )
        );
      total += Number(count);
    }
    return total;
  }
}
