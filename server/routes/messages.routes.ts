import { Router } from "express";
import sanitizeHtml from "sanitize-html";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";

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
    const { counselorId } = z.object({ counselorId: z.string() }).parse(req.body);
    const userId = req.user!.id;

    let clientId: string;
    let finalCounselorId: string;

    if (req.user!.role === "therapist") {
      const profile = await storage.therapists.getProfileByUserId(userId);
      if (!profile) {
        res.status(400).json({ message: "Counselor profile not found" });
        return;
      }
      clientId = counselorId;
      finalCounselorId = userId;
    } else {
      clientId = userId;
      finalCounselorId = counselorId;
    }

    const conversation = await storage.messages.getOrCreateConversation(clientId, finalCounselorId);
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
    const conv = await storage.messages.getConversationById(req.params.id);
    if (!conv) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }
    const userId = req.user!.id;
    if (conv.clientId !== userId && conv.counselorId !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const messages = await storage.messages.getMessages(req.params.id);
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
    const conv = await storage.messages.getConversationById(req.params.id);
    if (!conv) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }
    const userId = req.user!.id;
    if (conv.clientId !== userId && conv.counselorId !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    const cleanHtml = body.contentHtml ? sanitizeHtml(body.contentHtml, SAFE_HTML_OPTIONS) : undefined;
    const msg = await storage.messages.sendMessage(req.params.id, userId, body.content, {
      contentHtml: cleanHtml,
      attachmentUrl: body.attachmentUrl,
      attachmentName: body.attachmentName,
      attachmentType: body.attachmentType,
    });
    res.json(msg);
  })
);

router.put(
  "/conversations/:id/read",
  asyncHandler(async (req, res) => {
    const conv = await storage.messages.getConversationById(req.params.id);
    if (!conv) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }
    const userId = req.user!.id;
    if (conv.clientId !== userId && conv.counselorId !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    await storage.messages.markMessagesRead(req.params.id, userId);
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
