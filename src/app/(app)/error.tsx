"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingRecord = /Cannot coerce the result to a single JSON object/i.test(error.message);
  return (
    <div className="p-3 sm:p-5">
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div>
            <h1 className="text-sm font-semibold">{missingRecord ? "Record unavailable" : "This workspace could not finish the request"}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{missingRecord ? "This record is not available in the current workspace, or it has already been removed." : "The result could not be confirmed. Changes may already be saved. Check the record before trying the action again."}</p>
            {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="min-h-11 xl:min-h-9" onClick={reset}>Retry</Button>
            <Button type="button" size="sm" className="min-h-11 xl:min-h-9" variant="outline" onClick={() => window.history.back()}>Return to previous page</Button>
            <Button asChild size="sm" className="min-h-11 xl:min-h-9" variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
