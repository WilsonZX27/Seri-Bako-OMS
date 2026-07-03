"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const warningAfterMs = 25 * 60 * 1000;
const logoutAfterMs = 30 * 60 * 1000;
const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export function SessionTimeoutProvider() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const warningTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);

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
      router.replace("/login?error=session_expired");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border bg-white p-5 shadow-xl">
        <p className="text-lg font-semibold">Are you still there?</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Your session will expire soon for security.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void signOutExpired()}>
            Sign out now
          </Button>
          <Button type="button" onClick={resetTimers}>
            Stay signed in
          </Button>
        </div>
      </div>
    </div>
  );
}
