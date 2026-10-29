"use client";

import { ManagedStockDestinationDialog } from "@/components/managed-stock-destination";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, MessageSquare, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { FormPendingBridge, SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber, getToday } from "@/lib/utils";
import { wastageReasons } from "@/lib/validations/stock-operations";

type Branch = { id: string; branch_code: string; branch_name: string; status: string };
type SeedLine = { item_id: string; item_code: string; item_name: string; available_qty: number; quantity: number; uom: string };
type TransferReceiveLine = { id: string; item_id: string; item_name: string; item_code?: string | null; quantity: number; received_quantity: number; uom: string };

export function StockTransferForm({ branches, selectedFromBranchId, seedLines, action, formId, showSubmit = false, canCreateDestination = false }: { canCreateDestination?:boolean; branches: Branch[]; selectedFromBranchId?: string; seedLines: SeedLine[]; action: (formData: FormData) => Promise<void | { error: string }>; formId?: string; showSubmit?: boolean }) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [result, submitTransfer] = useActionState(async (previous: { error: string; values: Array<[string, string]>; attempt: number } | null, data: FormData) => {
    const response = await action(data);
    return response?.error ? { error: response.error, values: Array.from(data.entries()).map(([key, value]) => [key, String(value)] as [string, string]), attempt: (previous?.attempt ?? 0) + 1 } : null;
  }, null);
  const saved = new URLSearchParams(result?.values ?? []);
  const [toBranchId, setToBranchId] = useState(() => branches.find(branch => branch.id !== selectedFromBranchId)?.id ?? "");
  const [createdDestinations,setCreatedDestinations]=useState<Branch[]>([]);
  const [newDestinationName,setNewDestinationName]=useState<string|null>(null);
  const destinations=[...branches,...createdDestinations.filter(item=>!branches.some(branch=>branch.id===item.id))];
  useEffect(() => {
    if (result) document.dispatchEvent(new CustomEvent("sb:form-settled", { detail: { formId } }));
  }, [result, formId]);
  function selectFromBranch(id: string) { router.push(id ? `/stock-transfers/new?from_branch_id=${id}` : "/stock-transfers/new"); }
  return (
      <form key={result?.attempt ?? 0} id={formId} action={submitTransfer} className="space-y-3">
      {formId ? <FormPendingBridge formId={formId} /> : null}
        {result?.error ? <p role="alert" className="rounded-sm border border-destructive p-3 text-sm text-destructive">{result.error}</p> : null}
        {destinations.length < 2 ? <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />A transfer needs access to two different branches. Contact an administrator to review your branch access.</p> : null}
        <input hidden type="hidden" name="idempotency_key" value={saved.get("idempotency_key") ?? idempotencyKey} />
        <details open data-stock-transfer-setup className="erp-surface group overflow-hidden">
          <summary className="flex min-h-[var(--sb-control-height)] cursor-pointer list-none items-center justify-between border-b px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Transfer setup <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 md:p-4">
            <Field label="Transfer Date" className="col-span-2 md:col-span-1"><Input name="transfer_date" type="date" defaultValue={saved.get("transfer_date") ?? getToday()} required /></Field>
            <Field label="From Branch"><SelectControl name="from_branch_id" ariaLabel="From branch" searchable value={selectedFromBranchId ?? branches[0]?.id ?? ""} onValueChange={selectFromBranch} required options={branches.map(branch => ({value:branch.id,label:branch.branch_name}))}/></Field>
            <Field label="To Branch"><SelectControl name="to_branch_id" ariaLabel="To branch" searchable value={toBranchId} onValueChange={setToBranchId} onCreateOption={canCreateDestination?setNewDestinationName:undefined} required options={destinations.map(branch => ({value:branch.id,label:branch.branch_name,disabled:branch.id === selectedFromBranchId}))}/></Field>
            <details className="group/transfer-note col-span-2 md:col-span-3" open={Boolean(saved.get("remarks"))}><summary className="flex min-h-[var(--sb-control-height)] cursor-pointer list-none items-center justify-between text-xs text-muted-foreground">Transfer note (optional)<ChevronDown className="size-3.5 group-open/transfer-note:rotate-180" aria-hidden="true"/></summary><Textarea name="remarks" aria-label="Transfer note" defaultValue={saved.get("remarks") ?? ""} placeholder="Transfer reason or handling note" /></details>
          </div>
        </details>
        {canCreateDestination?<ManagedStockDestinationDialog key={newDestinationName??"closed"} name={newDestinationName} onClose={()=>setNewDestinationName(null)} onCreated={destination=>{setCreatedDestinations(current=>[...current.filter(item=>item.id!==destination.id),destination]);setToBranchId(destination.id);router.refresh();}}/>:null}
        <StockTransferLines seedLines={seedLines} recoveredValues={result?.values} />
        {showSubmit ? <div className="flex justify-end"><SubmitButton disabled={!seedLines.length || destinations.length < 2} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create transfer</SubmitButton></div> : null}
      </form>
  );
}

