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

export function StockTransferForm({ branches, selectedFromBranchId, seedLines, action, formId, showSubmit = true }: { branches: Branch[]; selectedFromBranchId?: string; seedLines: SeedLine[]; action: (formData: FormData) => Promise<void>; formId?: string; showSubmit?: boolean }) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  function selectFromBranch(id: string) { router.push(id ? `/stock-transfers/new?from_branch_id=${id}` : "/stock-transfers/new"); }
  return (
    <Card><CardContent className="p-5">
      <form id={formId} action={action} className="space-y-4">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Transfer No"><div className="rounded-md border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">Auto-generated on submit</div></Field>
          <Field label="Transfer Date"><Input name="transfer_date" type="date" defaultValue={getToday()} required /></Field>
          <Field label="From Branch"><SelectNative name="from_branch_id" value={selectedFromBranchId ?? branches[0]?.id ?? ""} onChange={(e) => selectFromBranch(e.target.value)} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative></Field>
          <Field label="To Branch"><SelectNative name="to_branch_id" defaultValue={branches[1]?.id ?? branches[0]?.id ?? ""} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative><p className="mt-1 text-xs text-muted-foreground">Stock will move to the selected branch automatically.</p></Field>
          <div className="md:col-span-2"><Field label="Remarks"><Textarea name="remarks" placeholder="Transfer reason or handling note" /></Field></div>
        </div>
        <LineGrid seedLines={seedLines} mode="transfer" />
        {showSubmit ? <div className="flex justify-end"><SubmitButton disabled={!seedLines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create transfer</SubmitButton></div> : null}
      </form>
    </CardContent></Card>
  );
}

export function StockWastageForm({ branches, selectedBranchId, seedLines, action, formId, showSubmit = true }: { branches: Branch[]; selectedBranchId?: string; seedLines: SeedLine[]; action: (formData: FormData) => Promise<void>; formId?: string; showSubmit?: boolean }) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  function selectBranch(id: string) { router.push(id ? `/stock-wastage/new?branch_id=${id}` : "/stock-wastage/new"); }
  return (
    <Card><CardContent className="p-5">
      <form id={formId} action={action} className="space-y-4">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Wastage No"><div className="rounded-md border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">Auto-generated on submit</div></Field>
          <Field label="Wastage Date"><Input name="wastage_date" type="date" defaultValue={getToday()} required /></Field>
          <Field label="Main Reason"><SelectNative name="reason" defaultValue="damaged">{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative></Field>
          <Field label="Branch"><SelectNative name="branch_id" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(e) => selectBranch(e.target.value)} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative></Field>
          <div className="md:col-span-3"><Field label="Remarks"><Textarea name="remarks" placeholder="Photo required for damaged, expired, supplier claim, or abnormal wastage" /></Field></div>
        </div>
        <LineGrid seedLines={seedLines} mode="wastage" />
        {showSubmit ? <div className="flex justify-end"><SubmitButton disabled={!seedLines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create wastage</SubmitButton></div> : null}
      </form>
    </CardContent></Card>
  );
}

function LineGrid({ seedLines, mode }: { seedLines: SeedLine[]; mode: "transfer" | "wastage" }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b bg-secondary/40 px-3 py-2"><p className="text-xs font-semibold">Lines</p><p className="text-xs text-muted-foreground">Availability is calculated from the Movement Ledger. Posting creates ledger rows only.</p></div>
      <div className="divide-y">
        {seedLines.map((line, index) => (
          <div key={line.item_id} className="grid gap-3 p-4 xl:grid-cols-[2fr_120px_120px_90px_130px_130px_1fr]">
            <div><label className="flex items-center gap-2 font-medium"><input name="line_enabled" type="checkbox" value={line.item_id} defaultChecked={index === 0} />{line.item_name}</label><p className="text-xs text-muted-foreground">{line.item_code}</p></div>
            <div className="rounded-md border bg-secondary/30 p-2 text-sm"><p className="text-xs text-muted-foreground">Available</p><p className="font-semibold">{formatNumber(line.available_qty)}</p></div>
            <Field label="Quantity"><Input name="line_quantity" type="number" min="0.0001" max={line.available_qty} step="0.0001" defaultValue={Math.min(line.quantity, line.available_qty)} /></Field>
            <Field label="UOM"><Input name="line_uom" value={line.uom} readOnly /></Field>
            {mode === "wastage" ? <Field label="Reason"><SelectNative name="line_reason" defaultValue="damaged">{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative></Field> : <input type="hidden" name="line_reason" value="other" />}
            {mode === "wastage" ? <Field label="Batch"><Input name="line_batch_no" placeholder="Batch" /></Field> : <input type="hidden" name="line_batch_no" value="" />}
            <Field label="Remarks"><Input name="line_remarks" placeholder="Notes" /></Field>
            {mode === "wastage" ? <input type="hidden" name="line_expiry_date" value="" /> : null}
            <input type="hidden" name="line_item_id" value={line.item_id} />
          </div>
        ))}
        {!seedLines.length ? <div className="flex items-center gap-2 px-3 py-2 text-xs text-warning"><AlertTriangle className="h-4 w-4" /> No available branch stock found.</div> : null}
      </div>
    </div>
  );
}
