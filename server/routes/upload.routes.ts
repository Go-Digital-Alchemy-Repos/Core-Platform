import { Router } from "express";
import path from "path";
import fs from "fs";
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

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "avatars");

function ensureUploadDir() {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

router.use(authenticateToken);

router.post(
  "/avatar",
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const targetUserId = (req.user!.role === "admin" && req.body.userId) ? req.body.userId : req.user!.id;
    const ext = req.file.mimetype.split("/")[1] === "jpeg" ? "jpg" : req.file.mimetype.split("/")[1];
    const filename = `${targetUserId}-${Date.now()}.${ext}`;

    const r2Configured = await r2Service.isConfigured();

    let publicUrl: string | null = null;

    if (r2Configured) {
      const key = `avatars/${filename}`;
      publicUrl = await r2Service.uploadFile(key, req.file.buffer, req.file.mimetype);
    }

    if (!publicUrl) {
      ensureUploadDir();
      const localPath = path.join(LOCAL_UPLOAD_DIR, filename);
      fs.writeFileSync(localPath, req.file.buffer);
      publicUrl = `/uploads/avatars/${filename}`;
    }

    await storage.users.updateUser(targetUserId, { profileImageUrl: publicUrl });

    res.json({ url: publicUrl });
  })
);

export default router;
