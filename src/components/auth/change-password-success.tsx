"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">Password changed successfully.</p>
        <p className="mt-1">Redirecting to dashboard...</p>
      </div>
      <Button asChild className="w-full">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
