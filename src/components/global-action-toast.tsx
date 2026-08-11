"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GlobalActionToastInner() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const [visible, setVisible] = useState(false);
  const message = error ?? success;
  const tone = error ? "error" : "success";
  const Icon = error ? AlertTriangle : CheckCircle2;

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
        "fixed right-4 top-20 z-50 flex max-w-md items-start gap-3 border p-3 text-sm shadow-sm",
        tone === "error"
          ? "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]"
          : "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
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
