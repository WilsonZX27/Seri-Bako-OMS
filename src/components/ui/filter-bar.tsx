import Link from "next/link";
import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FilterBar({
  children,
  resultCount,
  resetHref,
  filtered = false,
  className,
}: {
  children: ReactNode;
  resultCount?: number;
  resetHref: string;
  filtered?: boolean;
  className?: string;
}) {
  return (
    <form className={cn("sb-list-filters", className)}>
      {children}
      {typeof resultCount === "number" ? <div className="sb-filter-summary" aria-live="polite">
        <span>{resultCount} {resultCount === 1 ? "record" : "records"}</span>
        {filtered ? <Button asChild variant="ghost" size="sm"><Link href={resetHref}>Reset</Link></Button> : null}
      </div> : null}
    </form>
  );
}

export function FilterBarMore({ children, label = "More filters" }: { children: ReactNode; label?: string }) {
  return (
    <details className="sb-filter-more">
      <summary><SlidersHorizontal className="h-3.5 w-3.5" />{label}</summary>
      <div>{children}</div>
    </details>
  );
}
