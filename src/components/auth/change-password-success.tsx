"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ChangePasswordSuccess() {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [router]);

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
      Password changed successfully. Redirecting to dashboard...
    </div>
  );
}
