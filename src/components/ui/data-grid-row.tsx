"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataGridRow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <tr
      className={cn("group cursor-pointer border-b transition-colors hover:bg-slate-50/70", className)}
      onDoubleClick={() => router.push(href)}
      title="Double-click to open"
    >
      {children}
    </tr>
  );
}
