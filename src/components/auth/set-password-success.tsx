"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/system-states";

export function SetPasswordSuccess({ redirectTo = "/login" }: { redirectTo?: string }) {
  const router = useRouter();

  useEffect(() => {
    const handle = window.setTimeout(() => router.replace(redirectTo), 2000);
    return () => window.clearTimeout(handle);
  }, [redirectTo, router]);

  return (
    <div className="space-y-4">
      <Notice tone="success" title="Password updated successfully">
        <p>You can now log in. Redirecting shortly.</p>
      </Notice>
      <Button asChild className="w-full">
        <Link href={redirectTo}>Go to login</Link>
      </Button>
    </div>
  );
}
