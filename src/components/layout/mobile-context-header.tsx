"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { getIaItemForPath } from "@/lib/information-architecture";

export function MobileContextHeader({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const item = getIaItemForPath(pathname);
  const isRoot = !item || pathname === item.href;

  if (isRoot) {
    return <p className="truncate text-sm font-semibold text-[var(--sb-green-950)]">{companyName}</p>;
  }

  return (
    <Link href={item.href} className="-ml-1 flex min-h-11 min-w-0 items-center gap-0.5 pr-2 text-sm font-semibold text-[var(--sb-green-950)]" aria-label={`Back to ${item.label}`}>
      <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
