"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/server/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

export function AccountMenu({ displayName, roleLabel, initials }: { displayName: string; roleLabel: string; initials: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    function close() {
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative block">
      <button ref={triggerRef} type="button" aria-label={`Open account for ${displayName}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="pointer-events-auto flex h-12 w-12 items-center justify-center gap-2 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-white px-0 text-xs font-medium text-[var(--sb-text)] transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] md:h-8 md:w-auto md:justify-start md:px-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sb-green-100)] text-[10px] font-semibold text-[var(--sb-green-950)]">{initials}</span>
        <span className="hidden max-w-28 truncate md:inline">{displayName}</span>
        <span className="hidden max-w-32 truncate text-[10px] font-normal text-muted-foreground lg:inline">{roleLabel}</span>
      </button>
      {open ? <div role="menu" className="sb-popover-surface absolute right-0 z-[var(--sb-z-dropdown)] mt-1 w-56 p-1 text-xs">
        <div className="border-b px-2 py-2">
          <p className="truncate font-semibold">{displayName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
        </div>
        <Link ref={firstItemRef} role="menuitem" href="/account" onClick={() => setOpen(false)} className="flex min-h-12 items-center px-2 py-2 text-xs hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)] md:min-h-8">Update Account</Link>
        <Link role="menuitem" href="/attendance/confirmations" onClick={() => setOpen(false)} className="flex min-h-12 items-center px-2 py-2 text-xs hover:bg-[var(--sb-surface-muted)] md:min-h-8">My attendance</Link>
        <Link role="menuitem" href="/attendance/payslips" onClick={() => setOpen(false)} className="flex min-h-12 items-center px-2 py-2 text-xs hover:bg-[var(--sb-surface-muted)] md:min-h-8">My payslips</Link>
        <form action={signOut}>
          <SubmitButton role="menuitem" type="submit" variant="ghost" pendingLabel="Signing out..." className="flex min-h-12 w-full items-center justify-start rounded-none px-2 py-2 text-left text-xs text-[var(--sb-danger)] hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)] md:min-h-8">Logout</SubmitButton>
        </form>
      </div> : null}
    </div>
  );
}
