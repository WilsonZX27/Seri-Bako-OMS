import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiFilterItem = {
  label: string;
  value: string | number;
  href?: string;
  active?: boolean;
  icon?: LucideIcon;
};

export function KpiFilterStrip({ items, className }: { items: KpiFilterItem[]; className?: string }) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <div
            className={cn(
              "flex min-h-14 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition-colors",
              item.active ? "border-primary/60 bg-emerald-50/70 text-primary" : "border-slate-200 text-slate-700 hover:border-primary/30 hover:bg-slate-50",
            )}
          >
            {Icon ? (
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", item.active ? "bg-primary/10" : "bg-slate-100")}>
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <span className="min-w-0">
              <span className={cn("block truncate text-[11px] font-medium", item.active ? "text-primary/80" : "text-muted-foreground")}>{item.label}</span>
              <span className="block font-mono text-base font-semibold leading-tight">{item.value}</span>
            </span>
          </div>
        );

        return item.href ? (
          <Link key={item.label} href={item.href} className="block min-w-0" aria-current={item.active ? "page" : undefined}>
            {content}
          </Link>
        ) : (
          <div key={item.label} className="min-w-0">
            {content}
          </div>
        );
      })}
    </div>
  );
}
