"use client";

import { PanelRight, X } from "lucide-react";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type RightConsoleContextValue = {
  setContent: (content: ReactNode) => void;
  clearContent: () => void;
};

const RightConsoleContext = createContext<RightConsoleContextValue | null>(null);

export function RightConsoleProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<ReactNode>(null);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const value = useMemo(
    () => ({
      setContent: setContentState,
      clearContent: () => setContentState(null),
    }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])")).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const consoleContent = content ?? (
    <ConsoleSection title="Workspace Context">
      <p className="text-sm text-[var(--sb-text-muted)] sm:text-xs">Open a record to see actions, timeline, and metadata here.</p>
    </ConsoleSection>
  );

  return (
    <RightConsoleContext.Provider value={value}>
      {children}
      <aside data-right-console className="hidden h-full min-h-0 w-[var(--sb-console-width)] shrink-0 overflow-hidden border-l bg-white xl:block">
        <div data-right-console-scroll className="h-full overflow-y-auto overflow-x-hidden bg-white px-2 py-1">
          {consoleContent}
        </div>
      </aside>
      <Button ref={triggerRef} type="button" className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3 z-40 gap-2 shadow-sm xl:hidden" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <PanelRight className="h-4 w-4" aria-hidden="true" />
        Actions & context
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button type="button" className="absolute inset-0 h-full w-full bg-[var(--sb-green-950)]/55" onClick={close} aria-label="Close actions and context" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden border-t border-[var(--sb-border)] bg-white pb-[env(safe-area-inset-bottom)]">
            <header className="flex h-12 items-center justify-between border-b px-3">
              <h2 id={titleId} className="text-sm font-semibold">Actions & context</h2>
              <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close actions and context"><X className="h-5 w-5" /></Button>
            </header>
            <div className="max-h-[calc(82dvh-3rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain px-2 py-1">{consoleContent}</div>
          </div>
        </div>
      ) : null}
    </RightConsoleContext.Provider>
  );
}

export function RightConsoleMount({ children }: { children: ReactNode }) {
  const context = useContext(RightConsoleContext);

  useEffect(() => {
    context?.setContent(children);
    return () => context?.clearContent();
  }, [children, context]);

  return null;
}

export function ConsoleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--border-muted)] px-3 py-3 last:border-b-0">
      <h2 className="mb-2 text-xs font-semibold text-[var(--sb-text-muted)]">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