export function StockTransferReceiveForm({ transferId, lines, action, formId = "stock-transfer-receive-form" }: { transferId: string; lines: TransferReceiveLine[]; action: (formData: FormData) => Promise<void>; formId?: string }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  return (
    <form id={formId} action={action} className="min-w-0 space-y-3" data-stock-transfer-receive-form>
      {formId ? <FormPendingBridge formId={formId} /> : null}
      <input hidden type="hidden" name="transfer_id" value={transferId} />
      <input hidden type="hidden" name="idempotency_key" value={idempotencyKey} />
      <div className="min-w-0 overflow-hidden rounded-sm border">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_96px_92px] gap-2 border-b bg-secondary/30 px-3 py-2 text-xs font-semibold">
          <span>Item</span><span className="text-right">Received / sent</span><span className="text-right">Receive</span>
        </div>
        <div className="divide-y">
          {lines.map((line) => {
            const remaining = Math.max(0, line.quantity - line.received_quantity);
            return (
              <div key={line.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_96px_92px] items-center gap-2 px-3 py-3" data-transfer-receive-line={line.id}>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{line.item_name}</p>
                  <p className="text-xs text-muted-foreground">{line.item_code ?? line.item_id} · {line.uom}</p>
                  <input hidden type="hidden" name="receipt_line_id" value={line.id} />
                  <input hidden type="hidden" name="receipt_uom" value={line.uom} />
                </div>
                <p className="text-right text-xs tabular-nums text-muted-foreground">{line.received_quantity} / {line.quantity} {line.uom}</p>
                <Input name="receipt_quantity" type="number" inputMode="decimal" min="0" max={remaining} step="0.0001" defaultValue="0" disabled={remaining === 0} aria-label={`Receive quantity for ${line.item_name}`} className="h-12 min-w-0 w-full text-right" />
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Enter only the quantity physically received. Any remainder stays in transit and can be received later.</p>
      <SubmitButton pendingLabel="Receiving..." disabled={!lines.some((line) => line.quantity > line.received_quantity)} showOverlay overlayLabel="Posting received quantities...">Confirm receipt</SubmitButton>
    </form>
  );
}

export function StockWastageForm({ branches, selectedBranchId, seedLines, action, formId, showSubmit = true }: { branches: Branch[]; selectedBranchId?: string; seedLines: SeedLine[]; action: (formData: FormData) => Promise<void | { error: string }>; formId?: string; showSubmit?: boolean }) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [result, submitWastage] = useActionState(async (previous: { error: string; values: Array<[string, string]>; attempt: number } | null, data: FormData) => {
    const response = await action(data);
    return response?.error ? { error: response.error, values: Array.from(data.entries()).map(([key, value]) => [key, String(value)] as [string, string]), attempt: (previous?.attempt ?? 0) + 1 } : null;
  }, null);
  const saved = new URLSearchParams(result?.values ?? []);
  useEffect(() => { if (result) document.dispatchEvent(new CustomEvent("sb:form-settled", { detail: { formId } })); }, [result, formId]);
  function selectBranch(id: string) { router.push(id ? `/stock-wastage/new?branch_id=${id}` : "/stock-wastage/new"); }
  return (
      <form key={result?.attempt ?? 0} id={formId} action={submitWastage} className="space-y-3">
      {formId ? <FormPendingBridge formId={formId} /> : null}
        {result?.error ? <p role="alert" className="rounded border border-destructive p-3 text-sm text-destructive">{result.error}</p> : null}
        <input hidden type="hidden" name="idempotency_key" value={saved.get("idempotency_key") ?? idempotencyKey} />
        <input hidden type="hidden" name="wastage_no" value="WST-AUTO" />
        <details open data-stock-wastage-setup className="erp-surface group overflow-hidden">
          <summary className="flex min-h-[var(--sb-control-height)] cursor-pointer list-none items-center justify-between border-b px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Wastage setup <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 md:p-4">
            <Field label="Wastage Date"><Input name="wastage_date" type="date" defaultValue={saved.get("wastage_date") ?? getToday()} required /></Field>
            <Field label="Main Reason"><SelectControl name="reason" defaultValue={saved.get("reason") ?? "damaged"} ariaLabel={"Main Reason"} options={[...(wastageReasons.map((r) => ({value: String((r) ?? ""), label: String((r.replaceAll("_", " ")) ?? "")})))]}/></Field>
            <Field label="Branch" className="col-span-2 md:col-span-1"><SelectControl name="branch_id" value={selectedBranchId ?? branches[0]?.id ?? ""} onValueChange={selectedValue => selectBranch(selectedValue)} required ariaLabel={"Branch"} options={[...(branches.map((b) => ({value: String((b.id) ?? ""), label: String((b.branch_name) ?? "")})))]}/></Field>
            <Field label="Evidence note" className="col-span-2 md:col-span-3"><Textarea name="remarks" defaultValue={saved.get("remarks") ?? ""} placeholder="Photo reference, supplier claim, or handling note" /></Field>
          </div>
        </details>
        <LineGrid seedLines={seedLines} mode="wastage" recoveredValues={result?.values} />
        {showSubmit ? <div className="flex justify-end"><SubmitButton disabled={!seedLines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create wastage</SubmitButton></div> : null}
      </form>
  );
}

export function StockTransferLines({ seedLines, recoveredValues }: { seedLines: SeedLine[]; recoveredValues?: Array<[string, string]> }) {
  const saved = new URLSearchParams(recoveredValues ?? []);
  const editorRef = useRef<HTMLElement>(null);
  const focusRow = (index: number) => requestAnimationFrame(() => editorRef.current?.querySelectorAll<HTMLElement>('[data-transfer-item-row] [role="combobox"]')[index]?.focus());
  const [rows, setRows] = useState(() => {
    const enabled = new Set(saved.getAll("line_enabled"));
    const restored = saved.getAll("line_item_id").flatMap((id, index) => enabled.has(id) ? [{ key: crypto.randomUUID(), itemId: id, quantity: saved.getAll("line_quantity")[index] ?? "", notes: saved.getAll("line_remarks")[index] ?? "", notesOpen: Boolean(saved.getAll("line_remarks")[index]) }] : []);
    return restored.length ? restored : [{ key: crypto.randomUUID(), itemId: "", quantity: "", notes: "", notesOpen: false }];
  });
  function update(key: string, patch: Partial<(typeof rows)[number]>) { setRows(current => current.map(row => row.key === key ? {...row, ...patch} : row)); }
  return <section ref={editorRef} data-stock-transfer-lines className="erp-surface overflow-hidden">
    <h2 className="border-b px-3 py-2 text-sm font-semibold">Items</h2>
    <div className="hidden grid-cols-[2rem_minmax(0,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_2.75rem_2.75rem] gap-2 border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-medium lg:grid"><span>#</span><span>Item</span><span>Quantity</span><span>Available</span><span className="sr-only">Notes</span><span className="sr-only">Remove</span></div><div className="divide-y">{rows.map((row, index) => {
      const item = seedLines.find(line => line.item_id === row.itemId);
      return <div key={row.key} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_2.75rem_2.75rem] items-start gap-2 p-3 lg:grid-cols-[2rem_minmax(0,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_2.75rem_2.75rem]" data-transfer-item-row><span className="row-start-1 self-center text-xs tabular-nums text-muted-foreground" aria-label={`Item index ${index + 1}`}>{index + 1}</span>
        <div className={item ? "col-start-2 min-w-0 lg:col-auto" : "col-span-2 col-start-2 min-w-0 lg:col-span-1 lg:col-auto"}><SelectControl ariaLabel={`Item ${index + 1}`} searchable startEmpty value={row.itemId} placeholder="Search item or code" searchPlaceholder="Search item or code" options={seedLines.map(line => ({value:line.item_id,label:`${line.item_name} · ${line.item_code}`,disabled:line.available_qty <= 0 || rows.some(other => other.key !== row.key && other.itemId === line.item_id)}))} onValueChange={itemId => update(row.key,{itemId,quantity:"",notes:"",notesOpen:false})}/></div>
        {item ? <>
          <input hidden type="hidden" name="line_item_id" value={item.item_id}/><input hidden type="hidden" name="line_enabled" value={item.item_id}/><input hidden type="hidden" name="line_uom" value={item.uom}/>
          <Field label="Quantity" labelClassName="lg:sr-only" className="col-span-2 col-start-1 row-start-2 lg:col-span-1 lg:col-auto lg:row-auto"><Input name="line_quantity" aria-label={`Quantity for ${item.item_name}`} type="number" inputMode="decimal" min="0.0001" max={item.available_qty} step="0.0001" required value={row.quantity} onChange={event => update(row.key,{quantity:event.target.value})}/></Field>
          <div className="col-span-2 col-start-3 row-start-2 pb-2 text-right text-xs lg:col-span-1 lg:col-auto lg:row-auto lg:pb-2 lg:text-left"><span className="block text-muted-foreground lg:sr-only">Available</span><span className="tabular-nums">{formatNumber(item.available_qty)} {item.uom}</span></div>
          <Button type="button" variant="ghost" size="icon" className="col-start-3 row-start-1 h-[var(--sb-control-height)] w-[var(--sb-control-height)] lg:col-auto lg:row-auto lg:self-start" aria-label={`Notes for ${item.item_name}`} aria-expanded={row.notesOpen} onClick={() => update(row.key,{notesOpen:!row.notesOpen})}><MessageSquare className="size-4"/></Button>
          {row.notesOpen ? <Field label="Item note" className="col-span-full"><Input autoFocus name="line_remarks" value={row.notes} onChange={event => update(row.key,{notes:event.target.value})}/></Field> : <input hidden type="hidden" name="line_remarks" value={row.notes}/>}
        </> : <span className="hidden lg:col-span-3 lg:block"/>}
        <Button type="button" variant="ghost" size="icon" className="col-start-4 row-start-1 h-[var(--sb-control-height)] w-[var(--sb-control-height)] lg:col-start-6 lg:self-start" aria-label={`Remove line ${index + 1}`} disabled={rows.length === 1 && !row.itemId} onClick={() => { setRows(current => current.length === 1 ? [{...row,itemId:"",quantity:"",notes:"",notesOpen:false}] : current.filter(other => other.key !== row.key)); focusRow(Math.max(0,index-1)); }}><X className="size-4"/></Button>
      </div>;
    })}</div>
    <div className="flex justify-end border-t p-3"><Button type="button" variant="outline" disabled={rows.some(row => !row.itemId) || rows.length >= seedLines.filter(line => line.available_qty > 0).length} onClick={() => { setRows(current => [...current,{key:crypto.randomUUID(),itemId:"",quantity:"",notes:"",notesOpen:false}]); focusRow(rows.length); }}><Plus className="size-4"/>Add line</Button></div>
    {!seedLines.length ? <p className="p-3 text-xs text-warning">No available branch stock found.</p> : null}
  </section>;
}

