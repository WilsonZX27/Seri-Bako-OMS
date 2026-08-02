"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber, getToday } from "@/lib/utils";
import { wastageReasons } from "@/lib/validations/stock-operations";

type Branch = { id: string; branch_code: string; branch_name: string; status: string };
type SeedLine = { item_id: string; item_code: string; item_name: string; available_qty: number; quantity: number; uom: string };
type TransferReceiveLine = { id: string; item_id: string; item_name: string; item_code?: string | null; quantity: number; received_quantity: number; uom: string };

export function StockTransferForm({ branches, selectedFromBranchId, seedLines, action, formId, showSubmit = true }: { branches: Branch[]; selectedFromBranchId?: string; seedLines: SeedLine[]; action: (formData: FormData) => Promise<void>; formId?: string; showSubmit?: boolean }) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  function selectFromBranch(id: string) { router.push(id ? `/stock-transfers/new?from_branch_id=${id}` : "/stock-transfers/new"); }
  return (
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-white"><CardContent className="p-0 md:p-5">
      <form id={formId} action={action} className="space-y-3">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <section data-stock-transfer-setup className="erp-surface grid grid-cols-2 gap-3 p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:grid-cols-3">
          <Field label="Transfer Date" className="col-span-2 md:col-span-1"><Input name="transfer_date" type="date" defaultValue={getToday()} required /></Field>
          <Field label="From Branch"><SelectNative name="from_branch_id" value={selectedFromBranchId ?? branches[0]?.id ?? ""} onChange={(e) => selectFromBranch(e.target.value)} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative></Field>
          <Field label="To Branch"><SelectNative name="to_branch_id" defaultValue={branches[1]?.id ?? branches[0]?.id ?? ""} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative></Field>
          <p className="col-span-2 text-xs text-muted-foreground md:col-span-3">From branch → To branch. Stock moves only after posting.</p>
          <details className="col-span-2 border-t pt-2 md:col-span-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Add transfer remarks</summary>
            <div className="mt-2"><Field label="Remarks"><Textarea name="remarks" placeholder="Transfer reason or handling note" /></Field></div>
          </details>
        </section>
        <LineGrid seedLines={seedLines} mode="transfer" />
        {showSubmit ? <div className="flex justify-end"><SubmitButton disabled={!seedLines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create transfer</SubmitButton></div> : null}
      </form>
    </CardContent></Card>
  );
}

