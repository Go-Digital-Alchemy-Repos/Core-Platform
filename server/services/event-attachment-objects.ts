import { EVENT_ATTACHMENT_MAX_BYTES } from "@shared/event-attachments";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getClientStoragePrefix } from "@shared/client-backup-policy";
import { AppError } from "../middleware/error-handler";
import { storage } from "../storage";
import { assertUploadMutationsAllowed } from "./upload-mutation-policy";

async function connection() {
  const accountId = process.env.EVENT_ATTACHMENTS_R2_ACCOUNT_ID;
  const accessKeyId = process.env.EVENT_ATTACHMENTS_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.EVENT_ATTACHMENTS_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.EVENT_ATTACHMENTS_R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket)
    throw new AppError("Private event attachment storage is not configured", 503);
  const uploads = await storage.settings.getDecryptedCategory("cloudflare_r2");
  if (bucket === uploads.r2_bucket_name && accountId === uploads.r2_account_id)
    throw new AppError("Event attachments require a separate private bucket", 503);
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 2,
  });
  return { client, bucket };
}
export function attachmentObjectKey(id: string) {
  return `${getClientStoragePrefix(process.env.CLIENT_STACK_ID, process.env.PUBLIC_SITE_ORIGIN)}/event-materials/${id}`;
}
export async function putAttachmentObject(key: string, bytes: Buffer, mimeType: string) {
  assertUploadMutationsAllowed();
  const { client, bucket } = await connection();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: mimeType,
        CacheControl: "private, no-store",
      }),
      { abortSignal: AbortSignal.timeout(30_000) },
    );
  } finally {
    client.destroy();
  }
}
export async function readBoundedAttachmentBody(
  body: AsyncIterable<Uint8Array>,
  maximumBytes = EVENT_ATTACHMENT_MAX_BYTES,
) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body) {
    size += chunk.byteLength;
    if (size > maximumBytes) throw new AppError("Attachment exceeds the download limit", 503);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
export async function getAttachmentObject(key: string) {
  const { client, bucket } = await connection();
  const controller = new AbortController();
  let body: { destroy?: () => void } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      body?.destroy?.();
      reject(new AppError("Attachment download timed out", 503));
    }, 30_000);
  });
  try {
    const download = async () => {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
        abortSignal: controller.signal,
      });
      body = result.Body as typeof body;
      if (
        !result.Body ||
        !result.ContentLength ||
        result.ContentLength > EVENT_ATTACHMENT_MAX_BYTES
      )
        throw new AppError("Attachment unavailable", 503);
      return readBoundedAttachmentBody(result.Body as AsyncIterable<Uint8Array>);
    };
    return await Promise.race([download(), deadline]);
  } finally {
    clearTimeout(timer);
    body?.destroy?.();
    client.destroy();
  }
}
export async function deleteAttachmentObject(key: string) {
  assertUploadMutationsAllowed();
  const { client, bucket } = await connection();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(30_000),
    });
  } finally {
    client.destroy();
  }
}
