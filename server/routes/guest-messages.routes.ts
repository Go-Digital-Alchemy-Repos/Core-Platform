import { Router } from "express";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { authenticateToken } from "../middleware/auth";
import { guestMessageLimiter } from "../middleware/security";
import { paramString } from "../utils/params";

const router = Router();

const phoneRegex = /^[\d\s\-+().]{7,20}$/;

const createGuestMessageSchema = z
  .object({
    counselorId: z.string().min(1),
    senderName: z.string().max(100).optional(),
    contactMethod: z.enum(["phone", "email"]),
    contactValue: z.string().min(1).max(200),
    message: z.string().min(1).max(5000),
    ageAcknowledged: z.literal(true, { errorMap: () => ({ message: "Age acknowledgment is required" }) }),
    phiAcknowledged: z.literal(true, { errorMap: () => ({ message: "PHI acknowledgment is required" }) }),
  })
  .refine(
    (data) => {
      if (data.contactMethod === "email") {
        return z.string().email().safeParse(data.contactValue).success;
      }
      return phoneRegex.test(data.contactValue);
    },
    { message: "Invalid contact information", path: ["contactValue"] }
  );

router.post(
  "/",
  guestMessageLimiter,
  asyncHandler(async (req, res) => {
    const body = createGuestMessageSchema.parse(req.body);

    const counselor = await storage.users.getUser(body.counselorId);
    if (!counselor || counselor.role !== "therapist") {
      res.status(404).json({ message: "Counselor not found" });
      return;
    }

    const cleanMessage = sanitizeHtml(body.message, {
      allowedTags: [],
      allowedAttributes: {},
    });
    const cleanName = body.senderName
      ? sanitizeHtml(body.senderName, { allowedTags: [], allowedAttributes: {} })
      : null;
    const cleanContact = sanitizeHtml(body.contactValue, {
      allowedTags: [],
      allowedAttributes: {},
    });

    const guestMsg = await storage.guestMessages.create({
      counselorId: body.counselorId,
      senderName: cleanName,
      contactMethod: body.contactMethod,
      contactValue: cleanContact,
      message: cleanMessage,
      ageAcknowledged: true,
      phiAcknowledged: true,
    });

    setImmediate(async () => {
      try {
        const prefs = await storage.notifications.getPreferences(body.counselorId);
        const senderDisplay = cleanName || "A visitor";
        if (prefs.inAppNewMessage) {
          await storage.notifications.create({
            userId: body.counselorId,
            type: "new_message",
            title: `New guest message from ${senderDisplay}`,
            body: `${senderDisplay} sent you a message. Contact: ${body.contactMethod} - ${cleanContact}`,
            linkUrl: "/therapist/guest-messages",
          });
        }
      } catch (err) {
        console.error("[GuestMessages] Failed to send notification:", err);
      }
    });

    res.status(201).json({ id: guestMsg.id, message: "Message sent successfully" });
  })
);

router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    if (req.user!.role !== "therapist" && req.user!.role !== "admin") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const messages = await storage.guestMessages.getByCounselorId(userId);
    res.json(messages);
  })
);

router.put(
  "/:id/read",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const msg = await storage.guestMessages.getById(id);
    if (!msg) {
      res.status(404).json({ message: "Message not found" });
      return;
    }
    if (msg.counselorId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    await storage.guestMessages.markRead(id);
    res.json({ ok: true });
  })
);

router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const msg = await storage.guestMessages.getById(id);
    if (!msg) {
      res.status(404).json({ message: "Message not found" });
      return;
    }
    if (msg.counselorId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    await storage.guestMessages.delete(id);
    res.json({ ok: true });
  })
);

export default router;
