import type { ReactNode } from "react";
import { RightConsoleMount } from "@/components/layout/right-console";
import { cn } from "@/lib/utils";

export function WorkspaceGrid({
  children,
  rightRail,
  className,
  rightRailClassName,
}: {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
  rightRailClassName?: string;
}) {
  void rightRailClassName;

  return (
    <div className={cn("min-h-0 p-5 pb-4", className)}>
      <div className="min-w-0 space-y-5">{children}</div>
      {rightRail ? <RightConsoleMount>{rightRail}</RightConsoleMount> : null}
    </div>
  );
}

export function RightRail({ children, className }: { children: ReactNode; className?: string }) {
  return <aside className={cn("min-h-0 min-w-0 space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-80px)] xl:overflow-y-auto xl:pr-1", className)}>{children}</aside>;
}

export function ActionPanel({ children, title = "Actions" }: { children: ReactNode; title?: string }) {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}
