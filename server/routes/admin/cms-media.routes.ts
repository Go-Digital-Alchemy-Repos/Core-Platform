import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { asyncHandler } from "../../middleware/error-handler";
import { storage } from "../../storage";
import * as r2Service from "../../services/r2.service";
import { paramString } from "../../utils/params";
import { optimizeImage, CMS_OPTIONS } from "../../services/image-optimizer";

const router = Router();

const CMS_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const cmsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (CMS_IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, WebP, and GIF images are allowed for CMS media"));
    }
  },
});

const LOCAL_CMS_DIR = path.resolve(process.cwd(), "uploads", "cms");

function ensureCmsDir() {
  if (!fs.existsSync(LOCAL_CMS_DIR)) {
    fs.mkdirSync(LOCAL_CMS_DIR, { recursive: true });
  }
}

router.post(
  "/upload",
  cmsUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const adminId = (req as any).user?.id;

    const optimized = await optimizeImage(req.file.buffer, req.file.mimetype, CMS_OPTIONS);
    const baseName = safeName.replace(/\.[^.]+$/, "");
    const filename = `${Date.now()}-${baseName}${optimized.extension}`;
    const r2Key = `cms/media/${filename}`;

    const r2Configured = await r2Service.isConfigured();
    let publicUrl: string | null = null;

    if (r2Configured) {
      publicUrl = await r2Service.uploadFile(r2Key, optimized.buffer, optimized.mimeType);
    }

    if (!publicUrl) {
      ensureCmsDir();
      const localPath = path.join(LOCAL_CMS_DIR, filename);
      fs.writeFileSync(localPath, optimized.buffer);
      publicUrl = `/uploads/cms/${filename}`;
    }

    const asset = await storage.cmsMedia.createMedia({
      filename,
      originalName: req.file.originalname,
      url: publicUrl,
      mimeType: optimized.mimeType,
      fileSize: optimized.optimizedSize,
      r2Key: r2Configured ? r2Key : null,
      alt: "",
      uploadedBy: adminId,
    });

    res.status(201).json(asset);
  })
);

router.get(
  "/media",
  asyncHandler(async (_req, res) => {
    const assets = await storage.cmsMedia.getAllMedia();
    res.json(
      await Promise.all(
        assets.map(async (asset) => ({
          ...asset,
          url: (await r2Service.normalizePublicUrl(asset.url)) ?? asset.url,
        }))
      )
    );
  })
);

router.patch(
  "/media/:id/alt",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const { alt } = req.body;
    if (typeof alt !== "string") {
      return res.status(400).json({ error: "alt must be a string" });
    }
    const asset = await storage.cmsMedia.updateAlt(id, alt);
    if (!asset) return res.status(404).json({ error: "Media not found" });
    res.json(asset);
  })
);

router.delete(
  "/media/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const asset = await storage.cmsMedia.getMedia(id);
    if (!asset) return res.status(404).json({ error: "Media not found" });

    if (asset.r2Key) {
      await r2Service.deleteFile(asset.r2Key);
    } else if (asset.url.startsWith("/uploads/cms/")) {
      const localPath = path.resolve(process.cwd(), asset.url.slice(1));
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }

    await storage.cmsMedia.deleteMedia(id);
    res.json({ success: true });
  })
);

export default router;
