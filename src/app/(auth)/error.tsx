"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/system-states";

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-dvh bg-background">
      <ErrorState
        title="This page could not be loaded"
        description="Please refresh or return to login."
        action={
          <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={reset}>Refresh</Button>
          <Button asChild className="min-h-11">
            <Link href="/login">Return to login</Link>
          </Button>
          </div>
        }
      />
    </main>
  );
}
