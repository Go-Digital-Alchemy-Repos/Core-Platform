import { describe, expect, it } from "vitest";
import { validateEventAttachment, zipEntryNames } from "./event-attachment-validation";
import {
  eventAttachmentSelectionSchema,
  EVENT_ATTACHMENT_MAX_BYTES,
} from "@shared/event-attachments";

function zip(name: string) {
  const filename = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(filename.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt16LE(filename.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + filename.length, 12);
  end.writeUInt32LE(local.length + filename.length, 16);
  return Buffer.concat([local, filename, central, filename, end]);
}
describe("event attachment validation", () => {
  it("preserves bytes and normalizes a safe filename", () => {
    const bytes = Buffer.from("%PDF-1.7\nsynthetic");
    const original = Buffer.from(bytes);
    expect(validateEventAttachment("../handout.pdf", "application/pdf", bytes)).toEqual({
      originalName: "handout.pdf",
      mimeType: "application/pdf",
      size: bytes.length,
    });
    expect(bytes).toEqual(original);
  });
  it.each(["exe", "js", "html", "docm", "xlsm", "pptm"])("rejects %s extensions", (ext) => {
    expect(() =>
      validateEventAttachment(`file.${ext}`, "application/octet-stream", Buffer.from("test")),
    ).toThrow();
  });
  it("rejects mismatched MIME, signatures, empty and oversized files", () => {
    expect(() =>
      validateEventAttachment("file.pdf", "image/png", Buffer.from("%PDF-1.7")),
    ).toThrow();
    expect(() =>
      validateEventAttachment("file.pdf", "application/pdf", Buffer.from("MZ executable")),
    ).toThrow();
    expect(() => validateEventAttachment("file.txt", "text/plain", Buffer.alloc(0))).toThrow();
    expect(() =>
      validateEventAttachment(
        "file.txt",
        "text/plain",
        Buffer.alloc(EVENT_ATTACHMENT_MAX_BYTES + 1),
      ),
    ).toThrow();
  });
  it("accepts Unicode text but rejects binary text", () => {
    expect(
      validateEventAttachment("notes.txt", "text/plain", Buffer.from("Notes é\nNext line"))
        .mimeType,
    ).toBe("text/plain");
    expect(() =>
      validateEventAttachment("notes.txt", "text/plain", Buffer.from([255, 0, 3])),
    ).toThrow();
  });
  it("inspects ZIP names without extraction and checks office package family", () => {
    expect(zipEntryNames(zip("word/document.xml"))).toEqual(["word/document.xml"]);
    expect(
      validateEventAttachment("slides.docx", "application/zip", zip("word/document.xml")).mimeType,
    ).toContain("wordprocessingml");
    expect(() =>
      validateEventAttachment("slides.xlsx", "application/zip", zip("word/document.xml")),
    ).toThrow();
  });
  it.each([
    "../file.pdf",
    "word/vbaProject.bin",
    "macro.xlsm",
    "run.exe",
    "run.sh",
    "/absolute.txt",
  ])("rejects unsafe ZIP member %s", (name) => {
    expect(() => zipEntryNames(zip(name))).toThrow();
  });
  it("rejects encrypted, truncated and misleading ZIP directories", () => {
    const encrypted = zip("notes.txt");
    encrypted.writeUInt16LE(1, 6);
    encrypted.writeUInt16LE(1, 30 + 9 + 8);
    expect(() => zipEntryNames(encrypted)).toThrow();
    expect(() => zipEntryNames(zip("notes.txt").subarray(0, 30))).toThrow();
    const mismatched = zip("notes.txt");
    mismatched[30] = 65;
    expect(() => zipEntryNames(mismatched)).toThrow();
  });
  it("rejects duplicate selections, control characters and more than 20 files", () => {
    const item = { id: "11111111-1111-4111-8111-111111111111", displayName: "Materials" };
    expect(eventAttachmentSelectionSchema.safeParse([item]).success).toBe(true);
    expect(eventAttachmentSelectionSchema.safeParse([item, item]).success).toBe(false);
    expect(
      eventAttachmentSelectionSchema.safeParse([{ ...item, displayName: "bad\nname" }]).success,
    ).toBe(false);
    expect(eventAttachmentSelectionSchema.safeParse(Array(21).fill(item)).success).toBe(false);
  });
});
