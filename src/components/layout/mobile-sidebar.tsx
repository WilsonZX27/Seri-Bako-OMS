"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import type { UserRole } from "@/types/database";

export function MobileSidebar({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mr-2 lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(22rem,88vw)] flex-col border-r bg-card shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <Button type="button" variant="ghost" size="icon" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <WorkspaceSidebar role={role} mobile onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
