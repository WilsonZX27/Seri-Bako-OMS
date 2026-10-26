"use client";

import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ActionErrorNotice } from "@/components/action-error-notice";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function RouteErrorRecovery({ message }: { message: string | null }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!message) return;
    let container: HTMLDivElement | null = null;
    const attach = () => {
      const main = document.querySelector("main");
      if (!main) return;
      // Feature-owned errors take precedence. Observe streamed content so the
      // global fallback cannot become a duplicate of a later route notice.
      const ownsError = Array.from(main.querySelectorAll('[role="alert"]:not([data-field-recovery-message])')).some((node) => !container?.contains(node) && node.textContent?.includes(message));
      if (ownsError) {
        setHost(null);
        return;
      }
      if (!container || !container.isConnected) {
        container = document.createElement("div");
        container.dataset.routeErrorRecovery = "true";
        main.prepend(container);
      }
      setHost(container);
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      container?.remove();
      setHost(null);
    };
  }, [message]);
  return host && message ? createPortal(<ActionErrorNotice message={message} />, host) : null;
}

function GlobalActionToastInner() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const warning = searchParams.get("warning");
  const [visible, setVisible] = useState(false);
  const [routeOwnsMessage,setRouteOwnsMessage]=useState(false);
  const message = error ?? warning ?? success;
  const tone = error ? "error" : warning ? "warning" : "success";
  const Icon = error ? AlertTriangle : warning ? Info : CheckCircle2;

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5200);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(()=>{
    const inspect=()=>setRouteOwnsMessage(Boolean(message && Array.from(document.querySelectorAll("[data-route-feedback]")).some(node=>node.textContent?.includes(message))));
    inspect();const observer=new MutationObserver(inspect);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
  },[message]);
  if (error) return <RouteErrorRecovery message={error} />;
  if (!message || !visible || routeOwnsMessage) return null;

  return (
    <div
      className={cn(
        "fixed left-4 right-4 top-[calc(var(--sb-topbar-height)+0.75rem)] z-50 flex max-w-md items-start gap-3 rounded-[var(--sb-panel-radius)] border p-3 text-sm shadow-[0_8px_24px_rgba(6,44,31,0.16)] sm:left-auto sm:right-6",
        tone === "error"
          ? "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]"
          : tone === "warning"
            ? "border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]"
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
