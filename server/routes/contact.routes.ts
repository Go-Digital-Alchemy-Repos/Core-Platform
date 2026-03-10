import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { validateBody } from "../middleware/validation";
import { insertContactMessageSchema } from "@shared/schema";
import { sendContactFormEmail } from "../services/email.service";
import { logger } from "../utils/logger";

const router = Router();

router.post(
  "/",
  validateBody(insertContactMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await storage.contacts.createMessage(req.body);

    const admins = await storage.users.getUsersByRole("admin");
    const adminEmails = admins.map((a) => a.email);
    if (adminEmails.length > 0) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      sendContactFormEmail(
        adminEmails,
        req.body.name || "Unknown",
        req.body.email || "no-reply@unknown.com",
        req.body.message || "",
        `${baseUrl}/admin`
      ).catch((err) => logger.email.warn("Failed to send contact form notification", { error: err.message }));
    }

    res.status(201).json({ message: "Message sent successfully" });
  })
);

export default router;
