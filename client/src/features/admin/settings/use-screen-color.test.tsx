// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScreenColor } from "./use-screen-color";

let root: Root;
let host: HTMLDivElement;
let onColor: ReturnType<typeof vi.fn>;
let open: ReturnType<typeof vi.fn>;
let resolve: (value: { sRGBHex: string }) => void;
let reject: (reason: unknown) => void;
function Harness() {
  const picker = useScreenColor(onColor);
  return (
    <>
      <button onClick={(e) => picker.sample("primary", e.currentTarget)}>Primary</button>
      <button onClick={(e) => picker.sample("secondary", e.currentTarget)}>Secondary</button>
      <button onClick={picker.cancel}>Cancel</button>
      <output>{picker.activeField}</output>
      <p role="alert">{picker.error}</p>
    </>
  );
}
const click = async (index: number) => {
  await act(async () => host.querySelectorAll("button")[index].click());
};
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("isSecureContext", true);
  onColor = vi.fn();
  open = vi.fn(
    () =>
      new Promise<{ sRGBHex: string }>((yes, no) => {
        resolve = yes;
        reject = no;
      }),
  );
  vi.stubGlobal(
    "EyeDropper",
    class {
      open = open;
    },
  );
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<Harness />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("screen color session", () => {
  it("opens synchronously from click and applies uppercase only after selection", async () => {
    act(() => {
      host.querySelectorAll("button")[0].click();
      expect(open).toHaveBeenCalledTimes(1);
    });
    expect(onColor).not.toHaveBeenCalled();
    await act(async () => resolve({ sRGBHex: "#ab12ef" }));
    expect(onColor).toHaveBeenCalledWith("primary", "#AB12EF");
    expect(document.activeElement).toBe(host.querySelectorAll("button")[0]);
  });
  it("allows one pending field even before a render publishes state", async () => {
    act(() => {
      host.querySelectorAll("button")[0].click();
      host.querySelectorAll("button")[1].click();
    });
    expect(open).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ sRGBHex: "#123456" }));
    expect(onColor).toHaveBeenCalledWith("primary", "#123456");
  });
  it("Escape cancellation preserves draft and restores focus silently", async () => {
    await click(1);
    await act(async () => reject(new DOMException("Cancelled", "AbortError")));
    expect(onColor).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("");
    expect(document.activeElement).toBe(host.querySelectorAll("button")[1]);
  });
  it("aborts an abandoned view and ignores its late completion during a new session", async () => {
    await click(0);
    const first = resolve;
    const signal = open.mock.calls[0][0].signal;
    await click(2);
    expect(signal.aborted).toBe(true);
    await click(1);
    await act(async () => first({ sRGBHex: "#ffffff" }));
    expect(onColor).not.toHaveBeenCalled();
    await act(async () => resolve({ sRGBHex: "#abcdef" }));
    expect(onColor).toHaveBeenCalledWith("secondary", "#ABCDEF");
  });
  it("aborts on unmount and rejects late updates", async () => {
    await click(0);
    const signal = open.mock.calls[0][0].signal;
    await act(async () => root.render(null));
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ sRGBHex: "#abcdef" }));
    expect(onColor).not.toHaveBeenCalled();
  });
  it.each(["rejection", "invalid-color", "constructor"])(
    "reports %s without changing draft and allows retry",
    async (kind) => {
      if (kind === "constructor")
        vi.stubGlobal(
          "EyeDropper",
          class {
            constructor() {
              throw new Error("private detail");
            }
          },
        );
      await click(0);
      if (kind === "rejection") await act(async () => reject(new Error("private detail")));
      if (kind === "invalid-color") await act(async () => resolve({ sRGBHex: "bad" }));
      expect(onColor).not.toHaveBeenCalled();
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        "Your colors have not changed",
      );
      expect(host.textContent).not.toContain("private detail");
      expect(host.querySelector("output")?.textContent).toBe("");
    },
  );
  it.each(["unsupported", "insecure"])("gives guidance for %s without opening", async (kind) => {
    if (kind === "unsupported") vi.stubGlobal("EyeDropper", undefined);
    else vi.stubGlobal("isSecureContext", false);
    await act(async () => root.render(<Harness />));
    await click(0);
    expect(open).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Chrome or Edge over HTTPS");
    expect(onColor).not.toHaveBeenCalled();
  });
});
