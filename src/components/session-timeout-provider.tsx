"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { createClient } from "@/lib/supabase/client";

const warningAfterMs = 25 * 60 * 1000;
const logoutAfterMs = 30 * 60 * 1000;
const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export function SessionTimeoutProvider() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const warningTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const clearTimers = useCallback(() => {
    if (warningTimer.current) window.clearTimeout(warningTimer.current);
    if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
  }, []);

  const signOutExpired = useCallback(async () => {
    clearTimers();
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/access-status?reason=idle-timeout");
    }
  }, [clearTimers, router]);

  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    warningTimer.current = window.setTimeout(() => setShowWarning(true), warningAfterMs);
    logoutTimer.current = window.setTimeout(() => void signOutExpired(), logoutAfterMs);
  }, [clearTimers, signOutExpired]);

  useEffect(() => {
    resetTimers();
    for (const event of activityEvents) {
      window.addEventListener(event, resetTimers, { passive: true });
    }
    return () => {
      clearTimers();
      for (const event of activityEvents) {
        window.removeEventListener(event, resetTimers);
      }
    };
  }, [clearTimers, resetTimers]);

  if (!showWarning) return null;

  return (
    <ModalShell open={showWarning} onClose={resetTimers} titleId={titleId} initialFocusRef={stayRef} className="max-w-sm p-5">
        <h2 id={titleId} className="text-lg font-semibold">Are you still there?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Your session will expire soon for security.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void signOutExpired()}>
            Sign out now
          </Button>
          <Button ref={stayRef} type="button" onClick={resetTimers}>
            Stay signed in
          </Button>
        </div>
    </ModalShell>
  );
}
