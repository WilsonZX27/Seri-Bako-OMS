"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/utils";

type ReceivingLine = {
  id: string;
  item?: { item_name?: string | null; item_code?: string | null };
  ordered_qty: number;
  previously_received_qty: number;
  pending_qty: number;
  received_qty: number;
  rejected_qty: number;
  uom: string;
  over_receipt_reason?: string | null;
};

export function GoodsReceivingDraftEditor({
  action,
  lines,
}: {
  action: (formData: FormData) => void | Promise<void>;
  lines: ReceivingLine[];
}) {
  const [values, setValues] = useState(() => Object.fromEntries(lines.map((line) => [line.id, {
    received: String(line.received_qty),
    rejected: String(line.rejected_qty),
    reason: line.over_receipt_reason ?? "",
  }])));
  const overReceived = useMemo(() => new Set(lines.filter((line) => {
    const value = values[line.id];
    return Number(value?.received ?? 0) + Number(value?.rejected ?? 0) > Number(line.pending_qty);
  }).map((line) => line.id)), [lines, values]);

  const update = (id: string, field: "received" | "rejected" | "reason", value: string) => {
    setValues((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  return (
    <form id="goods-receiving-post-form" action={action} className="space-y-2">
      <div className="divide-y divide-[var(--sb-border-soft)] overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)]">
            {lines.map((line) => {
              const isOver = overReceived.has(line.id);
              return <article key={line.id} className="p-2.5 sm:p-3">
                <input type="hidden" name="line_id" value={line.id} />
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{line.item?.item_name ?? line.id}</p><p className="text-[11px] text-muted-foreground">{line.item?.item_code ?? "No item code"} · {line.uom}</p></div><div className="shrink-0 text-right"><p className="text-[10px] font-medium text-[var(--sb-green-800)]">Pending</p><p className="font-bold tabular-nums text-[var(--sb-green-900)]">{formatNumber(line.pending_qty)} {line.uom}</p></div></div>
                <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:items-end"><dl className="grid grid-cols-2 divide-x rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] py-1.5 text-center text-xs lg:col-span-2"><div><dt className="text-[10px] text-muted-foreground">Ordered</dt><dd className="font-medium tabular-nums">{formatNumber(line.ordered_qty)} {line.uom}</dd></div><div><dt className="text-[10px] text-muted-foreground">Previously</dt><dd className="font-medium tabular-nums">{formatNumber(line.previously_received_qty)} {line.uom}</dd></div></dl><label className="text-xs font-medium">Received · {line.uom}<Input name="received_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={values[line.id]?.received ?? "0"} onChange={(event) => update(line.id, "received", event.target.value)} aria-label={`Received quantity for ${line.item?.item_name ?? line.id}`} className={`mt-1 ${isOver ? "border-[var(--sb-warning)]" : ""}`} /></label><label className="text-xs font-medium">Rejected · {line.uom}<Input name="rejected_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={values[line.id]?.rejected ?? "0"} onChange={(event) => update(line.id, "rejected", event.target.value)} aria-label={`Rejected quantity for ${line.item?.item_name ?? line.id}`} className={`mt-1 ${isOver ? "border-[var(--sb-warning)]" : ""}`} /></label></div>
                {isOver ? <label className="mt-3 block"><span className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--sb-warning)]"><AlertTriangle className="h-3.5 w-3.5" />Over-receipt reason</span><Input name="over_receipt_reason" value={values[line.id]?.reason ?? ""} onChange={(event) => update(line.id, "reason", event.target.value)} minLength={3} maxLength={1000} required placeholder="Explain the supplier over-delivery" className="h-9 border-[var(--sb-warning)]" /></label> : <input type="hidden" name="over_receipt_reason" value="" />}
              </article>;
            })}
      </div>
      {overReceived.size ? <p role="status" className="rounded-[var(--sb-radius-control)] border border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] p-2.5 text-xs text-[var(--sb-warning)]">{overReceived.size} line{overReceived.size === 1 ? "" : "s"} exceed the remaining PO quantity. The reason will be retained in the audit trail.</p> : null}
    </form>
  );
}
