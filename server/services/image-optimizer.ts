import sharp from "sharp";
import { logger } from "../utils/logger";

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const DEFAULTS: Required<OptimizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 80,
};

export interface OptimizedImage {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  originalSize: number;
  optimizedSize: number;
}

export function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.includes(mime);
}

function mimeToExtension(mime: string): string {
  switch (mime) {
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/gif": return ".gif";
    case "image/webp": return ".webp";
    default: return ".bin";
  }
}

export async function optimizeImage(
  inputBuffer: Buffer,
  inputMime: string,
  opts: OptimizeOptions = {}
): Promise<OptimizedImage> {
  const { maxWidth, maxHeight, quality } = { ...DEFAULTS, ...opts };
  const originalSize = inputBuffer.length;

  try {
    let pipeline = sharp(inputBuffer, { animated: inputMime === "image/gif" });

    const metadata = await pipeline.metadata();

    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > maxWidth || metadata.height > maxHeight)
    ) {
      pipeline = pipeline.resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const outputBuffer = await pipeline
      .webp({ quality })
      .toBuffer();

    if (outputBuffer.length >= originalSize) {
      logger.info(
        `Image WebP conversion not beneficial (${(originalSize / 1024).toFixed(0)}KB → ${(outputBuffer.length / 1024).toFixed(0)}KB), keeping original`
      );
      return {
        buffer: inputBuffer,
        mimeType: inputMime,
        extension: mimeToExtension(inputMime),
        originalSize,
        optimizedSize: originalSize,
      };
    }

    logger.info(
      `Image optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(outputBuffer.length / 1024).toFixed(0)}KB (${Math.round((1 - outputBuffer.length / originalSize) * 100)}% reduction)`
    );

    return {
      buffer: outputBuffer,
      mimeType: "image/webp",
      extension: ".webp",
      originalSize,
      optimizedSize: outputBuffer.length,
    };
  } catch (err) {
    logger.warn("Image optimization failed, using original", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      buffer: inputBuffer,
      mimeType: inputMime,
      extension: mimeToExtension(inputMime),
      originalSize,
      optimizedSize: originalSize,
    };
  }
}

export const AVATAR_OPTIONS: OptimizeOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 80,
};

export const CMS_OPTIONS: OptimizeOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 80,
};

export const ATTACHMENT_OPTIONS: OptimizeOptions = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 80,
};
