"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ChevronDown, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <form id={formId} action={action} className="space-y-3">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <details open data-stock-transfer-setup className="erp-surface group overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between border-b px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Transfer setup <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 md:p-4">
            <Field label="Transfer Date" className="col-span-2 md:col-span-1"><Input name="transfer_date" type="date" defaultValue={getToday()} required /></Field>
            <Field label="From Branch"><SelectNative name="from_branch_id" value={selectedFromBranchId ?? branches[0]?.id ?? ""} onChange={(e) => selectFromBranch(e.target.value)} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative></Field>
            <Field label="To Branch"><SelectNative name="to_branch_id" defaultValue={branches[1]?.id ?? branches[0]?.id ?? ""} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative></Field>
            <p className="col-span-2 text-xs text-muted-foreground md:col-span-3">From branch → To branch. Stock moves only after posting.</p>
            <Field label="Remarks" className="col-span-2 md:col-span-3"><Textarea name="remarks" placeholder="Transfer reason or handling note" /></Field>
          </div>
        </details>
        <LineGrid seedLines={seedLines} mode="transfer" />
        {showSubmit ? <div className="flex justify-end"><SubmitButton disabled={!seedLines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create transfer</SubmitButton></div> : null}
      </form>
  );
}

export function StockTransferReceiveForm({ transferId, lines, action, formId = "stock-transfer-receive-form" }: { transferId: string; lines: TransferReceiveLine[]; action: (formData: FormData) => Promise<void>; formId?: string }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  return (
    <form id={formId} action={action} className="min-w-0 space-y-3" data-stock-transfer-receive-form>
      <input type="hidden" name="transfer_id" value={transferId} />
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />
      <div className="min-w-0 overflow-hidden rounded-sm border">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_96px_92px] gap-2 border-b bg-secondary/30 px-3 py-2 text-xs font-semibold">
          <span>Item</span><span className="text-right">Sent / received</span><span className="text-right">Receive</span>
        </div>
        <div className="divide-y">
          {lines.map((line) => {
            const remaining = Math.max(0, line.quantity - line.received_quantity);
            return (
              <div key={line.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_96px_92px] items-center gap-2 px-3 py-3" data-transfer-receive-line={line.id}>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{line.item_name}</p>
                  <p className="text-xs text-muted-foreground">{line.item_code ?? line.item_id} · {line.uom}</p>
                  <input type="hidden" name="receipt_line_id" value={line.id} />
                  <input type="hidden" name="receipt_uom" value={line.uom} />
                </div>
                <p className="text-right text-xs tabular-nums text-muted-foreground">{line.received_quantity} / {line.quantity} {line.uom}</p>
                <Input name="receipt_quantity" type="number" inputMode="decimal" min="0" max={remaining} step="0.0001" defaultValue="0" disabled={remaining === 0} aria-label={`Receive quantity for ${line.item_name}`} className="h-12 min-w-0 w-full text-right" />
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
      <form id={formId} action={action} className="space-y-3">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <input type="hidden" name="wastage_no" value="WST-AUTO" />
        <details open data-stock-wastage-setup className="erp-surface group overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between border-b px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Wastage setup <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 md:p-4">
            <Field label="Wastage Date"><Input name="wastage_date" type="date" defaultValue={getToday()} required /></Field>
            <Field label="Main Reason"><SelectNative name="reason" defaultValue="damaged">{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative></Field>
            <Field label="Branch" className="col-span-2 md:col-span-1"><SelectNative name="branch_id" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(e) => selectBranch(e.target.value)} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative></Field>
            <Field label="Evidence note" className="col-span-2 md:col-span-3"><Textarea name="remarks" placeholder="Photo reference, supplier claim, or handling note" /></Field>
          </div>
        </details>
        <LineGrid seedLines={seedLines} mode="wastage" />
        {showSubmit ? <div className="flex justify-end"><SubmitButton disabled={!seedLines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create wastage</SubmitButton></div> : null}
      </form>
  );
}

function LineGrid({ seedLines, mode }: { seedLines: SeedLine[]; mode: "transfer" | "wastage" }) {
  const [search, setSearch] = useState("");
  const [openNotes, setOpenNotes] = useState<Set<number>>(() => new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    const firstAvailable = seedLines.find((line) => line.available_qty > 0);
    return new Set(firstAvailable ? [firstAvailable.item_id] : []);
  });
  const normalizedSearch = search.trim().toLowerCase();
  const visibleCount = seedLines.filter((line) => !normalizedSearch || `${line.item_code} ${line.item_name}`.toLowerCase().includes(normalizedSearch)).length;
  function toggleNote(index: number) {
    setOpenNotes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }
  function toggleItem(itemId: string, selected: boolean, index: number) {
    setSelectedItems((current) => {
      const next = new Set(current);
      if (selected) next.add(itemId); else next.delete(itemId);
      return next;
    });
    if (!selected) {
      setOpenNotes((current) => {
        const next = new Set(current);
        next.delete(index);
        return next;
      });
    }
  }
  return (
    <section data-stock-operation-lines className="erp-surface overflow-hidden md:rounded-[var(--sb-control-radius)]">
      <div className="border-b bg-secondary/40 p-3">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">Items</p><p className="text-xs text-muted-foreground">Select an item to enter its quantity.</p></div><span className="text-xs tabular-nums text-muted-foreground">{selectedItems.size} selected · {visibleCount} shown</span></div>
        <label className="relative mt-2 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item code or name" aria-label="Search item code or name" className="pl-9" /></label>
      </div>
      <div className="hidden grid-cols-[2fr_120px_120px_130px_1fr] gap-2 border-b bg-[var(--sb-surface-muted)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-text-muted)] xl:grid">
        <span>Item</span><span>Quantity</span><span>Available</span><span>{mode === "wastage" ? "Reason" : "Destination"}</span><span>Notes</span>
      </div>
      <div className="divide-y">
        {seedLines.map((line, index) => {
          const matches = !normalizedSearch || `${line.item_code} ${line.item_name}`.toLowerCase().includes(normalizedSearch);
          const selected = selectedItems.has(line.item_id);
          return (
          <div key={line.item_id} hidden={!matches} data-stock-operation-line data-selected={selected || undefined} className="grid grid-cols-2 gap-2 p-3 xl:grid-cols-[2fr_120px_120px_130px_1fr]">
            <div className="col-span-2 xl:col-span-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0"><label className="flex items-start gap-2 font-medium"><input className="mt-0.5" name="line_enabled" type="checkbox" value={line.item_id} checked={selected} disabled={line.available_qty <= 0} onChange={(event) => toggleItem(line.item_id, event.target.checked, index)} /><span className="break-words">{line.item_name}</span></label><p className="pl-6 text-xs text-muted-foreground">{line.item_code} · {line.uom}{line.available_qty <= 0 ? " · No stock available" : ""}</p></div>
              </div>
            </div>
            <div className={selected ? "contents" : "hidden"} data-stock-operation-line-details>
              <Field label="Quantity" labelClassName="xl:sr-only"><Input name="line_quantity" type="number" inputMode="decimal" min={line.available_qty > 0 ? "0.0001" : "0"} max={Math.max(0, line.available_qty)} step="0.0001" defaultValue={line.available_qty > 0 ? Math.min(line.quantity, line.available_qty) : 0} /></Field>
              <div className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-2 text-sm"><div><p className="text-xs text-muted-foreground xl:sr-only">Available</p><p className="font-semibold">{formatNumber(line.available_qty)} {line.uom}</p></div>{selected ? <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={`Notes for ${line.item_name}`} aria-expanded={openNotes.has(index)} onClick={() => toggleNote(index)}><MessageSquare className="h-4 w-4" /></Button> : null}</div>
              <input type="hidden" name="line_uom" value={line.uom} />
              {mode === "wastage" ? <Field label="Reason" labelClassName="xl:sr-only" className="col-span-2 xl:col-span-1"><SelectNative name="line_reason" defaultValue="damaged">{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative></Field> : <input type="hidden" name="line_reason" value="other" />}
              <div className="col-span-2 xl:col-span-1" hidden={!openNotes.has(index)}>
                <div hidden={!openNotes.has(index)} className="mt-2 grid gap-2">
                  {mode === "wastage" ? <Field label="Batch"><Input name="line_batch_no" placeholder="Batch" /></Field> : <input type="hidden" name="line_batch_no" value="" />}
                  <Field label="Remarks"><Input name="line_remarks" placeholder="Notes" /></Field>
                </div>
              </div>
              {mode === "wastage" ? <input type="hidden" name="line_expiry_date" value="" /> : null}
              <input type="hidden" name="line_item_id" value={line.item_id} />
            </div>
          </div>
        )})}
        {seedLines.length > 0 && visibleCount === 0 ? <div className="px-3 py-8 text-center text-sm text-muted-foreground">No items match your search.</div> : null}
        {!seedLines.length ? <div className="flex items-center gap-2 px-3 py-2 text-xs text-warning"><AlertTriangle className="h-4 w-4" /> No available branch stock found.</div> : null}
      </div>
    </section>
  );
}
