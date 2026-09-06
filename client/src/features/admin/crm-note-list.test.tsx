// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CrmNoteList, CrmNoteVisibility } from "./crm-note-list";
it("shows shared audience, escaped current names and neutral missing-author fallback", () => {
  vi.stubGlobal("React", React);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    act(() =>
      root.render(
        <>
          <CrmNoteVisibility />
          <CrmNoteList
            notes={[
              {
                id: "named",
                body: "<script>bad()</script>",
                createdAt: null,
                authorName: "<img src=x onerror=bad()>",
              },
              { id: "missing", body: "Second", createdAt: null, authorName: null },
              { id: "legacy", body: "Third", createdAt: null },
            ]}
            formatDate={() => "Recorded date"}
          />
        </>,
      ),
    );
    expect(host.textContent).toContain("Visible to everyone with CRM access.");
    expect(host.textContent).toContain("<img src=x onerror=bad()> · Recorded date");
    expect(host.querySelector("script,img")).toBeNull();
    expect(host.textContent?.match(/Author unavailable/g)).toHaveLength(2);
    expect(host.textContent).not.toContain("System");
  } finally {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  }
});
