"use client";
import { createPortal } from "react-dom";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import type { UserRole } from "@/types/database";

type MobileSidebarProps = {
  role: UserRole;
  permissionMap: Record<string, boolean>;
  companyName?: string;
  companyLogoUrl?: string | null;
  attentionHrefs?: string[];
};

// Tablet navigation is intentionally contextual: desktop keeps its persistent
// sidebar at xl, while phone uses the role-aware bottom navigation below md.
export function MobileSidebar({ role, permissionMap, companyName, companyLogoUrl, attentionHrefs }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, a, [tabindex]:not([tabindex='-1'])")).filter((element) => !element.hasAttribute("disabled"));
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

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        className="mr-2 hidden md:inline-flex xl:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[var(--sb-z-dialog)] hidden md:block xl:hidden">
          <button type="button" className="absolute inset-0 bg-[var(--sb-green-950)]/45" aria-label="Close navigation menu" onClick={close} />
          <aside ref={dialogRef} role="dialog" aria-modal="true" aria-label="Application navigation" className="relative flex h-full w-[min(var(--sb-sidebar-width),88vw)] flex-col border-r bg-[var(--sb-green-950)]">
            <div className="absolute right-3 top-3 z-10">
              <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Close navigation menu" onClick={close}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <WorkspaceSidebar role={role} permissionMap={permissionMap} attentionHrefs={attentionHrefs} mobile companyName={companyName} companyLogoUrl={companyLogoUrl} onNavigate={close} />
          </aside>
        </div>, document.body
      ) : null}
    </>
  );
}
