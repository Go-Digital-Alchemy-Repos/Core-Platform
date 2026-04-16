import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorLockResourceType, EditorLockResponse } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const EDITOR_LOCK_HEARTBEAT_MS = 30_000;

type UseEditorLockOptions = {
  resourceType: EditorLockResourceType;
  resourceId?: string | null;
  enabled?: boolean;
};

type LockAction = "acquire" | "heartbeat" | "release" | "takeover";

async function postLockAction(
  action: LockAction,
  resourceType: EditorLockResourceType,
  resourceId: string,
): Promise<EditorLockResponse> {
  const res = await fetch(`/api/admin/editor-locks/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ resourceType, resourceId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to ${action} editor lock`);
  }

  return res.json();
}

async function getLockStatus(
  resourceType: EditorLockResourceType,
  resourceId: string,
): Promise<EditorLockResponse> {
  const res = await fetch(`/api/admin/editor-locks/${resourceType}/${resourceId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load editor lock");
  }

  return res.json();
}

function releaseLockKeepAlive(resourceType: EditorLockResourceType, resourceId: string) {
  const payload = JSON.stringify({ resourceType, resourceId });
  void fetch("/api/admin/editor-locks/release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function useEditorLock({ resourceType, resourceId, enabled = true }: UseEditorLockOptions) {
  const { user, isAdmin } = useAuth();
  const [lockState, setLockState] = useState<EditorLockResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lostLock, setLostLock] = useState(false);
  const activeRef = useRef(false);

  const isEnabled = Boolean(enabled && user && resourceId);
  const resolvedResourceId = resourceId ?? null;

  const runAction = useCallback(async (action: LockAction | "status") => {
    if (!resolvedResourceId) return null;
    setIsLoading(true);
    try {
      const nextState = action === "status"
        ? await getLockStatus(resourceType, resolvedResourceId)
        : await postLockAction(action, resourceType, resolvedResourceId);
      setLockState(nextState);
      setHasLoaded(true);
      setLostLock((current) => {
        if (action === "takeover" && nextState.ownedByCurrentUser) return false;
        if (action === "acquire" && nextState.ownedByCurrentUser) return false;
        if (nextState.status === "locked_by_other" && current) return true;
        if (nextState.status === "acquired" && nextState.ownedByCurrentUser) return false;
        return current;
      });
      return nextState;
    } finally {
      setIsLoading(false);
    }
  }, [resolvedResourceId, resourceType]);

  const acquire = useCallback(async () => {
    if (!isEnabled) return null;
    const nextState = await runAction("acquire");
    if (nextState && nextState.status === "locked_by_other" && activeRef.current) {
      setLostLock(false);
    }
    return nextState;
  }, [isEnabled, runAction]);

  const refresh = useCallback(async () => {
    if (!isEnabled) return null;
    return runAction("status");
  }, [isEnabled, runAction]);

  const takeOver = useCallback(async () => {
    if (!isEnabled) return null;
    const nextState = await runAction("takeover");
    if (nextState?.ownedByCurrentUser) {
      setLostLock(false);
    }
    return nextState;
  }, [isEnabled, runAction]);

  useEffect(() => {
    activeRef.current = true;
    if (!isEnabled) {
      setLockState(null);
      setHasLoaded(false);
      setLostLock(false);
      return () => {
        activeRef.current = false;
      };
    }

    void acquire();

    return () => {
      activeRef.current = false;
    };
  }, [acquire, isEnabled, resourceType, resolvedResourceId]);

  useEffect(() => {
    if (!isEnabled || !lockState?.ownedByCurrentUser || lockState.status !== "acquired" || !resolvedResourceId) {
      return;
    }

    const heartbeat = window.setInterval(async () => {
      const nextState = await runAction("heartbeat");
      if (!nextState) return;
      if (nextState.status !== "acquired" || !nextState.ownedByCurrentUser) {
        setLostLock(true);
      }
    }, EDITOR_LOCK_HEARTBEAT_MS);

    return () => window.clearInterval(heartbeat);
  }, [isEnabled, lockState, resolvedResourceId, runAction]);

  useEffect(() => {
    if (!isEnabled || !lockState?.ownedByCurrentUser || lockState.status !== "acquired" || !resolvedResourceId) {
      return;
    }

    const handleBeforeUnload = () => {
      releaseLockKeepAlive(resourceType, resolvedResourceId);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      releaseLockKeepAlive(resourceType, resolvedResourceId);
    };
  }, [isEnabled, lockState, resourceType, resolvedResourceId]);

  const isOwned = Boolean(lockState?.status === "acquired" && lockState.ownedByCurrentUser && !lostLock);
  const isLockedByOther = Boolean(lockState?.status === "locked_by_other" && !lockState.ownedByCurrentUser);
  const isReadOnly = Boolean(
    isEnabled &&
    (!hasLoaded || isLoading || lostLock || !lockState || lockState.status !== "acquired" || !lockState.ownedByCurrentUser),
  );

  const summary = useMemo(() => {
    if (!isEnabled) return null;
    if (lostLock) {
      return {
        variant: "lost-lock" as const,
        title: "Editing access changed",
        description: "Someone else now holds this lock. We’ve switched this editor into read-only mode to protect your work.",
      };
    }
    if (!lockState) {
      return {
        variant: "locked-by-other" as const,
        title: "Checking edit access",
        description: "We’re confirming whether this item is available for editing.",
      };
    }
    if (lockState.status === "acquired" && lockState.ownedByCurrentUser) {
      return {
        variant: "active-owned" as const,
        title: "You’re editing this item",
        description: "Your edit lock is active and will keep refreshing while this editor stays open.",
      };
    }
    if (lockState.lock) {
      return {
        variant: "locked-by-other" as const,
        title: `Editing locked by ${lockState.lock.lockedByName}`,
        description: "You can review the content here, but editing actions are disabled until the lock is released or expires.",
      };
    }
    return {
      variant: "locked-by-other" as const,
      title: "This item is available",
      description: "Try again to acquire the edit lock and continue editing.",
    };
  }, [isEnabled, lockState, lostLock]);

  return {
    hasLocking: isEnabled,
    lockState,
    summary,
    isLoading,
    hasLoaded,
    isOwned,
    isReadOnly,
    isLockedByOther,
    canTakeOver: Boolean(isAdmin && lockState?.canTakeOver),
    lostLock,
    acquire,
    refresh,
    takeOver,
  };
}
