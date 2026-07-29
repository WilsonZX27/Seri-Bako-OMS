"use client";

import { useEffect, useState } from "react";
import { Check, Cloud } from "lucide-react";
import { STOCK_COUNT_AUTOSAVE_EVENT } from "@/components/stock-count-form";

type AutosaveDetail = {
  state: "idle" | "recovered" | "saving" | "saved" | "error";
  label: string;
  error?: string;
};

export function StockCountAutosaveStatus() {
  const [detail, setDetail] = useState<AutosaveDetail>({
    state: "idle",
    label: "Autosave ready",
  });

  useEffect(() => {
    function update(event: Event) {
      setDetail((event as CustomEvent<AutosaveDetail>).detail);
    }
    window.addEventListener(STOCK_COUNT_AUTOSAVE_EVENT, update);
    return () => window.removeEventListener(STOCK_COUNT_AUTOSAVE_EVENT, update);
  }, []);

  const saved = detail.state === "saved";
  return (
    <div
      className={`flex min-w-0 shrink-0 items-center justify-end gap-1 text-[11px] ${detail.state === "error" ? "text-destructive" : "text-muted-foreground"}`}
      role="status"
      aria-live="polite"
    >
      {saved ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : <Cloud className="h-3.5 w-3.5" aria-hidden="true" />}
      <span className="max-w-28 truncate">{detail.label}</span>
      {detail.error ? <span className="sr-only">{detail.error}</span> : null}
    </div>
  );
}
