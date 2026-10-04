"use client";

import Link from "next/link";
import { PanelRight, Plus, X } from "lucide-react";
import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RightConsoleContextValue = {
  setContent: (owner: symbol, content: ReactNode, hideMobileBar?: boolean, hideDesktopConsole?: boolean) => void;
  clearContent: (owner: symbol) => void;
};

const RightConsoleContext = createContext<RightConsoleContextValue | null>(null);

type MobileActionProps = {
  children?: ReactNode;
  href?: string;
  primary?: boolean;
  "data-mobile-primary-action"?: boolean;
};

function isMobilePrimaryAction(child: ReactNode): boolean {
  if (!isValidElement<MobileActionProps>(child)) return false;
  return child.props["data-mobile-primary-action"] === true
    || (child.props.primary === true && typeof child.props.href === "string");
}

function findMobilePrimaryAction(node: ReactNode): ReactNode {
  let match: ReactNode = null;
  Children.forEach(node, (child) => {
    if (match || !isValidElement<MobileActionProps>(child)) return;
    if (isMobilePrimaryAction(child)) match = child;
    else match = findMobilePrimaryAction(child.props.children);
  });
  return match;
}

function withoutMobilePrimaryAction(node: ReactNode): ReactNode {
  const mapped = Children.map(node, (child) => {
    if (!isValidElement<MobileActionProps>(child)) return child;
    if (isMobilePrimaryAction(child)) return null;
    return cloneElement(child, {}, withoutMobilePrimaryAction(child.props.children));
  });
  // Slot/asChild requires its original single-element shape, not a mapped array.
  return isValidElement(node) ? mapped?.[0] ?? null : mapped;
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
  const [desktopConsoleHidden, setDesktopConsoleHidden] = useState(false);
  const activeOwnerRef = useRef<symbol | null>(null);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const value = useMemo(
    () => ({
      setContent: (owner: symbol, nextContent: ReactNode, hideMobileBar = false, hideDesktopConsole = false) => {
        activeOwnerRef.current = owner;
        setContentState(nextContent);
        setMobileBarHidden(hideMobileBar);
        setDesktopConsoleHidden(hideDesktopConsole);
      },
      clearContent: (owner: symbol) => {
        if (activeOwnerRef.current !== owner) return;
        activeOwnerRef.current = null;
        setContentState(null);
        setMobileBarHidden(false);
        setDesktopConsoleHidden(false);
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
        event.preventDefault();
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
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

  function handleMobileFormAction(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented) return;
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (button?.type !== "submit" || !button.form || dialogRef.current?.contains(button.form)) return;
    // Submit before unmounting the external submitter; native validation
    // and the page form retain ownership of the resulting focus.
    event.preventDefault();
    button.form.requestSubmit(button);
    setOpen(false);
  }

  const consoleContent = desktopConsoleHidden ? null : content;
  const primaryAction = findMobilePrimaryAction(consoleContent);
  const secondaryConsoleContent = withoutMobilePrimaryAction(consoleContent);
  const primaryHref = findActionHref(primaryAction);
  const primaryLabel = actionText(primaryAction);
  const hasCreateFab = Boolean(primaryHref?.includes("/new") && /^(new|create)\b/i.test(primaryLabel));
  const ownsMobileActionArea = Boolean(content && !mobileBarHidden && !hasCreateFab);

  useEffect(() => {
    const root = document.documentElement;
    if (ownsMobileActionArea) root.dataset.mobileActionPage = "true";
    else delete root.dataset.mobileActionPage;
    return () => {
      delete root.dataset.mobileActionPage;
    };
  }, [ownsMobileActionArea]);

  useEffect(() => {
    const root = document.documentElement;
    if (hasCreateFab) root.dataset.mobileCreatePage = "true";
    else delete root.dataset.mobileCreatePage;
    return () => {
      delete root.dataset.mobileCreatePage;
    };
  }, [hasCreateFab]);

  return (
    <RightConsoleContext.Provider value={value}>
      {children}
      {consoleContent ? (
        <aside data-right-console className="hidden h-full min-h-0 w-[var(--sb-console-width)] shrink-0 overflow-hidden border-l border-[var(--sb-border-soft)] bg-[var(--rail-bg)] xl:block">
          <div data-right-console-scroll className="sb-scrollbar-none h-full space-y-3 overflow-y-auto overflow-x-hidden bg-[var(--rail-bg)] px-3 py-3">
            {consoleContent}
          </div>
        </aside>
      ) : <aside data-right-console-placeholder aria-hidden="true" className="hidden h-full w-[var(--sb-console-width)] shrink-0 border-l border-[var(--sb-border-soft)] bg-[var(--rail-bg)] p-3"><div className="sb-work-surface space-y-3 p-3"><div className="sb-skeleton h-9" /><div className="sb-skeleton h-9" /></div><div className="sb-work-surface mt-3 space-y-3 p-3"><div className="sb-skeleton h-3" /><div className="sb-skeleton h-3 w-4/5" /></div></aside>}
      {content && !mobileBarHidden && hasCreateFab && primaryHref ? (
        <Link
          href={primaryHref}
          data-mobile-create-fab
          className="fixed bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-[var(--sb-z-sticky)] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sb-green-900)] text-white shadow-[0_10px_24px_rgba(10,58,43,0.30)] transition-transform active:scale-95 md:hidden"
          aria-label={primaryLabel}
          title={primaryLabel}
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      ) : null}
      {content && !mobileBarHidden && !hasCreateFab ? <div data-mobile-action-bar className={cn("sb-mobile-action-bar fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] items-center gap-2 rounded-none border-x-0 border-b-0 bg-white/95 p-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(17,30,22,0.2)]", "grid", primaryAction ? "grid-cols-2" : "grid-cols-1", "md:hidden xl:hidden")}>
        {primaryAction ? <div data-mobile-primary-slot className="min-w-0 [&>*]:h-11 [&>*]:w-full">{primaryAction}</div> : null}
        <Button ref={triggerRef} type="button" variant={primaryAction ? "outline" : "default"} className="h-11 min-w-0 w-full justify-center gap-2" onClick={() => setOpen(true)} aria-label="Open more actions" aria-haspopup="dialog" aria-expanded={open}>
          <PanelRight className="h-4 w-4" aria-hidden="true" />
          {primaryAction ? "More" : "More actions"}
        </Button>
      </div> : null}
      {open && content && !mobileBarHidden ? (
        <div className={cn("fixed inset-0 z-[var(--sb-z-dialog)] md:hidden", hasCreateFab && "hidden")}>
          <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" onClick={close} aria-label="Close more actions" />
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="sb-popover-surface absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
            <header className="flex h-12 items-center justify-between border-b px-3">
              <h2 id={titleId} className="text-sm font-semibold">More actions</h2>
              <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close more actions"><X className="h-5 w-5" /></Button>
            </header>
            <div data-mobile-console-content onClick={handleMobileFormAction} className="sb-scrollbar-none grid max-h-[calc(82dvh-3rem-env(safe-area-inset-bottom))] gap-3 overflow-y-auto overscroll-contain p-3 [&>[data-console-section]]:mb-3 [&>[data-console-section]:last-child]:mb-0">{secondaryConsoleContent}</div>
          </div>
        </div>
      ) : null}
    </RightConsoleContext.Provider>
  );
}

export function RightConsoleMount({ children, hideMobileBar = false, hideDesktopConsole = false }: { children: ReactNode; hideMobileBar?: boolean; hideDesktopConsole?: boolean }) {
  const context = useContext(RightConsoleContext);

  useEffect(() => {
    const owner = Symbol("right-console-mount");
    context?.setContent(owner, children, hideMobileBar, hideDesktopConsole);
    return () => context?.clearContent(owner);
  }, [children, context, hideMobileBar, hideDesktopConsole]);

  return null;
}

export function ConsoleSection({ title, children, titleClassName, className, kind = "reference" }: { title: ReactNode; children: ReactNode; titleClassName?: string; className?: string; kind?: "action" | "status" | "reference" | "danger" }) {
  return (
    <section data-console-section data-console-kind={kind} className={cn("rounded-[var(--sb-panel-radius)] border px-3 py-3", kind === "danger" ? "border-red-200 bg-[var(--sb-danger-bg)]" : "border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)]", className)}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className={cn("shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-text-muted)]", titleClassName)}>{title}</h2>
        <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-[var(--sb-border-soft)]" />
      </div>
      <div className="grid gap-2 text-xs">{children}</div>
    </section>
  );
}
