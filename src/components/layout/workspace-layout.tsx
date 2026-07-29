import type { ReactNode } from "react";
import { RightConsoleMount } from "@/components/layout/right-console";
import { cn } from "@/lib/utils";

type TabletCanvas = "contained" | "wide" | "full";
type TabletRailMode = "context" | "split";

export function WorkspaceGrid({
  children,
  rightRail,
  className,
  rightRailClassName,
  hideMobileConsole = false,
  documentMode = false,
  tabletCanvas,
  tabletRailMode = "context",
}: {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
  rightRailClassName?: string;
  hideMobileConsole?: boolean;
  documentMode?: boolean;
  /** Keeps touch-focused work contained while technical registers retain horizontal working room. */
  tabletCanvas?: TabletCanvas;
  /** At landscape-tablet widths, a document may keep its operational context visible beside the form. */
  tabletRailMode?: TabletRailMode;
}) {
  const contextualRail = rightRailClassName ? <div className={rightRailClassName}>{rightRail}</div> : rightRail;
  const effectiveTabletCanvas = tabletCanvas ?? (documentMode ? "contained" : "wide");
  const usesTabletSplit = Boolean(documentMode && rightRail && tabletRailMode === "split");

  return (
    <div data-tablet-canvas={effectiveTabletCanvas} className={cn("min-h-0 p-3 pb-3", rightRail && !hideMobileConsole && "pb-32 xl:pb-3", className)}>
      {usesTabletSplit ? (
        <div data-tablet-document-split className="min-w-0 md:grid md:grid-cols-[minmax(0,1fr)_16rem] md:items-start md:gap-4 xl:block">
          <div className="min-w-0 space-y-3">{children}</div>
          <aside className="hidden min-w-0 space-y-3 md:block xl:hidden">{contextualRail}</aside>
        </div>
      ) : documentMode && rightRail ? (
        <div className="min-w-0">
          <div className="min-w-0 space-y-3">{children}</div>
        </div>
      ) : <div className="min-w-0 space-y-3">{children}</div>}
      {rightRail ? <RightConsoleMount hideMobileBar={hideMobileConsole}>{contextualRail}</RightConsoleMount> : null}
    </div>
  );
}

export function RightRail({ children, className }: { children: ReactNode; className?: string }) {
  return <aside className={cn("min-h-0 min-w-0 space-y-3 xl:sticky xl:top-3 xl:max-h-[calc(100dvh-72px)] xl:overflow-y-auto xl:pr-1", className)}>{children}</aside>;
}

export function ActionPanel({ children, title = "Actions" }: { children: ReactNode; title?: string }) {
  return (
    <section className="rounded-[2px] border border-[var(--sb-border-soft)] bg-white p-3">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}
