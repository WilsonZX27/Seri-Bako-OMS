"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { buildLoginHref, chooseSessionReturnPath, getSafeReturnPath, sessionExpiredEventName, type SessionExpiredEvent } from "@/lib/http/session-recovery";

export function SessionExpiredRecovery() {
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const titleId = useId();
  const signInRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onSessionExpired = (event: Event) => {
      const detail = (event as SessionExpiredEvent).detail;
      const safePath = getSafeReturnPath(detail?.returnTo, window.location.origin);
      setReturnTo((current) => chooseSessionReturnPath(current, safePath));
    };
    window.addEventListener(sessionExpiredEventName, onSessionExpired);
    return () => window.removeEventListener(sessionExpiredEventName, onSessionExpired);
  }, []);

  const open = returnTo !== null;
  const loginHref = buildLoginHref(returnTo);

  return (
    <ModalShell open={open} onClose={() => undefined} titleId={titleId} initialFocusRef={signInRef} className="max-w-md p-5">
      <h2 id={titleId} className="text-lg font-semibold">Your session has expired</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to continue. The request was not retried automatically; check its status before submitting it again.</p>
      <div className="mt-5 flex justify-end">
        <Button asChild>
          <Link ref={signInRef} href={loginHref}>Sign in again</Link>
        </Button>
      </div>
    </ModalShell>
  );
}
