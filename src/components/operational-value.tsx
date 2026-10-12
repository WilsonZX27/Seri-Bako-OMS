import type { OperationalValue as Value } from "@/lib/operational-value-display";

/** Both table cells and compact rows preserve the same business meaning. */
export function OperationalValue({ display }: { display: Value }) {
  return <span title={display.title} className={display.warning ? "text-warning" : undefined}>
    <span className="block">{display.value}</span>
    {display.detail ? <span className="block text-[11px] font-normal text-muted-foreground">{display.detail}</span> : null}
  </span>;
}
