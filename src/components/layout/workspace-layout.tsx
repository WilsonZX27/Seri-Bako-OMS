import type { ReactNode } from "react";
import { RightConsoleMount } from "@/components/layout/right-console";
import { cn } from "@/lib/utils";

export function WorkspaceGrid({
  children,
  rightRail,
  className,
  rightRailClassName,
  hideMobileConsole = false,
}: {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
  rightRailClassName?: string;
  hideMobileConsole?: boolean;
}) {
  void rightRailClassName;

  return (
    <div className={cn("min-h-0 p-3 pb-3", className)}>
      <div className="min-w-0 space-y-3">{children}</div>
      {rightRail ? <RightConsoleMount hideMobileBar={hideMobileConsole}>{rightRail}</RightConsoleMount> : null}
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
