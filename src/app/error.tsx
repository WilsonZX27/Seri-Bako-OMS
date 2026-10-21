"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppError({ error }: { error: Error & { digest?: string } }) {
  const missingRecord = /Cannot coerce the result to a single JSON object/i.test(error.message);
  const title = missingRecord ? "Record unavailable" : "This page could not load";
  return <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center p-4 sm:p-6" aria-labelledby="root-error-title">
    <Card className="w-full" role="alert">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sb-danger)]" aria-hidden="true" /><div><h1 id="root-error-title" className="text-lg font-semibold">{title}</h1><p className="mt-1 text-sm leading-5 text-muted-foreground">{missingRecord ? "This record is not available in the current workspace, or it has already been removed." : "The result could not be confirmed. Changes may already be saved. Check the record before trying the action again."}</p>{error.digest ? <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p> : null}</div></div>
        <div className="grid gap-2 sm:grid-cols-2"><Button type="button" className="min-h-11" onClick={() => window.location.reload()}>Try again</Button><Button asChild variant="outline" className="min-h-11"><Link href="/dashboard">Return to dashboard</Link></Button></div>
      </CardContent>
    </Card>
  </main>;
}