function LineGrid({ seedLines, mode, recoveredValues }: { seedLines: SeedLine[]; mode: "transfer" | "wastage"; recoveredValues?: Array<[string, string]> }) {
  const recovered = new URLSearchParams(recoveredValues ?? []);
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [lineRemarks, setLineRemarks] = useState<Record<string, string>>({});
  const [openNotes, setOpenNotes] = useState<Set<number>>(() => new Set(recovered.getAll("line_remarks").flatMap((note, index) => note ? [index] : [])));
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    if (recoveredValues) return new Set(recovered.getAll("line_enabled"));
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
              <Field label="Quantity" labelClassName="xl:sr-only"><Input name="line_quantity" type="number" inputMode="decimal" min={line.available_qty > 0 ? "0.0001" : "0"} max={Math.max(0, line.available_qty)} step="0.0001" value={quantities[line.item_id] ?? recovered.getAll("line_quantity")[index] ?? (line.available_qty > 0 ? Math.min(line.quantity, line.available_qty) : 0)} onChange={(event) => setQuantities((current) => ({ ...current, [line.item_id]: event.target.value }))} /></Field>
              <div className="flex items-center justify-between gap-2 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-2 text-sm"><div><p className="text-xs text-muted-foreground xl:sr-only">Available</p><p className="font-semibold">{formatNumber(line.available_qty)} {line.uom}</p></div>{selected ? <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={`Notes for ${line.item_name}`} aria-expanded={openNotes.has(index)} onClick={() => toggleNote(index)}><MessageSquare className="h-4 w-4" /></Button> : null}</div>
              <input hidden type="hidden" name="line_uom" value={line.uom} />
              {mode === "wastage" ? <Field label="Reason" labelClassName="xl:sr-only" className="col-span-2 xl:col-span-1"><SelectControl name="line_reason" defaultValue={recovered.getAll("line_reason")[index] ?? "damaged"} ariaLabel={"Reason"} options={[...(wastageReasons.map((r) => ({value: String((r) ?? ""), label: String((r.replaceAll("_", " ")) ?? "")})))]}/></Field> : <input hidden type="hidden" name="line_reason" value="other" />}
              <div className="col-span-2 xl:col-span-1" hidden={!openNotes.has(index)}>
                <div hidden={!openNotes.has(index)} className="mt-2 grid gap-2">
                  {mode === "wastage" ? <Field label="Batch"><Input name="line_batch_no" defaultValue={recovered.getAll("line_batch_no")[index] ?? ""} placeholder="Batch" /></Field> : <input hidden type="hidden" name="line_batch_no" value="" />}
                  <Field label="Remarks"><Input name="line_remarks" value={lineRemarks[line.item_id] ?? recovered.getAll("line_remarks")[index] ?? ""} onChange={(event) => setLineRemarks((current) => ({ ...current, [line.item_id]: event.target.value }))} placeholder="Notes" /></Field>
                </div>
              </div>
              {mode === "wastage" ? <input hidden type="hidden" name="line_expiry_date" value="" /> : null}
              <input hidden type="hidden" name="line_item_id" value={line.item_id} />
            </div>
          </div>
        )})}
        {seedLines.length > 0 && visibleCount === 0 ? <div className="px-3 py-8 text-center text-sm text-muted-foreground">No items match your search.</div> : null}
        {!seedLines.length ? <div className="flex items-center gap-2 px-3 py-2 text-xs text-warning"><AlertTriangle className="h-4 w-4" /> No available branch stock found.</div> : null}
      </div>
    </section>
  );
}
