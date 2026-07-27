import type { ReactNode } from "react";
import { RightConsoleMount } from "@/components/layout/right-console";
import { cn } from "@/lib/utils";

export function WorkspaceGrid({
  children,
  rightRail,
  className,
  rightRailClassName,
  hideMobileConsole = false,
  documentMode = false,
}: {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
  rightRailClassName?: string;
  hideMobileConsole?: boolean;
  documentMode?: boolean;
}) {
  const contextualRail = rightRailClassName ? <div className={rightRailClassName}>{rightRail}</div> : rightRail;

  return (
    <div className={cn("min-h-0 p-3 pb-3", rightRail && !hideMobileConsole && "pb-32 md:pb-3", className)}>
      {rightRail ? (
        <details data-tablet-context className="relative mb-3 hidden md:ml-auto md:block md:w-fit xl:hidden">
          <summary className="flex min-h-[var(--sb-control-height)] cursor-pointer list-none items-center gap-2 border border-[var(--sb-border-soft)] bg-white px-3 text-xs font-semibold marker:hidden hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-2">
            <span>Actions &amp; context</span>
            <span className="text-[11px] font-normal text-[var(--sb-text-muted)]">Open</span>
          </summary>
          <div className="absolute right-0 z-[var(--sb-z-dropdown)] mt-2 max-h-[calc(100dvh-8rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto border border-[var(--sb-border-soft)] bg-white shadow-[0_8px_24px_rgb(6_44_31_/_0.12)]">{contextualRail}</div>
        </details>
      ) : null}
      {documentMode && rightRail ? (
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
