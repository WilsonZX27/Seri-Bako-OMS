"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">This page could not be loaded.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please refresh or return to login.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={reset}>Refresh</Button>
          <Button asChild>
            <Link href="/login">Return to login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
