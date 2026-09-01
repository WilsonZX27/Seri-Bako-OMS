"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
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
    <form action={action} className="space-y-3">
      <div className="overflow-x-auto rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-[var(--sb-surface-muted)] text-[var(--sb-text-muted)]">
            <tr><th className="px-3 py-2 font-medium">Item</th><th className="px-3 py-2 text-right font-medium">Ordered</th><th className="px-3 py-2 text-right font-medium">Previously</th><th className="px-3 py-2 text-right font-medium">PO balance</th><th className="w-28 px-3 py-2 font-medium">Received</th><th className="w-28 px-3 py-2 font-medium">Rejected</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--sb-border-soft)]">
            {lines.map((line) => {
              const isOver = overReceived.has(line.id);
              return <tr key={line.id} className="align-top">
                <td className="px-3 py-3"><input type="hidden" name="line_id" value={line.id} /><p className="font-medium">{line.item?.item_name ?? line.id}</p><p className="text-[11px] text-muted-foreground">{line.item?.item_code ?? "No item code"} · {line.uom}</p>{isOver ? <label className="mt-2 block"><span className="mb-1 flex items-center gap-1 font-medium text-[var(--sb-warning)]"><AlertTriangle className="h-3.5 w-3.5" />Over-receipt reason</span><Input name="over_receipt_reason" value={values[line.id]?.reason ?? ""} onChange={(event) => update(line.id, "reason", event.target.value)} minLength={3} maxLength={1000} required placeholder="Explain the supplier over-delivery" className="h-9 border-[var(--sb-warning)]" /></label> : <input type="hidden" name="over_receipt_reason" value="" />}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatNumber(line.ordered_qty)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatNumber(line.previously_received_qty)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatNumber(line.pending_qty)}</td>
                <td className="px-3 py-3"><Input name="received_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={values[line.id]?.received ?? "0"} onChange={(event) => update(line.id, "received", event.target.value)} aria-label={`Received quantity for ${line.item?.item_name ?? line.id}`} className={isOver ? "border-[var(--sb-warning)]" : undefined} /></td>
                <td className="px-3 py-3"><Input name="rejected_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={values[line.id]?.rejected ?? "0"} onChange={(event) => update(line.id, "rejected", event.target.value)} aria-label={`Rejected quantity for ${line.item?.item_name ?? line.id}`} className={isOver ? "border-[var(--sb-warning)]" : undefined} /></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {overReceived.size ? <p role="status" className="rounded-[var(--sb-radius-control)] border border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] p-2.5 text-xs text-[var(--sb-warning)]">{overReceived.size} line{overReceived.size === 1 ? "" : "s"} exceed the remaining PO quantity. The reason will be retained in the audit trail.</p> : null}
      <SubmitButton pendingLabel="Saving received quantities…" className="w-full justify-center sm:w-auto"><Save className="h-4 w-4" />Save received quantities</SubmitButton>
    </form>
  );
}
