import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OperationalToolItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
};

/** A compact, permission-aware directory of operational workspaces. */
export function OperationalToolList({ items, className }: { items: OperationalToolItem[]; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[var(--sb-panel-radius)] divide-y divide-[var(--sb-border-soft)] border border-[var(--sb-border-soft)] bg-white", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <div className={cn("flex min-h-16 items-center gap-3 px-3 py-2.5 transition-colors", item.disabled ? "opacity-60" : "active:bg-[var(--sb-muted)] hover:bg-[var(--sb-surface-muted)]")}>
            <div className="sb-icon-tile h-8 w-8 shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[13px] font-semibold">{item.title}</h2>
                {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
              </div>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted-foreground">{item.description}</p>
            </div>
            {!item.disabled ? <ChevronRight className="h-4 w-4 shrink-0 text-[var(--sb-text-soft)]" aria-hidden="true" /> : null}
          </div>
        );

        return item.disabled ? <div key={item.href}>{content}</div> : <Link key={item.href} href={item.href}>{content}</Link>;
      })}
    </div>
  );
}
