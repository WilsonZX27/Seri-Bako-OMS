"use client";

import { CheckCircle2, ChevronRight, Circle, CircleDot, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { WorkflowStep } from "@/components/workflow-status-pipeline";
import { cn } from "@/lib/utils";

function MobileSheet({ label, title, children, danger = false, triggerClassName, triggerAriaLabel, trailingChevron = true, hideAt = "md" }: { label: ReactNode; title: string; children: ReactNode; danger?: boolean; triggerClassName?: string; triggerAriaLabel?: string; trailingChevron?: boolean; hideAt?: "md" | "xl" }) {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.mobileSheetOpen = "true";
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.documentElement.dataset.mobileSheetOpen;
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [open]);

  return (
    <>
      <Button ref={triggerRef} type="button" variant="outline" className={cn("w-full justify-between text-[13px]", danger && "text-[var(--sb-danger)]", triggerClassName)} disabled={!hydrated} onClick={() => setOpen(true)} aria-label={triggerAriaLabel} aria-haspopup="dialog" aria-expanded={open}>
        {label}{trailingChevron ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : null}
      </Button>
      {open && hydrated ? createPortal(
        <div className={cn("fixed inset-0 z-[var(--sb-z-dialog)]", hideAt === "xl" ? "xl:hidden" : "md:hidden")}>
          <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" onClick={() => setOpen(false)} aria-label={`Close ${title}`} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="sb-popover-surface absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
            <header className="flex min-h-12 items-center justify-between border-b px-3">
              <h2 id={titleId} className="text-[14px] font-semibold">{title}</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={`Close ${title}`}><X className="h-5 w-5" /></Button>
            </header>
            <div className="max-h-[calc(88dvh-3rem-env(safe-area-inset-bottom))] min-w-0 overflow-y-auto overscroll-contain px-3 py-3 text-[13px]">{children}</div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

export function MobileWorkflowStatus({ steps, currentStatus, trailing }: { steps: WorkflowStep[]; currentStatus: string; trailing?: ReactNode }) {
  const foundIndex = steps.findIndex((step) => step.key === currentStatus);
  const activeIndex = foundIndex < 0 ? 0 : foundIndex;

  return (
    <div data-mobile-workflow-summary className={cn("flex min-w-0 items-center gap-1 md:hidden", trailing && "justify-between")}>
      <MobileSheet label={<span className="inline-flex items-center gap-1.5 text-left"><span className="font-semibold">Step {activeIndex + 1} of {steps.length}</span><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /></span>} triggerAriaLabel={`View workflow, step ${activeIndex + 1} of ${steps.length}`} title="Workflow progress" trailingChevron={false} triggerClassName="h-9 min-h-9 w-auto shrink-0 justify-start border-0 px-1.5 text-[12px] shadow-none">
        <ol className="space-y-1" aria-label="Document workflow">
          {steps.map((step, index) => {
            const done = index < activeIndex;
            const current = index === activeIndex;
            const Icon = done ? CheckCircle2 : current ? CircleDot : Circle;
            return <li key={step.key} className={cn("flex gap-3 border-b border-[var(--sb-border-soft)] py-3 last:border-0", done && "text-[var(--sb-success)]", current && "font-semibold")}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0"><p className="text-[13px]">{step.label}</p>{step.description ? <p className="mt-0.5 text-[12px] font-normal text-[var(--sb-text-muted)]">{step.description}</p> : null}</div></li>;
          })}
        </ol>
      </MobileSheet>
      {trailing ? <div className="min-w-0 max-w-20">{trailing}</div> : null}
    </div>
  );
}

export function MobileActivityAndFiles({ children }: { children: ReactNode }) {
  return <div data-mobile-activity-files className="xl:hidden"><MobileSheet label="Files & activity" title="Files, activity & revisions" hideAt="xl" triggerClassName="h-11 min-w-0 justify-center px-2" trailingChevron={false}>{children}</MobileSheet></div>;
}

export function MobileTaskSheet({ label, children, primary = false }: { label: string; children: ReactNode; primary?: boolean }) {
  return <MobileSheet label={label} title={label} triggerClassName={primary ? "border-[var(--sb-green-800)] bg-[var(--sb-green-800)] text-white hover:bg-[var(--sb-green-700)]" : undefined}>{children}</MobileSheet>;
}

export function DocumentMoreOptions({ children, defaultOpen = true, triggerClassName }: { children: ReactNode; defaultOpen?: boolean; triggerClassName?: string }) {
  return (
    <>
      <div className="md:hidden"><MobileSheet label="More" title="More options" triggerClassName={triggerClassName ?? "h-11 w-full min-w-0 !justify-center gap-2 px-3"}>{children}</MobileSheet></div>
      <details open={defaultOpen} className="hidden border-t border-[var(--sb-border-soft)] pt-2 md:block">
        <summary className="cursor-pointer text-[12px] font-medium text-[var(--sb-text-muted)]">More options</summary>
        <div className="mt-2">{children}</div>
      </details>
    </>
  );
}
