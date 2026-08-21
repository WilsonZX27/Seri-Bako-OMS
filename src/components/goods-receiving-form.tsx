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
  const [setupOpen, setSetupOpen] = useState(() => !selectedOrder);
  const [receivedDate, setReceivedDate] = useState(() => getToday());
  const [deliveryOrderNo, setDeliveryOrderNo] = useState("");
  const [branchId, setBranchId] = useState(() => selectedOrder?.branch_id ?? branches[0]?.id ?? "");
  const [remarks, setRemarks] = useState("");
  const [receivedPurchaseByLine, setReceivedPurchaseByLine] = useState<Record<string, string>>({});
  const [rejectedPurchaseByLine, setRejectedPurchaseByLine] = useState<Record<string, string>>({});
  const [receivedBaseByLine, setReceivedBaseByLine] = useState<Record<string, string>>({});
  const [rejectedBaseByLine, setRejectedBaseByLine] = useState<Record<string, string>>({});
  const [rememberConversionByLine, setRememberConversionByLine] = useState<Record<string, boolean>>({});
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
  }, [lines]);

  useEffect(() => {
    setSetupOpen(!hasSelectedOrder);
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
                    <p className="text-xs text-muted-foreground">Enter what the supplier delivered. Known conversions are calculated for you; unknown pack sizes can be confirmed here once and optionally remembered.</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">PO:</span> <span className="font-semibold">{selectedOrder.po_no}</span>
                  </div>
                </div>
                <div className="divide-y">
                  {lines.map((line) => (
                    <div key={line.id} id={`line-${line.id}`} className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 xl:grid-cols-[2fr_repeat(5,96px)_112px_112px_1.3fr] xl:gap-2">
                      <div className="order-1 col-span-2 border-b border-[var(--sb-border-soft)] pb-2 sm:col-span-3 xl:order-none xl:col-span-1 xl:border-b-0 xl:pb-0">
                        <p className="font-medium">{line.item?.item_name ?? line.item_id}</p>
                        <p className="text-xs text-muted-foreground">{line.item?.item_code} · Purchase UOM {line.uom}</p>
                        {line.conversion_to_base_uom ? <p className="mt-1 text-xs text-muted-foreground">1 {line.uom} = {formatNumber(line.conversion_to_base_uom)} {line.item?.base_unit ?? "base UOM"}</p> : <p className="mt-1 text-xs font-medium text-warning">No saved conversion yet. Enter both quantities below to confirm it for this delivery.</p>}
                        <p className="mt-1 text-xs text-muted-foreground">Unit cost {formatCurrency(line.unit_price)} / {line.uom}{line.conversion_to_base_uom ? ` · ${formatCurrency(line.unit_price / line.conversion_to_base_uom)} / ${line.item?.base_unit ?? "base UOM"}` : ""}</p>
                      </div>
                      <Field label={`Received (${line.uom})`} required className="order-2 xl:order-none xl:col-start-auto"><Input id={`received-${line.id}`} name="line_received_qty" type="number" inputMode="decimal" min="0" max={line.pending_qty} step="0.0001" value={receivedPurchaseByLine[line.id] ?? ""} onChange={(event) => { const value = event.target.value; setReceivedPurchaseByLine((current) => ({ ...current, [line.id]: value })); if (line.conversion_to_base_uom) setReceivedBaseByLine((current) => ({ ...current, [line.id]: value ? (Number(value) * line.conversion_to_base_uom!).toFixed(4) : "" })); else if (value && Number(receivedBaseByLine[line.id] ?? 0) > 0 && Number(rejectedPurchaseByLine[line.id] ?? 0) > 0) setRejectedBaseByLine((current) => ({ ...current, [line.id]: (Number(rejectedPurchaseByLine[line.id]) * Number(receivedBaseByLine[line.id]) / Number(value)).toFixed(4) })); }} className="font-semibold tabular-nums" aria-label={`Received in purchase UOM ${line.uom}`} aria-describedby={`received-help-${line.id}`} /><p id={`received-help-${line.id}`} className="mt-1 text-[11px] text-muted-foreground">Actual quantity on the supplier document.</p></Field>
                      <Field label={`Received (${line.item?.base_unit ?? "base UOM"})`} required className="order-2 xl:order-none"><Input name="line_received_base_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={receivedBaseByLine[line.id] ?? ""} onChange={(event) => { const value = event.target.value; setReceivedBaseByLine((current) => ({ ...current, [line.id]: value })); if (!line.conversion_to_base_uom && value && Number(receivedPurchaseByLine[line.id] ?? 0) > 0 && Number(rejectedPurchaseByLine[line.id] ?? 0) > 0) setRejectedBaseByLine((current) => ({ ...current, [line.id]: (Number(rejectedPurchaseByLine[line.id]) * Number(value) / Number(receivedPurchaseByLine[line.id])).toFixed(4) })); }} readOnly={Boolean(line.conversion_to_base_uom)} className="font-semibold tabular-nums" aria-label={`Received in base UOM ${line.item?.base_unit ?? "base UOM"}`} /><input type="hidden" name="line_conversion_snapshot" value={line.conversion_to_base_uom ?? ((Number(receivedPurchaseByLine[line.id] ?? 0) > 0 && Number(receivedBaseByLine[line.id] ?? 0) > 0) ? (Number(receivedBaseByLine[line.id]) / Number(receivedPurchaseByLine[line.id])).toFixed(8) : ((Number(rejectedPurchaseByLine[line.id] ?? 0) > 0 && Number(rejectedBaseByLine[line.id] ?? 0) > 0) ? (Number(rejectedBaseByLine[line.id]) / Number(rejectedPurchaseByLine[line.id])).toFixed(8) : ""))} /><p className="mt-1 text-[11px] text-muted-foreground">{line.conversion_to_base_uom ? "Calculated from the saved conversion." : "Actual base quantity received; this teaches the conversion."}</p></Field>
                      <Field label={`Rejected (${line.uom})`} className="order-2 xl:order-none"><Input name="line_rejected_qty" type="number" inputMode="decimal" min="0" max={line.pending_qty} step="0.0001" value={rejectedPurchaseByLine[line.id] ?? ""} onChange={(event) => { const value = event.target.value; setRejectedPurchaseByLine((current) => ({ ...current, [line.id]: value })); const inferred = line.conversion_to_base_uom ?? ((Number(receivedPurchaseByLine[line.id] ?? 0) > 0 && Number(receivedBaseByLine[line.id] ?? 0) > 0) ? Number(receivedBaseByLine[line.id]) / Number(receivedPurchaseByLine[line.id]) : null); if (inferred) setRejectedBaseByLine((current) => ({ ...current, [line.id]: value ? (Number(value) * inferred).toFixed(4) : "" })); }} aria-label={`Rejected in purchase UOM ${line.uom}`} /></Field>
                      <Field label={`Rejected (${line.item?.base_unit ?? "base UOM"})`} className="order-2 xl:order-none"><Input name="line_rejected_base_qty" type="number" inputMode="decimal" min="0" step="0.0001" value={rejectedBaseByLine[line.id] ?? ""} onChange={(event) => setRejectedBaseByLine((current) => ({ ...current, [line.id]: event.target.value }))} readOnly={Boolean(line.conversion_to_base_uom)} aria-label={`Rejected in base UOM ${line.item?.base_unit ?? "base UOM"}`} /></Field>
                      <Field label="Ordered" className="order-3 xl:order-none"><Input name="line_ordered_qty" value={line.qty_ordered} readOnly aria-label={`Ordered in ${line.uom}`} /></Field>
                      <Field label="Prev. Received" className="order-3 xl:order-none"><Input name="line_previously_received_qty" value={line.previously_received_qty} readOnly aria-label={`Prev. Received in ${line.uom}`} /></Field>
                      <Field label="Pending" className="order-4 xl:order-none"><Input name="line_pending_qty" value={line.pending_qty} readOnly aria-label={`Pending in ${line.uom}`} /></Field>
                      <Field label="Batch" className="order-4 xl:order-none"><Input name="line_batch_no" placeholder="Batch no" /></Field>
                      <Field label="Expiry" className="order-5 xl:order-none"><Input name="line_expiry_date" type="date" /></Field>
                      <Field label="Remarks" className="order-5 col-span-2 sm:col-span-3 xl:order-none xl:col-span-1"><Input name="line_remarks" placeholder="Damage/reject notes" /></Field>
                      <input type="hidden" name="line_purchase_order_line_id" value={line.id} />
                      <input type="hidden" name="line_item_id" value={line.item_id} />
                      <input type="hidden" name="line_uom" value={line.uom} />
                      <input type="hidden" name="line_unit_cost" value={line.unit_price} />
                      {!line.conversion_to_base_uom ? <label className="order-6 col-span-2 flex items-center gap-2 text-xs text-muted-foreground sm:col-span-3 xl:order-none xl:col-span-2"><input type="checkbox" name="line_remember_conversion" checked={rememberConversionByLine[line.id] ?? false} onChange={(event) => setRememberConversionByLine((current) => ({ ...current, [line.id]: event.target.checked }))} /> Remember this supplier conversion for future deliveries</label> : null}
                    </div>
                  ))}
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
