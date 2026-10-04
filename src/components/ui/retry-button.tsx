"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Retry a failed server-rendered read without losing the current workspace URL. */
export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Retrying…" : "Retry"}</Button>;
}
