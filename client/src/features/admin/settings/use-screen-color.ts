import { useEffect, useRef, useState } from "react";

type ScreenDropper = { open(options: { signal: AbortSignal }): Promise<{ sRGBHex: string }> };
type ScreenWindow = Window & { EyeDropper?: new () => ScreenDropper };

export const SCREEN_COLOR_GUIDANCE =
  "Screen sampling is unavailable in this browser. If you’re using the Codex browser, open this page in Chrome or Edge over HTTPS. Keep unsaved changes here until you save, or use the color picker or hex field.";

/** One user-activated session shared by all Branding color fields. */
export function useScreenColor(onColor: (field: string, color: string) => void) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sampledField, setSampledField] = useState<string | null>(null);
  const session = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const restoreFocus = useRef<HTMLButtonElement | null>(null);
  const supported =
    typeof window !== "undefined" &&
    window.isSecureContext === true &&
    typeof (window as ScreenWindow).EyeDropper === "function";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      session.current?.abort();
      session.current = null;
      restoreFocus.current = null;
    };
  }, []);
  useEffect(() => {
    if (activeField === null && restoreFocus.current) {
      const button = restoreFocus.current;
      restoreFocus.current = null;
      if (button.isConnected && button.getClientRects().length > 0) button.focus();
    }
  }, [activeField]);

  const cancel = () => {
    session.current?.abort();
    session.current = null;
    setActiveField(null);
  };

  const sample = (field: string, button: HTMLButtonElement) => {
    if (session.current) return;
    if (!supported) {
      setError(SCREEN_COLOR_GUIDANCE);
      return;
    }
    const controller = new AbortController();
    session.current = controller;
    restoreFocus.current = button;
    setActiveField(field);
    setError(null);
    setSampledField(null);
    const current = () => mounted.current && session.current === controller;
    const failed = (cause: unknown) => {
      if (!current() || controller.signal.aborted) return;
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(
        "Screen sampling could not start or finish. Try again, or use the color picker or hex field. Your colors have not changed.",
      );
    };
    const finished = () => {
      if (!current()) return;
      session.current = null;
      setActiveField(null);
    };
    try {
      const EyeDropper = (window as ScreenWindow).EyeDropper!;
      // Do not await, schedule or fetch before open: it requires this click's transient activation.
      const selection = new EyeDropper().open({ signal: controller.signal });
      void selection
        .then(({ sRGBHex }) => {
          if (!current() || controller.signal.aborted) return;
          if (!/^#[0-9a-f]{6}$/i.test(sRGBHex)) throw new Error("Invalid sampled color");
          onColor(field, sRGBHex.toUpperCase());
          setSampledField(field);
        })
        .catch(failed)
        .finally(finished);
    } catch (cause) {
      failed(cause);
      finished();
    }
  };
  return { supported, activeField, error, sampledField, sample, cancel };
}
