import { Router } from "express";
import sanitizeHtml from "sanitize-html";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { authenticateToken } from "../middleware/auth";
import { sendNewMessageEmail } from "../services/email.service";
import { z } from "zod";
import { paramString } from "../utils/params";

const SAFE_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "s", "ul", "ol", "li", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

const router = Router();

router.use(authenticateToken);

router.post(
  "/conversations",
  asyncHandler(async (req, res) => {
    const { professionalId } = z.object({ professionalId: z.string() }).parse(req.body);
    const userId = req.user!.id;

    let clientId: string;
    let finalProfessionalId: string;

    if (req.user!.role === "therapist") {
      const profile = await storage.therapists.getProfileByUserId(userId);
      if (!profile) {
        res.status(400).json({ message: "Mental health professional profile not found" });
        return;
      }
      clientId = professionalId;
      finalProfessionalId = userId;
    } else {
      clientId = userId;
      finalProfessionalId = professionalId;
    }

    const conversation = await storage.messages.getOrCreateConversation(clientId, finalProfessionalId);
    res.json(conversation);
  })
);

router.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const conversations = await storage.messages.getConversationsForUser(req.user!.id);
    res.json(conversations);
  })
);

router.get(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const convId = paramString(req.params.id);
    const conv = await storage.messages.getConversationById(convId);
    if (!conv) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }
    const userId = req.user!.id;
    if (conv.clientId !== userId && conv.professionalId !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const messages = await storage.messages.getMessages(convId);
    res.json({ conversation: conv, messages });
  })
);

router.post(
  "/conversations/:id/send",
  asyncHandler(async (req, res) => {
    const body = z.object({
      content: z.string().min(1),
      contentHtml: z.string().optional(),
      attachmentUrl: z.string().optional(),
      attachmentName: z.string().optional(),
      attachmentType: z.string().optional(),
    }).parse(req.body);
    const convId = paramString(req.params.id);
    const conv = await storage.messages.getConversationById(convId);
    if (!conv) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }
    const userId = req.user!.id;
    if (conv.clientId !== userId && conv.professionalId !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const cleanHtml = body.contentHtml ? sanitizeHtml(body.contentHtml, SAFE_HTML_OPTIONS) : undefined;
    const msg = await storage.messages.sendMessage(convId, userId, body.content, {
      contentHtml: cleanHtml,
      attachmentUrl: body.attachmentUrl,
      attachmentName: body.attachmentName,
      attachmentType: body.attachmentType,
    });
    res.json(msg);

    setImmediate(async () => {
      try {
        const recipientId = conv.clientId === userId ? conv.professionalId : conv.clientId;
        const [sender, recipient] = await Promise.all([
          storage.users.getUser(userId),
          storage.users.getUser(recipientId),
        ]);
        if (!recipient || !sender) return;
        const prefs = await storage.notifications.getPreferences(recipientId);
        const senderName = `${sender.firstName} ${sender.lastName}`.trim();
        if (prefs.inAppNewMessage) {
          await storage.notifications.create({
            userId: recipientId,
            type: "new_message",
            title: `New message from ${senderName}`,
            body: "You have a new message in your Message Center.",
            linkUrl: "/messages",
          });
        }
        if (prefs.emailNewMessage && recipient.email) {
          const origin = req.get("origin") || `${req.protocol}://${req.get("host")}`;
          await sendNewMessageEmail(
            recipient.email,
            recipient.firstName,
            senderName,
            `${origin}/messages`
          );
        }
      } catch (err) {
        console.error("[Notifications] Failed to send message notification:", err);
      }
    });
  })
);

router.put(
  "/conversations/:id/read",
  asyncHandler(async (req, res) => {
    const convId = paramString(req.params.id);
    const conv = await storage.messages.getConversationById(convId);
    if (!conv) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }
    const userId = req.user!.id;
    if (conv.clientId !== userId && conv.professionalId !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    await storage.messages.markMessagesRead(convId, userId);
    res.json({ ok: true });
  })
);

router.get(
  "/unread",
  asyncHandler(async (req, res) => {
    const count = await storage.messages.getUnreadCount(req.user!.id);
    res.json({ count });
  })
);

export default router;
