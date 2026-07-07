import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WorkspaceGrid({
  children,
  rightRail,
  className,
}: {
  children: ReactNode;
  rightRail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-h-0 gap-5 p-5 pb-4 xl:grid-cols-[minmax(0,1fr)_320px]", !rightRail && "xl:grid-cols-1", className)}>
      <div className="min-w-0 space-y-5">{children}</div>
      {rightRail ? <RightRail>{rightRail}</RightRail> : null}
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
