import type { ReactNode } from "react";
import { RightConsoleMount } from "@/components/layout/right-console";
import { cn } from "@/lib/utils";

type TabletCanvas = "contained" | "wide" | "full";
type TabletRailMode = "context" | "split";
type TabletRailBreakpoint = "md" | "lg";

export function WorkspaceGrid({
  children,
  rightRail,
  className,
  rightRailClassName,
  hideMobileConsole = false,
  documentMode = false,
  tabletCanvas,
  tabletRailMode = "context",
  tabletRailBreakpoint = "md",
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
  /** Lists may keep portrait tablets stacked and split only on wider tablet canvases. */
  tabletRailBreakpoint?: TabletRailBreakpoint;
}) {
  const contextualRail = rightRailClassName ? <div className={rightRailClassName}>{rightRail}</div> : rightRail;
  const effectiveTabletCanvas = tabletCanvas ?? (documentMode ? "contained" : "wide");
  const usesTabletSplit = Boolean(rightRail && tabletRailMode === "split");
  const splitGridClass = tabletRailBreakpoint === "lg"
    ? "lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-3 xl:block"
    : "md:grid md:grid-cols-[minmax(0,1fr)_17rem] md:items-start md:gap-3 xl:block";
  const splitRailClass = tabletRailBreakpoint === "lg"
    ? "hidden min-w-0 space-y-3 lg:block xl:hidden"
    : "hidden min-w-0 space-y-3 md:block xl:hidden";

  return (
    <div data-tablet-canvas={effectiveTabletCanvas} className={cn("min-h-0 p-3 pb-3", rightRail && !hideMobileConsole && "pb-32 xl:pb-3", className)}>
      {usesTabletSplit ? (
        <div data-tablet-document-split data-tablet-split-actions className={cn("min-w-0", splitGridClass)}>
          <div className="min-w-0 space-y-3">{children}</div>
          <aside className={splitRailClass}>{contextualRail}</aside>
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
  return <aside className={cn("min-h-0 min-w-0 space-y-3 xl:sticky xl:top-3 xl:max-h-[calc(100dvh-72px)] xl:overflow-y-auto", className)}>{children}</aside>;
}

export function ActionPanel({ children, title = "Actions" }: { children: ReactNode; title?: string }) {
  return (
    <section className="rounded-[2px] border border-[var(--sb-border-soft)] bg-white p-3">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}
