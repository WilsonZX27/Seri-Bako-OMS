"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/system-states";

export function ChangePasswordSuccess() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        router.replace("/dashboard");
      } catch {
        window.location.assign("/dashboard");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="space-y-4">
      <Notice tone="success" title="Password changed successfully">
        <p>Redirecting to dashboard...</p>
      </Notice>
      <Button asChild className="w-full">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
