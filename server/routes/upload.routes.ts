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
  limits: { fileSize: 3 * 1024 * 1024 },
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

const ATTACHMENT_MIMES = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
];

const SAFE_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".ppt", ".pptx", ".csv", ".txt",
];

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ATTACHMENT_MIMES.includes(file.mimetype) && SAFE_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Accepted: images, PDF, Word, Excel, PowerPoint, CSV, TXT."));
    }
  },
});

const LOCAL_ATTACHMENT_DIR = path.resolve(process.cwd(), "uploads", "attachments");

function ensureAttachmentDir() {
  if (!fs.existsSync(LOCAL_ATTACHMENT_DIR)) {
    fs.mkdirSync(LOCAL_ATTACHMENT_DIR, { recursive: true });
  }
}

router.post(
  "/attachment",
  attachmentUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const originalName = req.file.originalname;
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;

    const r2Configured = await r2Service.isConfigured();
    let publicUrl: string | null = null;

    if (r2Configured) {
      const key = `attachments/${filename}`;
      publicUrl = await r2Service.uploadFile(key, req.file.buffer, req.file.mimetype);
    }

    if (!publicUrl) {
      ensureAttachmentDir();
      const localPath = path.join(LOCAL_ATTACHMENT_DIR, filename);
      fs.writeFileSync(localPath, req.file.buffer);
      publicUrl = `/uploads/attachments/${filename}`;
    }

    res.json({
      url: publicUrl,
      name: originalName,
      type: req.file.mimetype,
      size: req.file.size,
    });
  })
);

export default router;
