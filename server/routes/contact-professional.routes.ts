import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { sendEmail } from "../services/email.service";
import { logger } from "../utils/logger";
import { guestMessageLimiter } from "../middleware/security";

const router = Router();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const contactProfessionalSchema = z.object({
  professionalUserId: z.string().min(1),
  senderName: z.string().min(1).max(100),
  senderEmail: z.string().email().max(255),
  message: z.string().min(10).max(5000),
  preferredContact: z.enum(["email", "phone", "text"]),
  phone: z.string().max(30).optional(),
}).refine(
  (data) => {
    if (data.preferredContact === "phone" || data.preferredContact === "text") {
      return !!data.phone && data.phone.trim().length >= 7;
    }
    return true;
  },
  { message: "Phone number is required when preferred contact is phone call or text message", path: ["phone"] }
);

const PREFERRED_CONTACT_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone Call",
  text: "Text Message",
};

router.post("/", guestMessageLimiter, async (req: Request, res: Response) => {
  const parsed = contactProfessionalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid form data", details: parsed.error.flatten().fieldErrors });
  }

  const { professionalUserId, senderName, senderEmail, message, preferredContact, phone } = parsed.data;

  try {
    const profile = await storage.therapists.getProfileByUserId(professionalUserId);
    if (!profile) {
      return res.status(404).json({ error: "Professional not found" });
    }

    const user = await storage.users.getUser(professionalUserId);
    if (!user || !user.email) {
      return res.status(404).json({ error: "Professional contact not available" });
    }

    const professionalName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Professional";
    const safeName = escapeHtml(senderName);
    const safeEmail = escapeHtml(senderEmail);
    const safeMessage = escapeHtml(message);
    const safePhone = phone ? escapeHtml(phone) : null;
    const contactLabel = PREFERRED_CONTACT_LABELS[preferredContact] || "Email";

    const phoneRow = safePhone
      ? `<p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${safePhone}</p>`
      : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Contact Message via Core Platform</h2>
        <p>Hi ${escapeHtml(professionalName)},</p>
        <p>You've received a new message through your Core Platform profile:</p>
        <div style="background: #f9f9f9; border-left: 4px solid #4f8c7c; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${safeName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          ${phoneRow}
          <p style="margin: 0 0 8px 0;"><strong>Preferred Contact Method:</strong> ${contactLabel}</p>
          <p style="margin: 0 0 8px 0;"><strong>Message:</strong></p>
          <p style="margin: 0; white-space: pre-wrap;">${safeMessage}</p>
        </div>
        <p style="color: #666; font-size: 14px;">You can reply directly to this person at <a href="mailto:${safeEmail}">${safeEmail}</a>.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">This message was sent through your Core Platform counselor profile.</p>
      </div>
    `;

    const sent = await sendEmail(
      user.email,
      `New message from ${safeName} — Core Platform`,
      html
    );

    if (!sent) {
      logger.email.warn("Email delivery not configured — contact-professional message could not be sent", {
        professionalUserId,
        senderEmail,
      });
      return res.status(503).json({ error: "Email service is not configured. Please try contacting the professional through other means listed on their profile." });
    }

    res.json({ success: true });
  } catch (err) {
    logger.app.error("Failed to send contact-professional email", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
