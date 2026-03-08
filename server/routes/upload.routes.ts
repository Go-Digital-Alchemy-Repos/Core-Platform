import { Router } from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage/index";
import * as r2Service from "../services/r2.service";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, and WebP images are allowed"));
    }
  },
});

router.use(authenticateToken);

router.post(
  "/avatar",
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const configured = await r2Service.isConfigured();
    if (!configured) {
      res.status(503).json({
        message: "File storage not configured. Please configure Cloudflare R2 in admin settings.",
      });
      return;
    }

    const ext = req.file.mimetype.split("/")[1] === "jpeg" ? "jpg" : req.file.mimetype.split("/")[1];
    const key = `avatars/${req.user!.id}-${Date.now()}.${ext}`;

    const publicUrl = await r2Service.uploadFile(key, req.file.buffer, req.file.mimetype);
    if (!publicUrl) {
      res.status(500).json({ message: "Failed to upload file" });
      return;
    }

    await storage.users.updateUser(req.user!.id, { profileImageUrl: publicUrl });

    res.json({ url: publicUrl });
  })
);

export default router;
