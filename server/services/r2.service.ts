import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { logger } from "../utils/logger";
import { retryOnce } from "../utils/retry";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function getFallbackPublicBaseUrl(bucketName: string): string {
  return `https://${bucketName}.r2.dev`;
}

function getPublicBaseUrl(bucketName: string, configuredPublicUrl: string): string {
  const trimmed = configuredPublicUrl.trim();
  if (!trimmed) {
    return getFallbackPublicBaseUrl(bucketName);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.endsWith(".r2.cloudflarestorage.com")) {
      logger.r2.warn("Configured public URL uses the private R2 API host; falling back to the public bucket URL", {
        configuredPublicUrl: trimmed,
      });
      return getFallbackPublicBaseUrl(bucketName);
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    logger.r2.warn("Configured public URL is invalid; falling back to the public bucket URL", {
      configuredPublicUrl: trimmed,
    });
    return getFallbackPublicBaseUrl(bucketName);
  }
}

function buildPublicObjectUrl(baseUrl: string, key: string): string {
  const normalizedKey = key.replace(/^\/+/, "");
  return `${baseUrl.replace(/\/$/, "")}/${normalizedKey}`;
}

async function getR2Config(): Promise<R2Config | null> {
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
  if (cachedClient && cachedConfig) {
    return {
      client: cachedClient,
      bucketName: cachedConfig.bucketName,
      publicUrl: cachedConfig.publicUrl,
    };
  }

  const config = await getR2Config();
  if (!config) return null;

  cachedConfig = config;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    client: cachedClient,
    bucketName: config.bucketName,
    publicUrl: config.publicUrl,
  };
}

export async function isConfigured(): Promise<boolean> {
  if (cachedClient && cachedConfig) return true;
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
    await retryOnce(
      () =>
        r2.client.send(
          new PutObjectCommand({
            Bucket: r2.bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          })
        ),
      "R2 upload"
    );

    const publicUrl = buildPublicObjectUrl(
      getPublicBaseUrl(r2.bucketName, r2.publicUrl),
      key
    );

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
    await retryOnce(
      () =>
        r2.client.send(
          new DeleteObjectCommand({
            Bucket: r2.bucketName,
            Key: key,
          })
        ),
      "R2 delete"
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
  cachedConfig = null;
}

export async function normalizePublicUrl(url: string | null | undefined): Promise<string | null | undefined> {
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (
    !parsed.hostname.endsWith(".r2.cloudflarestorage.com") &&
    !parsed.hostname.endsWith(".r2.dev")
  ) {
    return url;
  }

  const r2 = await getClient();
  if (!r2) return url;

  const publicBaseUrl = getPublicBaseUrl(r2.bucketName, r2.publicUrl);
  return buildPublicObjectUrl(publicBaseUrl, parsed.pathname);
}
