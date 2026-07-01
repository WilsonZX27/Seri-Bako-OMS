"use client";

import Link from "next/link";
import { ClipboardCheck, PackageCheck, ScanLine, TriangleAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const scanItems = [
  { href: "/stock-counts/scan", label: "Count", icon: ClipboardCheck },
  { href: "/goods-receivings/scan", label: "Receive", icon: PackageCheck },
  { href: "/stock-transfers/scan", label: "Transfer", icon: ScanLine },
  { href: "/stock-wastage/scan", label: "Wastage", icon: TriangleAlert },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card md:hidden">
      {scanItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 px-2 py-2 text-xs", active ? "text-primary" : "text-muted-foreground")}>
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
