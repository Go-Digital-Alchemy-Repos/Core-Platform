import path from "node:path";
import { EVENT_ATTACHMENT_EXTENSIONS, EVENT_ATTACHMENT_MAX_BYTES } from "@shared/event-attachments";
import { AppError } from "../middleware/error-handler";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  pages: "application/vnd.apple.pages",
  numbers: "application/vnd.apple.numbers",
  key: "application/vnd.apple.keynote",
  csv: "text/csv",
  txt: "text/plain",
  rtf: "application/rtf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  zip: "application/zip",
};
const forbidden =
  /\.(?:exe|com|bat|cmd|ps1|sh|js|mjs|cjs|vbs|scr|msi|dll|html?|svg|docm|dotm|xlsm|xlam|xltm|pptm|potm|ppam|xlsb)$/i;
function reject(): never {
  throw new AppError(
    "File contents or type are not supported. Executables, scripts, encrypted archives and macro-enabled documents are not allowed.",
    400,
  );
}

// Inspect only ZIP metadata: never decompress or extract user archives.
export function zipEntryNames(bytes: Buffer): string[] {
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (
      bytes.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + bytes.readUInt16LE(i + 20) === bytes.length
    ) {
      end = i;
      break;
    }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) !== 0 || bytes.readUInt16LE(end + 6) !== 0) reject();
  const count = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  const directoryEnd = offset + bytes.readUInt32LE(end + 12);
  if (count > 10000 || directoryEnd !== end || bytes.readUInt16LE(end + 8) !== count) reject();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50) reject();
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const length = bytes.readUInt16LE(offset + 28);
    const next =
      offset + 46 + length + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
    if (next > end || flags & 1 || ![0, 8].includes(method)) reject();
    const name = bytes.subarray(offset + 46, offset + 46 + length).toString("utf8");
    if (
      !name ||
      Array.from(name).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
      name.includes("\\") ||
      name.startsWith("/") ||
      name.split("/").includes("..") ||
      forbidden.test(name) ||
      /(?:vbaProject|macrosheets|encryptedpackage)/i.test(name)
    )
      reject();
    const local = bytes.readUInt32LE(offset + 42);
    if (
      local + 30 > directoryEnd ||
      bytes.readUInt32LE(local) !== 0x04034b50 ||
      bytes.readUInt16LE(local + 6) !== flags ||
      bytes.readUInt16LE(local + 8) !== method
    )
      reject();
    const localNameLength = bytes.readUInt16LE(local + 26);
    const dataStart = local + 30 + localNameLength + bytes.readUInt16LE(local + 28);
    if (
      dataStart + bytes.readUInt32LE(offset + 20) > bytes.readUInt32LE(end + 16) ||
      bytes.subarray(local + 30, local + 30 + localNameLength).toString("utf8") !== name
    )
      reject();
    names.push(name);
    offset = next;
  }
  if (offset !== end) reject();
  return names;
}

export function validateEventAttachment(originalName: string, contentType: string, bytes: Buffer) {
  const name = path
    .basename(originalName.replace(/\\/g, "/"))
    .split("")
    .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
    .join("")
    .trim();
  const ext = path.extname(name).slice(1).toLowerCase();
  if (
    !name ||
    name.length > 200 ||
    !(EVENT_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext) ||
    !bytes.length ||
    bytes.length > EVENT_ATTACHMENT_MAX_BYTES
  )
    reject();
  const acceptedTypes = [MIME[ext], "application/octet-stream"];
  if (["docx", "xlsx", "pptx", "odt", "ods", "odp", "pages", "numbers", "key", "zip"].includes(ext))
    acceptedTypes.push("application/zip", "application/x-zip-compressed");
  if (ext === "rtf") acceptedTypes.push("text/rtf");
  if (ext === "csv") acceptedTypes.push("text/plain", "application/vnd.ms-excel");
  if (!acceptedTypes.includes(contentType.toLowerCase())) reject();
  const start = bytes.subarray(0, 16);
  if (ext === "pdf" && !start.toString("ascii").startsWith("%PDF-")) reject();
  if (["jpg", "jpeg"].includes(ext) && !start.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    reject();
  if (ext === "png" && !start.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
    reject();
  if (ext === "gif" && !/^GIF8[79]a/.test(start.toString("ascii"))) reject();
  if (
    ext === "webp" &&
    !(start.toString("ascii", 0, 4) === "RIFF" && start.toString("ascii", 8, 12) === "WEBP")
  )
    reject();
  if (ext === "rtf" && !start.toString("ascii").startsWith("{\\rtf")) reject();
  if (["txt", "csv"].includes(ext)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      reject();
    }
    if (bytes.includes(0) || bytes.some((byte) => byte < 32 && ![9, 10, 12, 13].includes(byte)))
      reject();
  }
  if (["doc", "xls", "ppt"].includes(ext)) {
    if (!start.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"))) reject();
    // OLE directory stream names are UTF-16LE, regardless of stream compression.
    const directoryText = bytes.toString("utf16le");
    if (/VBA|_VBA_PROJECT|EncryptedPackage|EncryptionInfo|Macros/i.test(directoryText)) reject();
    // Legacy Excel 4 macro sheets use BIFF BOF substream type 0x0040.
    if (ext === "xls") {
      for (let offset = 0; offset + 8 <= bytes.length; offset++) {
        if (
          bytes[offset] === 0x09 &&
          [0x00, 0x02, 0x04, 0x08].includes(bytes[offset + 1]) &&
          bytes.readUInt16LE(offset + 2) >= 4 &&
          bytes.readUInt16LE(offset + 6) === 0x0040
        )
          reject();
      }
    }
    const expected = { doc: "WordDocument", xls: "Workbook", ppt: "PowerPoint Document" }[ext]!;
    if (!directoryText.includes(expected) && !(ext === "xls" && directoryText.includes("Book")))
      reject();
  }
  if (
    ["docx", "xlsx", "pptx", "odt", "ods", "odp", "pages", "numbers", "key", "zip"].includes(ext)
  ) {
    const names = zipEntryNames(bytes);
    const required: Record<string, string> = {
      docx: "word/document.xml",
      xlsx: "xl/workbook.xml",
      pptx: "ppt/presentation.xml",
      odt: "content.xml",
      ods: "content.xml",
      odp: "content.xml",
    };
    if (required[ext] && !names.includes(required[ext])) reject();
    if (
      ["pages", "numbers", "key"].includes(ext) &&
      !names.some((n) => n.startsWith("Index/") || n === "index.xml" || n === "index.apxl")
    )
      reject();
  }
  return { originalName: name, mimeType: MIME[ext], size: bytes.length };
}
