"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sessionVerificationState } from "@/lib/http/session-result";
import { buildLoginHref } from "@/lib/http/session-recovery";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkspaceError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  const [verification, setVerification] = useState<"checking" | "active" | "expired" | "unavailable">("checking");
  useEffect(() => {
    let cancelled = false;
    void createClient().auth.getUser().then(({data, error}) => {
      if (!cancelled) setVerification(sessionVerificationState(data.user, error));
    }).catch(() => { if (!cancelled) setVerification("unavailable"); });
    return () => { cancelled = true; };
  }, []);
  if (verification === "expired") return <div className="p-3 sm:p-5"><Card><CardContent className="space-y-3 p-4 sm:p-5"><h1 className="text-sm font-semibold">Your session has expired</h1><p className="text-xs text-muted-foreground">Sign in to continue. Check the record before submitting again; this request has not been retried automatically.</p><Button asChild><Link href={buildLoginHref(typeof window === "undefined" ? null : window.location.pathname)}>Sign in again</Link></Button></CardContent></Card></div>;
  const missingRecord = /Cannot coerce the result to a single JSON object/i.test(error.message);
  return (
    <div className="p-3 sm:p-5">
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div>
            <h1 className="text-sm font-semibold">{verification === "unavailable" ? "Session verification unavailable" : missingRecord ? "Record unavailable" : "This workspace could not finish the request"}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{verification === "unavailable" ? "Your sign-in status could not be verified. Keep your inputs and check the record before trying again; changes may already be saved. This request has not been retried automatically." : missingRecord ? "This record is not available in the current workspace, or it has already been removed." : "The result could not be confirmed. Changes may already be saved. Check the record before trying the action again."}</p>
            {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="min-h-11 xl:min-h-9" onClick={() => window.location.reload()}>Retry</Button>
            <Button type="button" size="sm" className="min-h-11 xl:min-h-9" variant="outline" onClick={() => window.history.back()}>Return to previous page</Button>
            <Button asChild size="sm" className="min-h-11 xl:min-h-9" variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
