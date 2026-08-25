"use client";

import { AlertTriangle } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatQuantity } from "@/lib/utils";

export type StockCountVoidPreview = {
  fingerprint: string;
  adjustment_line_count: number;
  reverse_quantity_in: number;
  reverse_quantity_out: number;
};

export function StockCountVoidDialog({ action, preview }: {
  action: (formData: FormData) => Promise<void>;
  preview: StockCountVoidPreview;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return <>
    <Button ref={triggerRef} type="button" variant="destructive" className="w-full" onClick={() => setOpen(true)}>Void count</Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={cancelRef}>
      <header>
        <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-[var(--sb-danger)]"><AlertTriangle className="h-4 w-4" />Void and reverse this Stock Count?</h2>
        <p className="mt-2 text-sm text-muted-foreground">The system will reverse every inventory adjustment created by this count with equal and opposite ledger movements.</p>
      </header>
      <dl className="my-4 grid grid-cols-3 divide-x rounded-[var(--sb-control-radius)] border bg-[var(--sb-surface-muted)] py-3 text-center text-xs">
        <div><dt className="text-muted-foreground">Lines</dt><dd className="mt-1 font-semibold tabular-nums">{preview.adjustment_line_count}</dd></div>
        <div><dt className="text-muted-foreground">Qty in</dt><dd className="mt-1 font-semibold tabular-nums">{formatQuantity(preview.reverse_quantity_in)}</dd></div>
        <div><dt className="text-muted-foreground">Qty out</dt><dd className="mt-1 font-semibold tabular-nums">{formatQuantity(preview.reverse_quantity_out)}</dd></div>
      </dl>
      <p className="mb-4 rounded-[var(--sb-control-radius)] border border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] p-3 text-sm text-[var(--sb-danger)]">The original Stock Count, its movements, and the new reversal movements remain permanently in the audit trail.</p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="expected_fingerprint" value={preview.fingerprint} />
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <label className="block text-sm font-medium">Void reason <Textarea name="reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required className="mt-1" placeholder="Explain why this posted count must be reversed." /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>I understand this will reverse the inventory movements created by this Stock Count.</span></label>
        <div className="flex justify-end gap-2"><Button ref={cancelRef} type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><SubmitButton type="submit" variant="destructive" pendingLabel="Reversing…" disabled={!checked || reason.trim().length < 3}>Void &amp; Reverse</SubmitButton></div>
      </form>
    </ModalShell>
  </>;
}
