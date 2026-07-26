import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CategoryCardItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  recommendedFor?: string;
  disabled?: boolean;
};

export function CategoryCardGrid({ items, className }: { items: CategoryCardItem[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-[var(--sb-border-soft)] border-y border-[var(--sb-border-soft)] bg-white md:grid md:grid-cols-2 md:items-stretch md:gap-3 md:divide-y-0 md:border-0 md:bg-transparent xl:grid-cols-4", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <Card className={cn("h-full rounded-none border-0 transition-colors md:rounded-[2px] md:border", item.disabled ? "opacity-60" : "active:bg-[var(--sb-muted)] md:hover:border-primary/30 md:hover:bg-[var(--sb-muted)]")}>
            <CardContent className="flex h-full min-h-16 items-center gap-3 p-3 md:min-h-[88px] md:items-start">
              <div className="sb-icon-tile h-8 w-8 md:h-9 md:w-9">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[13px] font-semibold">{item.title}</h2>
                  {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-muted-foreground">{item.description}</p>
              </div>
              {!item.disabled ? <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--sb-text-soft)] md:hidden" aria-hidden="true" /> : null}
            </CardContent>
          </Card>
        );

        return item.disabled ? (
          <div key={item.href}>{content}</div>
        ) : (
          <Link key={item.href} href={item.href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
