"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GlobalActionToastInner() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const [visible, setVisible] = useState(false);
  const message = error ?? success;
  const tone = error ? "error" : "success";

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5200);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div
      className={cn(
        "fixed right-4 top-20 z-50 flex max-w-md items-start gap-3 rounded-lg border bg-white p-4 text-sm shadow-lg",
        tone === "error" ? "border-red-200 text-red-900" : "border-emerald-200 text-emerald-900",
      )}
      role="status"
    >
      <div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", tone === "error" ? "bg-red-600" : "bg-emerald-600")} />
      <p className="min-w-0 flex-1 leading-5">{message}</p>
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setVisible(false)} aria-label="Close message">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function GlobalActionToast() {
  return (
    <Suspense fallback={null}>
      <GlobalActionToastInner />
    </Suspense>
  );
}
