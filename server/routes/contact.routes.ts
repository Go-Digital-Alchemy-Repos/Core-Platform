import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { validateBody } from "../middleware/validation";
import { insertContactMessageSchema } from "@shared/schema";

const router = Router();

router.post(
  "/",
  validateBody(insertContactMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await storage.contacts.createMessage(req.body);
    res.status(201).json({ message: "Message sent successfully" });
  })
);

export default router;
