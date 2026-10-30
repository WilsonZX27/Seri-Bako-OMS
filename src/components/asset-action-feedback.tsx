"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Feedback = { path: string; message: string; tone: "pending" | "success" | "error" };
const FeedbackContext = createContext<((feedback: Feedback) => void) | null>(null);
export const useAssetFeedback = () => useContext(FeedbackContext);

/** Lives above refresh-keyed asset forms; a server receipt survives their reset. */
export function AssetActionFeedback({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [notice, setNotice] = useState<Feedback | null>(null);
  const publish = useCallback((value: Feedback) => setNotice(value), []);
  const visible = notice?.path === pathname ? notice : null;
  const Icon = visible?.tone === "pending" ? LoaderCircle : visible?.tone === "error" ? AlertTriangle : CheckCircle2;
  return <FeedbackContext.Provider value={publish}>{children}{visible ? <div data-asset-action-feedback role={visible.tone === "error" ? "alert" : "status"} className={`fixed left-4 right-4 top-[calc(var(--sb-topbar-height)+0.75rem)] z-50 flex max-w-md items-center gap-3 rounded-[var(--sb-panel-radius)] border p-3 text-sm shadow-[0_8px_24px_rgba(6,44,31,0.16)] sm:left-auto sm:right-6 ${visible.tone === "success" ? "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]" : visible.tone === "error" ? "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" : "border-border bg-white text-foreground"}`}>
    <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${visible.tone === "pending" ? "animate-spin motion-reduce:animate-none" : ""}`} />
    <p className="min-w-0 flex-1 break-words leading-5">{visible.message}</p>
    <Button type="button" variant="ghost" size="icon" className="!h-8 !min-h-8 !w-8 !min-w-8 shrink-0 !p-0" aria-label="Close asset message" onClick={() => setNotice(null)}><X className="h-4 w-4" aria-hidden="true" /></Button>
  </div> : null}</FeedbackContext.Provider>;
}
