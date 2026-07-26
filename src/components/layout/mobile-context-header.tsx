"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { getIaItemForPath } from "@/lib/information-architecture";

const routeTitles: Record<string, string> = {
  "/account": "My Account",
  "/administration": "Administration",
  "/daily-operations": "Daily Operations",
  "/data-onboarding": "Data Onboarding",
  "/documents": "Documents",
  "/inventory": "Inventory",
  "/opening-stock": "Opening Stock",
  "/procurement": "Procurement",
  "/production": "Production",
  "/quick-tools": "Quick Tools",
  "/reports": "Reports",
  "/settings": "Settings",
};

function pageContext(pathname: string) {
  if (pathname === "/dashboard") {
    return { title: "Today", backHref: null };
  }
  const item = getIaItemForPath(pathname);
  if (item) {
    return {
      title: item.label,
      backHref: pathname === item.href ? null : item.href,
    };
  }

  const matchedRoot = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));
  const root = matchedRoot ?? "/dashboard";
  return {
    title: routeTitles[root] ?? "Dashboard",
    backHref: pathname === root || pathname === "/dashboard" ? null : root,
  };
}

export function MobileContextBack() {
  const pathname = usePathname();
  const context = pageContext(pathname);

  if (!context.backHref) return <span className="block h-11 w-11" aria-hidden="true" />;

  return (
    <Link
      href={context.backHref}
      className="flex h-11 w-11 items-center justify-start text-[var(--sb-green-950)]"
      aria-label={`Back to ${context.title}`}
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

export function MobileContextTitle() {
  const pathname = usePathname();
  return <p data-mobile-page-title className="truncate text-center text-[15px] font-semibold text-[var(--sb-green-950)]">{pageContext(pathname).title}</p>;
}
