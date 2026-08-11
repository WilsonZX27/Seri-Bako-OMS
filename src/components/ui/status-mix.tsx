import Link from "next/link";

export type StatusMixItem = {
  label: string;
  value: number;
  href?: string;
  tone?: "default" | "warning" | "danger";
};

const toneColors = {
  default: "var(--sb-green-900)",
  warning: "var(--sb-warning)",
  danger: "var(--sb-danger)",
} as const;

export function StatusMix({ title = "Status mix", items, total: totalOverride }: { title?: string; items: StatusMixItem[]; total?: number }) {
  const total = totalOverride ?? items.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...items.map((item) => item.value), 1);

  return <section className="border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3 py-3 sm:px-4" aria-label={title}>
    <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[var(--sb-text)]">{title}</p><span className="text-[11px] text-[var(--sb-text-muted)]">{total} total</span></div>
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => { const content = <><div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><span className="text-[var(--sb-text-muted)]">{item.label}</span><strong className="tabular-nums">{item.value}</strong></div><div className="h-1.5 bg-white"><span className="block h-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: toneColors[item.tone ?? "default"] }} /></div></>; return item.href ? <Link key={item.label} href={item.href} className="min-w-0 hover:opacity-80">{content}</Link> : <div key={item.label} className="min-w-0">{content}</div>; })}
    </div>
  </section>;
}
