"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { createClient } from "@/lib/supabase/client";
import {
  parseSharedSessionActivity,
  sessionActivityStorageKey,
  sessionLogoutAfterMs,
  sessionWarningAfterMs,
} from "@/lib/session-activity";

const activityEvents = ["pointerdown", "mousemove", "keydown", "input", "click", "scroll", "touchstart"] as const;

export function SessionTimeoutProvider() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const warningTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const lastActivityAt = useRef(0);
  const activityChannel = useRef<BroadcastChannel | null>(null);
  const scheduleTimersRef = useRef<(activityAt: number) => void>(() => undefined);

  const clearTimers = useCallback(() => {
    if (warningTimer.current) window.clearTimeout(warningTimer.current);
    if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
  }, []);

  const signOutExpired = useCallback(async (explicit = false) => {
    let sharedActivity: number | null = null;
    try {
      sharedActivity = parseSharedSessionActivity(window.localStorage.getItem(sessionActivityStorageKey));
    } catch {
      // Private browsing/storage restrictions fall back to this tab's timer.
    }
    if (!explicit && sharedActivity !== null && sharedActivity > lastActivityAt.current) {
      scheduleTimersRef.current(sharedActivity);
      return;
    }
    if (!explicit && Date.now() - lastActivityAt.current < sessionLogoutAfterMs) {
      scheduleTimersRef.current(lastActivityAt.current);
      return;
    }
    clearTimers();
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/access-status?reason=idle-timeout");
    }
  }, [clearTimers, router]);

  const scheduleTimers = useCallback((activityAt: number) => {
    const now = Date.now();
    if (!Number.isFinite(activityAt) || activityAt > now + 5_000) return;
    const latestActivity = Math.max(activityAt, lastActivityAt.current);
    lastActivityAt.current = latestActivity;
    const elapsed = Math.max(0, now - latestActivity);
    clearTimers();
    setShowWarning(elapsed >= sessionWarningAfterMs);
    warningTimer.current = elapsed < sessionWarningAfterMs
      ? window.setTimeout(() => setShowWarning(true), sessionWarningAfterMs - elapsed)
      : null;
    logoutTimer.current = window.setTimeout(() => void signOutExpired(), Math.max(0, sessionLogoutAfterMs - elapsed));
  }, [clearTimers, signOutExpired]);
  scheduleTimersRef.current = scheduleTimers;

  useEffect(() => {
    const readSharedActivity = () => {
      try {
        return parseSharedSessionActivity(window.localStorage.getItem(sessionActivityStorageKey));
      } catch {
        return null;
      }
    };
    // Start this authenticated view at the existing local-session boundary.
    // A timestamp left by a prior sign-in must not shorten a newly opened session.
    scheduleTimers(Date.now());
    let lastBroadcastAt = 0;
    const recordActivity = () => {
      const timestamp = Date.now();
      scheduleTimers(timestamp);
      if (timestamp - lastBroadcastAt < 1_000) return;
      lastBroadcastAt = timestamp;
      try {
        window.localStorage.setItem(sessionActivityStorageKey, String(timestamp));
      } catch {
        // Timer coordination remains local when storage is unavailable.
      }
      activityChannel.current?.postMessage(timestamp);
    };
    const acceptRemoteActivity = (value: unknown) => {
      const timestamp = parseSharedSessionActivity(typeof value === "number" ? String(value) : null);
      if (timestamp !== null && timestamp > lastActivityAt.current) scheduleTimers(timestamp);
    };
    try {
      activityChannel.current = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("oms-session-activity-v1");
      if (activityChannel.current) activityChannel.current.onmessage = (event: MessageEvent<unknown>) => acceptRemoteActivity(event.data);
    } catch {
      activityChannel.current = null;
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === sessionActivityStorageKey) acceptRemoteActivity(event.newValue);
    };
    const onFocus = () => {
      const sharedActivity = readSharedActivity();
      if (sharedActivity !== null && sharedActivity > lastActivityAt.current) scheduleTimers(sharedActivity);
    };
    for (const event of activityEvents) {
      window.addEventListener(event, recordActivity, { passive: true, capture: true });
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      clearTimers();
      for (const event of activityEvents) {
        window.removeEventListener(event, recordActivity, true);
      }
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      activityChannel.current?.close();
      activityChannel.current = null;
    };
  }, [clearTimers, scheduleTimers]);

  const staySignedIn = () => {
    const timestamp = Date.now();
    scheduleTimers(timestamp);
    try {
      window.localStorage.setItem(sessionActivityStorageKey, String(timestamp));
    } catch {
      // Local timer reset still works when browser storage is unavailable.
    }
    activityChannel.current?.postMessage(timestamp);
  };

  if (!showWarning) return null;

  return (
    <ModalShell open={showWarning} onClose={staySignedIn} titleId={titleId} initialFocusRef={stayRef} className="max-w-sm p-5">
        <h2 id={titleId} className="text-lg font-semibold">Are you still there?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Your session will expire soon for security.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void signOutExpired(true)}>
            Sign out now
          </Button>
          <Button ref={stayRef} type="button" onClick={staySignedIn}>
            Stay signed in
          </Button>
        </div>
    </ModalShell>
  );
}
