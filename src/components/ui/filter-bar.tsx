import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 border-b bg-card p-4 md:grid-cols-4 lg:grid-cols-6">{children}</div>;
}
