"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SetPasswordSuccess({ redirectTo = "/login" }: { redirectTo?: string }) {
  const router = useRouter();

  useEffect(() => {
    const handle = window.setTimeout(() => router.replace(redirectTo), 2000);
    return () => window.clearTimeout(handle);
  }, [redirectTo, router]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-medium">Password updated successfully. You can now log in.</p>
            <p className="mt-1 text-emerald-700">Redirecting shortly.</p>
          </div>
        </div>
      </div>
      <Button asChild className="w-full">
        <Link href={redirectTo}>Go to login</Link>
      </Button>
    </div>
  );
}
