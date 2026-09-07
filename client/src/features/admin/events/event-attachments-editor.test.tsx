// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { EventAttachmentsEditor, type EventAttachmentMetadata } from "./event-attachments-editor";
import { EventAttachments } from "@/features/public/event-attachments";
let host: HTMLDivElement;
let root: Root;
const requests: FakeXHR[] = [];
class FakeXHR {
  upload = { onprogress: (_: unknown) => {} };
  onload = () => {};
  onerror = () => {};
  ontimeout = () => {};
  open = vi.fn();
  send = vi.fn();
  abort = vi.fn();
  status = 200;
  responseText = "";
  constructor() {
    requests.push(this);
  }
}
const file: EventAttachmentMetadata = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Workbook",
  originalName: "workbook.pdf",
  mimeType: "application/pdf",
  size: 1234,
};
function Harness() {
  const [value, setValue] = useState<EventAttachmentMetadata[]>([]);
  return (
    <>
      <EventAttachmentsEditor value={value} onChange={setValue} />
      <output>{JSON.stringify(value)}</output>
    </>
  );
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
  requests.length = 0;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function choose(name = "workbook.pdf") {
  const input = host.querySelector('input[type="file"]')!;
  Object.defineProperty(input, "files", {
    value: [new File(["%PDF-1.7"], name, { type: "application/pdf" })],
    configurable: true,
  });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
}
it("only adds completed uploads, permits retry, and removes saved selections", async () => {
  await act(async () => root.render(<Harness />));
  await choose();
  expect(host.querySelector("output")?.textContent).toBe("[]");
  await act(async () => requests[0].onerror());
  expect(host.textContent).toContain("Upload failed");
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent === "Retry")!
      .click(),
  );
  requests[1].responseText = JSON.stringify(file);
  await act(async () => requests[1].onload());
  expect(JSON.parse(host.querySelector("output")!.textContent!)).toEqual([file]);
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label="Remove Workbook"]')!.click(),
  );
  expect(host.querySelector("output")?.textContent).toBe("[]");
});
it("rejects unsupported files and aborts pending uploads when leaving the editor", async () => {
  await act(async () => root.render(<Harness />));
  await choose("script.exe");
  expect(requests).toHaveLength(0);
  expect(host.textContent).toContain("supported");
  await choose();
  await act(async () => root.render(<div />));
  expect(requests[0].abort).toHaveBeenCalledOnce();
});
it("renders download metadata and hides an empty attachment section", async () => {
  await act(async () =>
    root.render(<EventAttachments event={{ id: "event", attachments: [file] }} />),
  );
  expect(host.querySelector("a")?.getAttribute("href")).toBe(
    `/api/events/event/attachments/${file.id}`,
  );
  expect(host.textContent).toContain("PDF");
  await act(async () => root.render(<EventAttachments event={{ id: "event" }} />));
  expect(host.textContent).toBe("");
});
