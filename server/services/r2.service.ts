import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { logger } from "../utils/logger";

let cachedClient: S3Client | null = null;

async function getR2Config(): Promise<{
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
} | null> {
  try {
    const { storage } = await import("../storage/index");
    const settings = await storage.settings.getDecryptedCategory("cloudflare_r2");
    const accountId = settings["r2_account_id"];
    const accessKeyId = settings["r2_access_key_id"];
    const secretAccessKey = settings["r2_secret_access_key"];
    const bucketName = settings["r2_bucket_name"];
    const publicUrl = settings["r2_public_url"] || "";

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
    }
  } catch (err) {
    logger.r2.warn("Failed to load R2 configuration", { error: err instanceof Error ? err.message : String(err) });
  }
  return null;
}

async function getClient(): Promise<{ client: S3Client; bucketName: string; publicUrl: string } | null> {
  const config = await getR2Config();
  if (!config) return null;

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return {
    client: cachedClient,
    bucketName: config.bucketName,
    publicUrl: config.publicUrl,
  };
}

export async function isConfigured(): Promise<boolean> {
  const config = await getR2Config();
  return config !== null;
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const r2 = await getClient();
  if (!r2) {
    logger.r2.warn("Not configured — cannot upload file", { key });
    return null;
  }

  try {
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicUrl = r2.publicUrl
      ? `${r2.publicUrl.replace(/\/$/, "")}/${key}`
      : `https://${r2.bucketName}.r2.dev/${key}`;

    logger.r2.info("File uploaded", { key });
    return publicUrl;
  } catch (err) {
    logger.r2.error("Upload failed", err, { key });
    return null;
  }
}

export async function deleteFile(key: string): Promise<boolean> {
  const r2 = await getClient();
  if (!r2) return false;

  try {
    await r2.client.send(
      new DeleteObjectCommand({
        Bucket: r2.bucketName,
        Key: key,
      })
    );
    logger.r2.info("File deleted", { key });
    return true;
  } catch (err) {
    logger.r2.error("Delete failed", err, { key });
    return false;
  }
}

export async function testConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const r2 = await getClient();
  if (!r2) {
    return { success: false, message: "Cloudflare R2 not configured" };
  }

  try {
    await r2.client.send(
      new HeadBucketCommand({ Bucket: r2.bucketName })
    );
    return { success: true, message: "R2 connection successful" };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed" };
  }
}

export function resetClient(): void {
  cachedClient = null;
}
