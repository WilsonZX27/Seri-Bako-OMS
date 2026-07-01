"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { getFlatNavItems } from "@/components/layout/nav-items";
import type { UserRole } from "@/types/database";

function titleize(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Breadcrumbs({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const item = getFlatNavItems(role).find((nav) => nav.href.split("?")[0] === pathname);
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = item ? [item.group, item.label] : segments.map(titleize);

  return (
    <div className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground md:flex">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
          {index === 0 ? <Link href="/dashboard" className="hover:text-foreground">{crumb}</Link> : <span className="truncate">{crumb}</span>}
          {index < crumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
        </span>
      ))}
    </div>
  );
}
