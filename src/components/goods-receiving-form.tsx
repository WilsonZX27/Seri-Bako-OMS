"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, PackageCheck } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber, getToday } from "@/lib/utils";
import type { EligiblePurchaseOrder, PurchaseOrderReceivingLine } from "@/server/queries/goods-receivings";

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };

export function GoodsReceivingForm({
  purchaseOrders,
  selectedOrder,
  lines,
  branches,
  action,
}: {
  purchaseOrders: EligiblePurchaseOrder[];
  selectedOrder: EligiblePurchaseOrder | null;
  lines: PurchaseOrderReceivingLine[];
  branches: BranchOption[];
  action: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  // Keep required receiving context visible on first render. A preselected PO
  // previously collapsed this section before hydration, so an early tap on
  // "Expand receiving setup" could be lost and the Delivery Order field
  // appeared unavailable. Operators may still collapse it after reviewing.
  const [setupOpen, setSetupOpen] = useState(true);
  const [receivedDate, setReceivedDate] = useState(() => getToday());
  const [deliveryOrderNo, setDeliveryOrderNo] = useState("");
  const [branchId, setBranchId] = useState(() => selectedOrder?.branch_id ?? branches[0]?.id ?? "");
  const [remarks, setRemarks] = useState("");
  const [receivedPurchaseByLine, setReceivedPurchaseByLine] = useState<Record<string, string>>({});
  const [rejectedPurchaseByLine, setRejectedPurchaseByLine] = useState<Record<string, string>>({});
  const [receivedBaseByLine, setReceivedBaseByLine] = useState<Record<string, string>>({});
  const [rejectedBaseByLine, setRejectedBaseByLine] = useState<Record<string, string>>({});
  const [rememberConversionByLine, setRememberConversionByLine] = useState<Record<string, boolean>>({});
  const [overReceiptReasonByLine, setOverReceiptReasonByLine] = useState<Record<string, string>>({});
  const grnNo = "GRN-AUTO";
  const hasSelectedOrder = Boolean(selectedOrder);
  const selectedBranchId = selectedOrder?.branch_id ?? branches[0]?.id ?? "";

  useEffect(() => {
    const lineIds = new Set(lines.map((line) => line.id));
    setReceivedPurchaseByLine((current) => Object.fromEntries([...lineIds].map((id) => [id, current[id] ?? ""])));
    setRejectedPurchaseByLine((current) => Object.fromEntries([...lineIds].map((id) => [id, current[id] ?? ""])));
    setReceivedBaseByLine((current) => Object.fromEntries([...lineIds].map((id) => [id, current[id] ?? ""])));
    setRejectedBaseByLine((current) => Object.fromEntries([...lineIds].map((id) => [id, current[id] ?? ""])));
    setRememberConversionByLine((current) => Object.fromEntries([...lineIds].map((id) => [id, current[id] ?? false])));
    setOverReceiptReasonByLine((current) => Object.fromEntries([...lineIds].map((id) => [id, current[id] ?? ""])));
  }, [lines]);

  useEffect(() => {
    setSetupOpen(true);
    if (hasSelectedOrder) setBranchId(selectedBranchId);
  }, [hasSelectedOrder, selectedBranchId]);

  function selectPo(poId: string) {
    router.push(poId ? `/goods-receivings/new?po_id=${poId}` : "/goods-receivings/new");
  }

  return (
    <div className="min-w-0">
      <form id="goods-receiving-form" action={action} className="space-y-3">
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="grn_no" value={grnNo} />
          <input type="hidden" name="status" value="draft" />
          <section data-goods-receiving-setup className="erp-surface overflow-hidden p-3 lg:p-4">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--sb-border-soft)] pb-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--sb-text-muted)]">Receiving setup</p>
                {setupOpen ? <p className="mt-0.5 text-xs text-muted-foreground">Choose the posted order and receiving context.</p> : (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-[var(--sb-text)]">{selectedOrder?.po_no ?? "Select purchase order"}</span>
                    <span>{receivedDate}</span>
                    <span>{branches.find((branch) => branch.id === branchId)?.branch_name ?? "Branch not set"}</span>
                  </div>
                )}
              </div>
              <button type="button" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--sb-radius-control)] text-[var(--sb-green-800)] hover:bg-[var(--sb-surface-muted)]" onClick={() => setSetupOpen((open) => !open)} aria-label={setupOpen ? "Collapse receiving setup" : "Expand receiving setup"} aria-expanded={setupOpen} aria-controls="goods-receiving-setup-fields">
                <ChevronDown className={`h-4 w-4 transition-transform ${setupOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            {setupOpen ? (
              <div id="goods-receiving-setup-fields" className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Field label="Purchase Order" required className="col-span-2 lg:col-span-1">
                  <SelectNative value={selectedOrder?.id ?? ""} onChange={(event) => selectPo(event.target.value)} required>
                    <option value="">Select approved/sent PO</option>
                    {purchaseOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.po_no} - {order.supplier_name ?? "Supplier"} - Pending {formatNumber(order.pending_qty)}
                      </option>
                    ))}
                  </SelectNative>
                </Field>
                <Field label="Received Date" required>
                  <Input name="received_date" type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} required />
                </Field>
                <Field label="Delivery Order Number">
                  <Input name="delivery_order_no" value={deliveryOrderNo} onChange={(event) => setDeliveryOrderNo(event.target.value)} placeholder="Supplier DO reference" />
                </Field>
                <Field label="Branch" required className="col-span-2 lg:col-span-1">
                  <SelectNative name="branch_id" value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                  </SelectNative>
                  <p className="mt-1 text-xs text-muted-foreground">Select the branch receiving this delivery.</p>
                </Field>
                <Field label="Remarks" className="col-span-2 lg:col-span-3">
                  <Textarea name="remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Delivery notes, vehicle, temperature, or supplier remarks" />
                </Field>
              </div>
            ) : (
              <>
                <input type="hidden" name="received_date" value={receivedDate} />
                <input type="hidden" name="delivery_order_no" value={deliveryOrderNo} />
                <input type="hidden" name="branch_id" value={branchId} />
                <input type="hidden" name="remarks" value={remarks} />
              </>
            )}
          </section>

          {selectedOrder ? (
            <>
              <input type="hidden" name="purchase_order_id" value={selectedOrder.id} />
              <input type="hidden" name="supplier_id" value={selectedOrder.supplier_id} />
              <section data-goods-receiving-workspace className="sb-work-surface overflow-hidden">
                <div className="flex flex-col gap-2 border-b bg-secondary/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold">Receiving Lines</p>
                    <p className="text-xs text-muted-foreground">Enter delivered and rejected quantities. Conversion and order context stay visible without repeating editable fields.</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">PO:</span> <span className="font-semibold">{selectedOrder.po_no}</span>
                  </div>
                </div>
                <div className="divide-y">
                  {lines.map((line) => {
                    const baseUom = line.item?.base_unit ?? "base UOM";
                    const hasSavedConversion = Boolean(line.conversion_to_base_uom);
                    const sameUnit = hasSavedConversion && (line.uom === baseUom || Number(line.conversion_to_base_uom) === 1);
                    const receivedBase = receivedBaseByLine[line.id] ?? "";
                    const rejectedBase = rejectedBaseByLine[line.id] ?? "";
                    const enteredQty = Number(receivedPurchaseByLine[line.id] ?? 0) + Number(rejectedPurchaseByLine[line.id] ?? 0);
                    const isOverReceipt = enteredQty > Number(line.pending_qty);
                    return (
                      <article key={line.id} id={`line-${line.id}`} className="p-3 sm:p-4">
                        <header className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold">{line.item?.item_name ?? line.item_id}</p>
                            <p className="text-xs text-muted-foreground">{line.item?.item_code} · {line.uom}{sameUnit ? "" : ` → ${baseUom}`}</p>
                          </div>
                          <p className="shrink-0 text-xs text-muted-foreground">{formatCurrency(line.unit_price)} / {line.uom}</p>
                        </header>

                        <dl className="mt-3 grid grid-cols-3 divide-x rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] py-2 text-center">
                          <div className="px-2"><dt className="text-[10px] text-muted-foreground">Ordered</dt><dd className="text-xs font-semibold tabular-nums">{formatNumber(line.qty_ordered)} {line.uom}</dd></div>
                          <div className="px-2"><dt className="text-[10px] text-muted-foreground">Received</dt><dd className="text-xs font-semibold tabular-nums">{formatNumber(line.previously_received_qty)} {line.uom}</dd></div>
                          <div className="px-2"><dt className="text-[10px] text-muted-foreground">Pending</dt><dd className="text-xs font-semibold tabular-nums">{formatNumber(line.pending_qty)} {line.uom}</dd></div>
                        </dl>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <Field label={`Received · ${line.uom}`} required>
                            <Input id={`received-${line.id}`} name="line_received_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={receivedPurchaseByLine[line.id] ?? ""} onChange={(event) => { const value = event.target.value; setReceivedPurchaseByLine((current) => ({ ...current, [line.id]: value })); if (line.conversion_to_base_uom) setReceivedBaseByLine((current) => ({ ...current, [line.id]: value ? (Number(value) * line.conversion_to_base_uom!).toFixed(4) : "" })); else if (value && Number(receivedBaseByLine[line.id] ?? 0) > 0 && Number(rejectedPurchaseByLine[line.id] ?? 0) > 0) setRejectedBaseByLine((current) => ({ ...current, [line.id]: (Number(rejectedPurchaseByLine[line.id]) * Number(receivedBaseByLine[line.id]) / Number(value)).toFixed(4) })); }} className={`font-semibold tabular-nums ${isOverReceipt ? "border-[var(--sb-warning)]" : ""}`} aria-label={`Received in purchase UOM ${line.uom}`} />
                          </Field>
                          <Field label={`Rejected · ${line.uom}`}>
                            <Input name="line_rejected_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={rejectedPurchaseByLine[line.id] ?? ""} onChange={(event) => { const value = event.target.value; setRejectedPurchaseByLine((current) => ({ ...current, [line.id]: value })); const inferred = line.conversion_to_base_uom ?? ((Number(receivedPurchaseByLine[line.id] ?? 0) > 0 && Number(receivedBaseByLine[line.id] ?? 0) > 0) ? Number(receivedBaseByLine[line.id]) / Number(receivedPurchaseByLine[line.id]) : null); if (inferred) setRejectedBaseByLine((current) => ({ ...current, [line.id]: value ? (Number(value) * inferred).toFixed(4) : "" })); }} className={isOverReceipt ? "border-[var(--sb-warning)]" : undefined} aria-label={`Rejected in purchase UOM ${line.uom}`} />
                          </Field>
                        </div>

                        {isOverReceipt ? <Field label="Over-receipt reason" required className="mt-3">
                          <Input name="line_over_receipt_reason" value={overReceiptReasonByLine[line.id] ?? ""} onChange={(event) => setOverReceiptReasonByLine((current) => ({ ...current, [line.id]: event.target.value }))} minLength={3} maxLength={1000} required placeholder="Explain the supplier over-delivery" className="border-[var(--sb-warning)]" />
                          <p className="mt-1 flex items-center gap-1 text-xs text-[var(--sb-warning)]"><AlertTriangle className="h-3.5 w-3.5" />Entered total exceeds the remaining PO quantity by {formatNumber(enteredQty - Number(line.pending_qty))} {line.uom}. The reason will be retained for audit.</p>
                        </Field> : <input type="hidden" name="line_over_receipt_reason" value="" />}

                        {!hasSavedConversion ? <div className="mt-3 rounded-[var(--sb-radius-control)] bg-[var(--sb-warning-bg)] p-3">
                          <p className="text-xs font-medium text-[var(--sb-text)]">Confirm the pack conversion once</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">Enter the matching base quantities; future deliveries can reuse this conversion.</p>
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            <Field label={`Received · ${baseUom}`} required><Input name="line_received_base_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={receivedBase} onChange={(event) => { const value = event.target.value; setReceivedBaseByLine((current) => ({ ...current, [line.id]: value })); if (value && Number(receivedPurchaseByLine[line.id] ?? 0) > 0 && Number(rejectedPurchaseByLine[line.id] ?? 0) > 0) setRejectedBaseByLine((current) => ({ ...current, [line.id]: (Number(rejectedPurchaseByLine[line.id]) * Number(value) / Number(receivedPurchaseByLine[line.id])).toFixed(4) })); }} /></Field>
                            <Field label={`Rejected · ${baseUom}`}><Input name="line_rejected_base_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={rejectedBase} onChange={(event) => setRejectedBaseByLine((current) => ({ ...current, [line.id]: event.target.value }))} /></Field>
                          </div>
                          <label className="mt-2 flex min-h-10 items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={rememberConversionByLine[line.id] ?? false} onChange={(event) => setRememberConversionByLine((current) => ({ ...current, [line.id]: event.target.checked }))} /> Remember for future deliveries</label>
                        </div> : <>
                          <input type="hidden" name="line_received_base_qty" value={receivedBase} />
                          <input type="hidden" name="line_rejected_base_qty" value={rejectedBase} />
                          {!sameUnit && (receivedBase || rejectedBase) ? <p className="mt-2 text-xs text-muted-foreground">Base quantity: {receivedBase || "0"} received · {rejectedBase || "0"} rejected {baseUom}</p> : null}
                        </>}

                        <details className="mt-3 border-t border-[var(--sb-border-soft)] pt-2">
                          <summary className="cursor-pointer py-1 text-xs font-medium text-[var(--sb-green-800)]">Batch, expiry &amp; line remarks</summary>
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            <Field label="Batch"><Input name="line_batch_no" placeholder="Batch no" /></Field>
                            <Field label="Expiry"><Input name="line_expiry_date" type="date" /></Field>
                            <Field label="Remarks" className="col-span-2"><Input name="line_remarks" placeholder="Damage or rejection notes" /></Field>
                          </div>
                        </details>

                        <input type="hidden" name="line_purchase_order_line_id" value={line.id} />
                        <input type="hidden" name="line_item_id" value={line.item_id} />
                        <input type="hidden" name="line_ordered_qty" value={line.qty_ordered} />
                        <input type="hidden" name="line_previously_received_qty" value={line.previously_received_qty} />
                        <input type="hidden" name="line_pending_qty" value={line.pending_qty} />
                        <input type="hidden" name="line_conversion_snapshot" value={line.conversion_to_base_uom ?? ((Number(receivedPurchaseByLine[line.id] ?? 0) > 0 && Number(receivedBaseByLine[line.id] ?? 0) > 0) ? (Number(receivedBaseByLine[line.id]) / Number(receivedPurchaseByLine[line.id])).toFixed(8) : ((Number(rejectedPurchaseByLine[line.id] ?? 0) > 0 && Number(rejectedBaseByLine[line.id] ?? 0) > 0) ? (Number(rejectedBaseByLine[line.id]) / Number(rejectedPurchaseByLine[line.id])).toFixed(8) : ""))} />
                        <input type="hidden" name="line_remember_conversion" value={rememberConversionByLine[line.id] ? "on" : ""} />
                        <input type="hidden" name="line_uom" value={line.uom} />
                        <input type="hidden" name="line_unit_cost" value={line.unit_price} />
                      </article>
                    );
                  })}
                  {!lines.length ? (
                    <div className="flex items-center gap-2 p-4 text-sm text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      This PO has no pending lines to receive.
                    </div>
                  ) : null}
                </div>
              </section>

              <p className="rounded-[var(--sb-radius-control)] border bg-secondary/30 p-3 text-sm text-muted-foreground">
                Save the receiving, then attach the supplier Delivery Order before posting to stock. Mobile upload supports camera, photo library, and files.
              </p>
            </>
          ) : (
            <section data-goods-receiving-empty className="sb-work-surface p-8 text-center">
              <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-semibold">Select a purchase order to begin receiving</p>
              <p className="mt-1 text-sm text-muted-foreground">Only approved, sent, or partially received POs can be received.</p>
            </section>
          )}
      </form>
    </div>
  );
}
