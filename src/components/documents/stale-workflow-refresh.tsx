"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StaleWorkflowRefresh({ message }: { message?: string | null }) {
  const router = useRouter();
  const shouldRefresh = message?.toLowerCase().includes("refreshing");

  useEffect(() => {
    if (!shouldRefresh) return;
    const timer = window.setTimeout(() => router.refresh(), 800);
    return () => window.clearTimeout(timer);
  }, [router, shouldRefresh]);

  return null;
}
