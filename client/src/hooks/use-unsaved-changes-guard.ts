import { useCallback, useEffect } from "react";

const DEFAULT_MESSAGE = "You have unsaved changes. Leave without saving?";

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  enabled?: boolean;
  message?: string;
}

export function useUnsavedChangesGuard({
  isDirty,
  enabled = true,
  message = DEFAULT_MESSAGE,
}: UseUnsavedChangesGuardOptions) {
  const shouldWarn = enabled && isDirty;

  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message, shouldWarn]);

  const confirmIfDirty = useCallback(
    (onProceed?: () => void, overrideMessage?: string) => {
      const promptMessage = overrideMessage ?? message;
      if (shouldWarn && !window.confirm(promptMessage)) {
        return false;
      }

      onProceed?.();
      return true;
    },
    [message, shouldWarn]
  );

  const confirmDiscardChanges = useCallback(
    (onDiscard?: () => void, overrideMessage?: string) =>
      confirmIfDirty(onDiscard, overrideMessage),
    [confirmIfDirty]
  );

  return {
    shouldWarn,
    confirmIfDirty,
    confirmDiscardChanges,
  };
}
