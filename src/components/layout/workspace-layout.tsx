import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { RightConsoleMount } from "@/components/layout/right-console";
import { cn } from "@/lib/utils";

export type WorkspaceCanvasMode = "contained" | "wide" | "full";
type TabletRailMode = "context" | "split";
type TabletRailBreakpoint = "md" | "lg";
type TabletRailWidth = "compact" | "half";

export function WorkspaceGrid({
  children,
  rightRail,
  className,
  rightRailClassName,
  hideMobileConsole = false,
  mobileRailSummary,
  mobileConsoleLabel,
  hideDesktopConsole = false,
  documentMode = false,
  tabletCanvas,
  tabletRailMode = rightRail ? "split" : "context",
  tabletRailBreakpoint = "md",
  tabletRailWidth = "compact",
  desktopRailPlacement = "shell",
}: {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
  rightRailClassName?: string;
  hideMobileConsole?: boolean;
  mobileRailSummary?: string;
  mobileConsoleLabel?: string;
  hideDesktopConsole?: boolean;
  documentMode?: boolean;
  /** Keeps touch-focused work contained while technical registers retain horizontal working room. */
  tabletCanvas?: WorkspaceCanvasMode;
  /** At landscape-tablet widths, a document may keep its operational context visible beside the form. */
  tabletRailMode?: TabletRailMode;
  /** Lists may keep portrait tablets stacked and split only on wider tablet canvases. */
  tabletRailBreakpoint?: TabletRailBreakpoint;
  /** Dense task rails such as the PR basket can claim a wider tablet column. */
  tabletRailWidth?: TabletRailWidth;
  /** Keep document actions aligned with content instead of the outer shell. */
  desktopRailPlacement?: "shell" | "content";
}) {
  const contextualRail = rightRailClassName ? <div className={rightRailClassName}>{rightRail}</div> : rightRail;
  const effectiveTabletCanvas = tabletCanvas ?? (documentMode ? "contained" : "wide");
  const usesTabletSplit = Boolean(rightRail && tabletRailMode === "split");

  return (
    <div
      data-workspace-canvas
      data-workspace-has-rail={Boolean(rightRail && !hideDesktopConsole && desktopRailPlacement === "shell") || undefined}
      data-canvas-mode={effectiveTabletCanvas}
      data-tablet-canvas={effectiveTabletCanvas}
      data-tablet-content={rightRail && effectiveTabletCanvas !== "full" ? "contained" : undefined}
      className={cn("sb-workspace-canvas min-h-0", rightRail && !hideMobileConsole && "xl:pb-3", className)}
    >
      {rightRail && mobileRailSummary ? <details className="sb-work-surface mb-3 md:hidden"><summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 text-sm font-semibold">{mobileRailSummary}<ChevronDown className="size-4" aria-hidden="true" /></summary><div className="space-y-3 border-t p-3">{contextualRail}</div></details> : null}
      {rightRail && !usesTabletSplit ? <details className="group mb-3 hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-white md:block xl:hidden">
        <summary className="flex min-h-[var(--sb-control-height)] cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-medium [&::-webkit-details-marker]:hidden">{mobileConsoleLabel ?? "More actions"}<ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" /></summary>
        <div className="grid gap-3 border-t border-[var(--sb-border-soft)] p-3">{contextualRail}</div>
      </details> : null}
      {usesTabletSplit && tabletRailBreakpoint === "lg" ? <aside data-tablet-stacked-actions className="mb-3 hidden min-w-0 space-y-3 md:block lg:hidden">{contextualRail}</aside> : null}
      {usesTabletSplit ? (
        <div
          data-tablet-document-split
          data-tablet-split-actions
          data-tablet-rail-breakpoint={tabletRailBreakpoint}
          data-tablet-rail-width={tabletRailWidth}
          data-desktop-rail-placement={desktopRailPlacement}
          className="min-w-0"
        >
          <div className="min-w-0 space-y-3">{children}</div>
          <aside className="min-w-0 space-y-3">{contextualRail}</aside>
        </div>
      ) : documentMode && rightRail ? (
        <div className="min-w-0">
          <div className="min-w-0 space-y-3">{children}</div>
        </div>
      ) : <div className="min-w-0 space-y-3">{children}</div>}
      {rightRail || hideDesktopConsole ? <RightConsoleMount hideMobileBar={hideMobileConsole} hideDesktopConsole={hideDesktopConsole || desktopRailPlacement === "content"} mobileConsoleLabel={mobileConsoleLabel}>{contextualRail}</RightConsoleMount> : null}
    </div>
  );
}

export function WorkspaceCanvas({
  children,
  mode = "wide",
  className,
}: {
  children: ReactNode;
  mode?: WorkspaceCanvasMode;
  className?: string;
}) {
  return (
    <div data-workspace-canvas data-canvas-mode={mode} className={cn("sb-workspace-canvas", className)}>
      {children}
    </div>
  );
}

export function RightRail({ children, className }: { children: ReactNode; className?: string }) {
  return <aside className={cn("min-h-0 min-w-0 space-y-3 xl:sticky xl:top-3 xl:max-h-[calc(100dvh-72px)] xl:overflow-y-auto sb-scrollbar-none", className)}>{children}</aside>;
}

export function ActionPanel({ children, title = "Actions" }: { children: ReactNode; title?: string }) {
  return (
    <section className="rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-white p-3">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}
