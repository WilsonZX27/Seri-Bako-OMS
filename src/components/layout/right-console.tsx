"use client";

import Link from "next/link";
import { PanelRight, Plus, X } from "lucide-react";
import { Children, createContext, isValidElement, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RightConsoleContextValue = {
  setContent: (content: ReactNode, hideMobileBar?: boolean) => void;
  clearContent: () => void;
};

const RightConsoleContext = createContext<RightConsoleContextValue | null>(null);

function findMobilePrimaryAction(node: ReactNode): ReactNode {
  let match: ReactNode = null;
  Children.forEach(node, (child) => {
    if (match || !isValidElement<{ children?: ReactNode; "data-mobile-primary-action"?: boolean }>(child)) return;
    if (child.props["data-mobile-primary-action"]) match = child;
    else match = findMobilePrimaryAction(child.props.children);
  });
  return match;
}

function findActionHref(node: ReactNode): string | null {
  let href: string | null = null;
  Children.forEach(node, (child) => {
    if (href || !isValidElement<{ children?: ReactNode; href?: string }>(child)) return;
    if (typeof child.props.href === "string") href = child.props.href;
    else href = findActionHref(child.props.children);
  });
  return href;
}

function actionText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  let text = "";
  Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") text += `${child} `;
    else if (isValidElement<{ children?: ReactNode }>(child)) text += actionText(child.props.children);
  });
  return text.trim();
}

export function RightConsoleProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<ReactNode>(null);
  const [mobileBarHidden, setMobileBarHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const value = useMemo(
    () => ({
      setContent: (nextContent: ReactNode, hideMobileBar = false) => {
        setContentState(nextContent);
        setMobileBarHidden(hideMobileBar);
      },
      clearContent: () => {
        setContentState(null);
        setMobileBarHidden(false);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
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
  const primaryAction = findMobilePrimaryAction(consoleContent);
  const primaryHref = findActionHref(primaryAction);
  const primaryLabel = actionText(primaryAction);
  const hasCreateFab = Boolean(primaryHref?.includes("/new") && /^(new|create)\b/i.test(primaryLabel));

  return (
    <RightConsoleContext.Provider value={value}>
      {children}
      <aside data-right-console className="hidden h-full min-h-0 w-[var(--sb-console-width)] shrink-0 overflow-hidden border-l bg-white xl:block">
        <div data-right-console-scroll className="h-full overflow-y-auto overflow-x-hidden bg-white px-2 py-1">
          {consoleContent}
        </div>
      </aside>
      {content && !mobileBarHidden && hasCreateFab && primaryHref ? (
        <Link
          href={primaryHref}
          data-mobile-create-fab
          className="fixed left-4 z-[var(--sb-z-sticky)] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sb-green-900)] text-white shadow-[0_3px_8px_rgb(6_44_31_/_0.22)] transition-transform active:scale-95 xl:hidden"
          aria-label={primaryLabel}
          title={primaryLabel}
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      ) : null}
      {content && !mobileBarHidden ? <div data-mobile-action-bar className={cn("sb-mobile-action-bar fixed inset-x-3 bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] items-center gap-2 p-2", hasCreateFab ? "hidden" : "flex", "xl:hidden")}>
        {primaryAction ? <div data-mobile-primary-slot className="min-w-0 flex-1 [&>*]:w-full">{primaryAction}</div> : null}
        <Button ref={triggerRef} type="button" variant={primaryAction ? "outline" : "default"} className={primaryAction ? "shrink-0 gap-2" : "w-full gap-2"} onClick={() => setOpen(true)} aria-label="Open more actions" aria-haspopup="dialog" aria-expanded={open}>
          <PanelRight className="h-4 w-4" aria-hidden="true" />
          {primaryAction ? "More" : "More actions"}
        </Button>
      </div> : null}
      {open && content && !mobileBarHidden ? (
        <div className={cn("fixed inset-0 z-[var(--sb-z-dialog)] xl:hidden", hasCreateFab && "hidden")}>
          <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" onClick={close} aria-label="Close more actions" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="sb-popover-surface absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
            <header className="flex h-12 items-center justify-between border-b px-3">
              <h2 id={titleId} className="text-sm font-semibold">More actions</h2>
              <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close more actions"><X className="h-5 w-5" /></Button>
            </header>
            <div className="max-h-[calc(82dvh-3rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain px-2 py-1">{consoleContent}</div>
          </div>
        </div>
      ) : null}
    </RightConsoleContext.Provider>
  );
}

export function RightConsoleMount({ children, hideMobileBar = false }: { children: ReactNode; hideMobileBar?: boolean }) {
  const context = useContext(RightConsoleContext);

  useEffect(() => {
    context?.setContent(children, hideMobileBar);
    return () => context?.clearContent();
  }, [children, context, hideMobileBar]);

  return null;
}

export function ConsoleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--border-muted)] px-3 py-3 last:border-b-0">
      <h2 className="mb-2 text-xs font-semibold text-[var(--sb-text-muted)]">{title}</h2>
      <div className="space-y-2 text-xs [&_.inline-flex]:text-xs">{children}</div>
    </section>
  );
}
