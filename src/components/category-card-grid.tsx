import Link from "next/link";
import type { LucideIcon } from "lucide-react";
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
    <div className={cn("grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <Card className={cn("h-full rounded-[2px] transition-colors", item.disabled ? "opacity-60" : "hover:border-primary/30 hover:bg-[var(--sb-muted)]")}>
            <CardContent className="flex h-full min-h-[88px] gap-3 p-3">
              <div className="sb-icon-tile h-9 w-9">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[13px] font-semibold">{item.title}</h2>
                  {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-muted-foreground">{item.description}</p>
              </div>
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
