"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-3 sm:p-5">
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-semibold">This workspace could not finish the request</h2>
            <p className="mt-1 text-xs text-muted-foreground">Your saved records are unchanged unless a success message was shown. Retry, or return to a safe workspace.</p>
            {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={reset}>Retry</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.history.back()}>Return to previous page</Button>
            <Button asChild size="sm" variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
