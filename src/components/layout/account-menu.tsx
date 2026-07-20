"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/server/actions/auth";

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
      <button ref={triggerRef} type="button" aria-label={`Open account for ${displayName}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="pointer-events-auto flex h-11 w-11 items-center justify-center gap-2 rounded-[2px] border border-[var(--sb-border-soft)] bg-white px-0 text-xs font-medium text-[var(--sb-text)] transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-700)] sm:h-8 sm:w-auto sm:justify-start sm:px-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sb-amber-100)] text-[10px] font-semibold text-[var(--sb-green-950)]">{initials}</span>
        <span className="hidden max-w-28 truncate md:inline">{displayName}</span>
        <span className="hidden max-w-32 truncate text-[10px] font-normal text-muted-foreground lg:inline">{roleLabel}</span>
      </button>
      {open ? <div role="menu" className="sb-popover-surface absolute right-0 z-[var(--sb-z-dropdown)] mt-1 w-56 p-1 text-xs">
        <div className="border-b px-2 py-2">
          <p className="truncate font-semibold">{displayName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
        </div>
        <Link ref={firstItemRef} role="menuitem" href="/account" onClick={() => setOpen(false)} className="block px-2 py-2 hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-amber-700)]">Update Account</Link>
        <form action={signOut}>
          <button role="menuitem" type="submit" className="block w-full px-2 py-2 text-left text-[var(--sb-danger)] hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-amber-700)]">Logout</button>
        </form>
      </div> : null}
    </div>
  );
}
