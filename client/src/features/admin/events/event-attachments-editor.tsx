import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  EVENT_ATTACHMENT_MAX_BYTES as limit,
  EVENT_ATTACHMENT_MAX_COUNT,
  EVENT_ATTACHMENT_EXTENSIONS,
  type EventAttachmentMetadata,
} from "@shared/event-attachments";
export type { EventAttachmentMetadata } from "@shared/event-attachments";
const accept = EVENT_ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(",");
type Upload = { key: string; file: File; progress: number; error?: string };
export function attachmentSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EventAttachmentsEditor({
  value,
  onChange,
}: {
  value: EventAttachmentMetadata[];
  onChange: (value: EventAttachmentMetadata[]) => void;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState("");
  const valueRef = useRef(value);
  valueRef.current = value;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const queued = useRef(new Set<string>());
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    const pending = requests.current;
    return () => {
      active.current = false;
      pending.forEach((xhr) => xhr.abort());
      pending.clear();
    };
  }, []);
  function update(next: EventAttachmentMetadata[]) {
    valueRef.current = next;
    changeRef.current(next);
  }
  function start(upload: Upload) {
    if (requests.current.has(upload.key)) return;
    const xhr = new XMLHttpRequest();
    requests.current.set(upload.key, xhr);
    setUploads((current) =>
      current.map((item) =>
        item.key === upload.key ? { ...item, error: undefined, progress: 0 } : item,
      ),
    );
    const fail = (message: string) => {
      requests.current.delete(upload.key);
      if (active.current)
        setUploads((current) =>
          current.map((item) => (item.key === upload.key ? { ...item, error: message } : item)),
        );
    };
    xhr.open("POST", "/api/admin/events/attachments");
    xhr.withCredentials = true;
    xhr.timeout = 120000;
    xhr.upload.onprogress = (event) => {
      if (active.current && event.lengthComputable)
        setUploads((current) =>
          current.map((item) =>
            item.key === upload.key
              ? { ...item, progress: Math.round((event.loaded / event.total) * 100) }
              : item,
          ),
        );
    };
    xhr.onerror = () => fail("Upload failed. Check your connection and retry.");
    xhr.ontimeout = () => fail("Upload timed out. Please retry.");
    xhr.onload = () => {
      if (!active.current || requests.current.get(upload.key) !== xhr) return;
      let data: EventAttachmentMetadata & { message?: string };
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        fail("Upload failed. Please retry.");
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        fail(data.message || "Upload failed. Please retry.");
        return;
      }
      if (!data.id || typeof data.size !== "number" || !data.originalName) {
        fail("The server returned an invalid upload response.");
        return;
      }
      requests.current.delete(upload.key);
      queued.current.delete(upload.key);
      update([...valueRef.current, data]);
      setUploads((current) => current.filter((item) => item.key !== upload.key));
    };
    const form = new FormData();
    form.append("file", upload.file);
    xhr.send(form);
  }
  function add(files: File[]) {
    setError("");
    if (valueRef.current.length + queued.current.size + files.length > EVENT_ATTACHMENT_MAX_COUNT) {
      setError("You can attach up to 20 files per event. Remove a file before adding more.");
      return;
    }
    const allowed = accept.split(",");
    const invalid = files.find(
      (file) =>
        file.size > limit ||
        file.size === 0 ||
        !allowed.includes(`.${file.name.split(".").pop()?.toLowerCase()}`),
    );
    if (invalid) {
      setError(`${invalid.name}: choose a supported, non-empty file up to 25 MB.`);
      return;
    }
    const added = files.map((file) => ({ key: crypto.randomUUID(), file, progress: 0 }));
    added.forEach((upload) => queued.current.add(upload.key));
    setUploads((current) => [...current, ...added]);
    added.forEach(start);
  }
  function move(index: number, delta: number) {
    const next = [...valueRef.current];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    update(next);
  }
  return (
    <section aria-label="Attachments" className="space-y-3">
      <h3 className="text-sm font-medium">Attachments</h3>
      <div
        className="rounded-md border-2 border-dashed p-4 space-y-2"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          add(Array.from(event.dataTransfer.files));
        }}
      >
        <label htmlFor="event-attachments-upload" className="block text-sm font-medium">
          Drop files here or browse
        </label>
        <Input
          id="event-attachments-upload"
          type="file"
          multiple
          accept={accept}
          onChange={(event) => {
            add(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
          aria-describedby="event-attachments-help"
        />
        <p id="event-attachments-help" className="text-xs text-muted-foreground">
          PDF, Office, OpenDocument, Apple iWork, CSV, TXT, RTF, images and ZIP. Up to 25 MB each,
          20 files per event. Files become available to event viewers when you save.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ul className="space-y-3">
        {value.map((file, index) => (
          <li key={file.id} className="rounded-md border p-3 space-y-2">
            <label
              htmlFor={`attachment-${file.id}`}
              className="text-xs text-muted-foreground break-all"
            >
              {file.originalName} · {attachmentSize(file.size)}
            </label>
            <Input
              id={`attachment-${file.id}`}
              aria-label={`Display name for ${file.originalName}`}
              maxLength={200}
              required
              value={file.displayName}
              onChange={(event) =>
                update(
                  valueRef.current.map((item) =>
                    item.id === file.id ? { ...item, displayName: event.target.value } : item,
                  ),
                )
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                aria-label={`Move ${file.displayName} up`}
                onClick={() => move(index, -1)}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === value.length - 1}
                aria-label={`Move ${file.displayName} down`}
                onClick={() => move(index, 1)}
              >
                Move down
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Remove ${file.displayName}`}
                onClick={() => update(valueRef.current.filter((item) => item.id !== file.id))}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {uploads.map((upload) => (
        <div key={upload.key} className="rounded-md border p-3 space-y-2">
          <p className="text-sm break-all">{upload.file.name}</p>
          {upload.error ? (
            <p role="alert" className="text-sm text-destructive">
              {upload.error}
            </p>
          ) : (
            <>
              <progress
                className="w-full"
                aria-label={`Uploading ${upload.file.name}`}
                value={upload.progress}
                max={100}
              />
              <p role="status" className="text-xs">
                {upload.progress === 100 ? "Processing upload…" : `Uploading ${upload.progress}%`}
              </p>
            </>
          )}
          <div className="flex gap-2">
            {upload.error && (
              <Button type="button" variant="outline" size="sm" onClick={() => start(upload)}>
                Retry
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                requests.current.get(upload.key)?.abort();
                requests.current.delete(upload.key);
                queued.current.delete(upload.key);
                setUploads((current) => current.filter((item) => item.key !== upload.key));
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      {uploads.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Pending and failed uploads will not be included if you save now.
        </p>
      )}
    </section>
  );
}