export function StockTransferReceiveForm({ transferId, lines, action, formId = "stock-transfer-receive-form" }: { transferId: string; lines: TransferReceiveLine[]; action: (formData: FormData) => Promise<void>; formId?: string }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  return (
    <form id={formId} action={action} className="space-y-3" data-stock-transfer-receive-form>
      <input type="hidden" name="transfer_id" value={transferId} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <div className="overflow-hidden rounded-sm border">
        <div className="grid grid-cols-[minmax(0,1fr)_96px_92px] gap-2 border-b bg-secondary/30 px-3 py-2 text-xs font-semibold">
          <span>Item</span><span className="text-right">Sent / received</span><span className="text-right">Receive</span>
        </div>
        <div className="divide-y">
          {lines.map((line) => {
            const remaining = Math.max(0, line.quantity - line.received_quantity);
            return (
              <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_96px_92px] items-center gap-2 px-3 py-3" data-transfer-receive-line={line.id}>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{line.item_name}</p>
                  <p className="text-xs text-muted-foreground">{line.item_code ?? line.item_id} · {line.uom}</p>
                  <input type="hidden" name="receipt_line_id" value={line.id} />
                  <input type="hidden" name="receipt_uom" value={line.uom} />
                </div>
                <p className="text-right text-xs tabular-nums text-muted-foreground">{line.received_quantity} / {line.quantity} {line.uom}</p>
                <Input name="receipt_quantity" type="number" inputMode="decimal" min="0" max={remaining} step="0.0001" defaultValue="0" disabled={remaining === 0} aria-label={`Receive quantity for ${line.item_name}`} className="h-12 text-right" />
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Enter only the quantity physically received. Any remainder stays in transit and can be received later.</p>
      <SubmitButton pendingLabel="Receiving..." disabled={!lines.some((line) => line.quantity > line.received_quantity)} showOverlay overlayLabel="Posting received quantities...">Confirm received quantities</SubmitButton>
    </form>
  );
}

export function StockWastageForm({ branches, selectedBranchId, seedLines, action, formId, showSubmit = true }: { branches: Branch[]; selectedBranchId?: string; seedLines: SeedLine[]; action: (formData: FormData) => Promise<void>; formId?: string; showSubmit?: boolean }) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  function selectBranch(id: string) { router.push(id ? `/stock-wastage/new?branch_id=${id}` : "/stock-wastage/new"); }
  return (
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-white"><CardContent className="p-0 md:p-5">
      <form id={formId} action={action} className="space-y-3">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <section data-stock-wastage-setup className="erp-surface grid grid-cols-2 gap-3 p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:grid-cols-3">
          <Field label="Wastage Date"><Input name="wastage_date" type="date" defaultValue={getToday()} required /></Field>
          <Field label="Main Reason"><SelectNative name="reason" defaultValue="damaged">{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative></Field>
          <Field label="Branch" className="col-span-2 md:col-span-1"><SelectNative name="branch_id" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(e) => selectBranch(e.target.value)} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative></Field>
          <details className="col-span-2 border-t pt-2 md:col-span-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Add evidence note</summary>
            <div className="mt-2"><Field label="Remarks"><Textarea name="remarks" placeholder="Photo required for damaged, expired, supplier claim, or abnormal wastage" /></Field></div>
          </details>
        </section>
        <LineGrid seedLines={seedLines} mode="wastage" />
        {showSubmit ? <div className="flex justify-end"><SubmitButton disabled={!seedLines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create wastage</SubmitButton></div> : null}
      </form>
    </CardContent></Card>
  );
}

function LineGrid({ seedLines, mode }: { seedLines: SeedLine[]; mode: "transfer" | "wastage" }) {
  return (
    <section data-stock-operation-lines className="erp-surface overflow-hidden md:rounded-[2px]">
      <div className="border-b bg-secondary/40 px-3 py-2"><p className="text-xs font-semibold">Lines</p><p className="text-xs text-muted-foreground">Availability is calculated from the Movement Ledger. Posting creates ledger rows only.</p></div>
      <div className="divide-y">
        {seedLines.map((line, index) => (
          <div key={line.item_id} className="grid grid-cols-2 gap-2 p-3 xl:grid-cols-[2fr_120px_120px_130px_1fr]">
            <div className="col-span-2 xl:col-span-1"><label className="flex items-center gap-2 font-medium"><input name="line_enabled" type="checkbox" value={line.item_id} defaultChecked={index === 0} />{line.item_name}</label><p className="text-xs text-muted-foreground">{line.item_code} · {line.uom}</p></div>
            <Field label="Quantity"><Input name="line_quantity" type="number" inputMode="decimal" min="0.0001" max={line.available_qty} step="0.0001" defaultValue={Math.min(line.quantity, line.available_qty)} /></Field>
            <div className="bg-[var(--sb-surface-muted)] p-2 text-sm md:rounded-[var(--sb-radius-control)]"><p className="text-xs text-muted-foreground">Available</p><p className="font-semibold">{formatNumber(line.available_qty)} {line.uom}</p></div>
            <input type="hidden" name="line_uom" value={line.uom} />
            {mode === "wastage" ? <Field label="Reason" className="col-span-2 xl:col-span-1"><SelectNative name="line_reason" defaultValue="damaged">{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative></Field> : <input type="hidden" name="line_reason" value="other" />}
            <details className="col-span-2 border-t pt-2 xl:col-span-1">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">More line details</summary>
              <div className="mt-2 grid gap-2">
                {mode === "wastage" ? <Field label="Batch"><Input name="line_batch_no" placeholder="Batch" /></Field> : <input type="hidden" name="line_batch_no" value="" />}
                <Field label="Remarks"><Input name="line_remarks" placeholder="Notes" /></Field>
              </div>
            </details>
            {mode === "wastage" ? <input type="hidden" name="line_expiry_date" value="" /> : null}
            <input type="hidden" name="line_item_id" value={line.item_id} />
          </div>
        ))}
        {!seedLines.length ? <div className="flex items-center gap-2 px-3 py-2 text-xs text-warning"><AlertTriangle className="h-4 w-4" /> No available branch stock found.</div> : null}
      </div>
    </section>
  );
}
