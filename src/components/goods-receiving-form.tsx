"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, PackageCheck, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { EligiblePurchaseOrder, PurchaseOrderReceivingLine } from "@/server/queries/goods-receivings";

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
  const [barcode, setBarcode] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [matchedLineId, setMatchedLineId] = useState<string | null>(null);
  const grnNo = "GRN-AUTO";
  const lineByBarcode = useMemo(() => {
    const map = new Map<string, PurchaseOrderReceivingLine>();
    lines.forEach((line) => {
      [line.item?.barcode, line.item?.internal_barcode, line.item?.item_code].filter(Boolean).forEach((value) => map.set(String(value).toLowerCase(), line));
    });
    return map;
  }, [lines]);

  function selectPo(poId: string) {
    router.push(poId ? `/goods-receivings/new?po_id=${poId}` : "/goods-receivings/new");
  }

  function scanBarcode() {
    const code = barcode.trim().toLowerCase();
    if (!code) {
      setScanMessage("Scan or enter barcode first.");
      return;
    }
    const line = lineByBarcode.get(code);
    if (!line) {
      setMatchedLineId(null);
      setScanMessage("Warning: scanned item is not in this PO.");
      return;
    }
    setMatchedLineId(line.id);
    setScanMessage(`${line.item?.item_name ?? "Item"} matched. Enter received quantity.`);
    document.getElementById(`received-${line.id}`)?.focus();
    document.getElementById(`line-${line.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Purchase Order">
              <SelectNative value={selectedOrder?.id ?? ""} onChange={(event) => selectPo(event.target.value)} required>
                <option value="">Select approved/sent PO</option>
                {purchaseOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.po_no} - {order.supplier_name ?? "Supplier"} - Pending {formatNumber(order.pending_qty)}
                  </option>
                ))}
              </SelectNative>
            </Field>
            <Field label="GRN No">
              <Input name="grn_no" defaultValue={grnNo} required />
            </Field>
            <Field label="Received Date">
              <Input name="received_date" type="date" defaultValue={today()} required />
            </Field>
            <Field label="Branch">
              <SelectNative name="branch_id" defaultValue={branches[0]?.id ?? ""} required>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
              <p className="mt-1 text-xs text-muted-foreground">Select the outlet, kitchen, office, or event booth this record belongs to.</p>
            </Field>
            <Field label="Status">
              <SelectNative name="status" defaultValue="draft">
                <option value="draft">Draft</option>
              </SelectNative>
            </Field>
            <div className="lg:col-span-3">
              <Field label="Remarks">
                <Textarea name="remarks" placeholder="Delivery notes, vehicle, temperature, or supplier remarks" />
              </Field>
            </div>
          </div>

          {selectedOrder ? (
            <>
              <input type="hidden" name="purchase_order_id" value={selectedOrder.id} />
              <input type="hidden" name="supplier_id" value={selectedOrder.supplier_id} />
              <div className="grid gap-3 rounded-lg border bg-secondary/30 p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-semibold">Barcode Receiving</p>
                  <p className="text-xs text-muted-foreground">Use Search, USB scanner, or Camera mode. USB scanner is recommended for daily operation.</p>
                </div>
                <div className="flex gap-2">
                  <Input value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => event.key === "Enter" ? (event.preventDefault(), scanBarcode()) : undefined} placeholder="Scan barcode" />
                  <Button type="button" onClick={scanBarcode}>
                    <ScanLine className="mr-2 h-4 w-4" />
                    Scan
                  </Button>
                </div>
                {scanMessage ? (
                  <p className={`text-sm ${scanMessage.startsWith("Warning") ? "text-warning" : "text-muted-foreground"}`}>{scanMessage}</p>
                ) : null}
              </div>

              <div className="rounded-lg border">
                <div className="flex flex-col gap-2 border-b bg-secondary/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Receiving Lines</p>
                    <p className="text-xs text-muted-foreground">Draft does not affect stock. Stock increases only after posting this GRN.</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">PO:</span> <span className="font-semibold">{selectedOrder.po_no}</span>
                  </div>
                </div>
                <div className="divide-y">
                  {lines.map((line) => (
                    <div key={line.id} id={`line-${line.id}`} className={`grid gap-3 p-4 xl:grid-cols-[2fr_repeat(5,110px)_130px_130px_1.3fr] ${matchedLineId === line.id ? "bg-accent/10" : ""}`}>
                      <div>
                        <p className="font-medium">{line.item?.item_name ?? line.item_id}</p>
                        <p className="text-xs text-muted-foreground">{line.item?.item_code} - {line.item?.barcode ?? line.item?.internal_barcode ?? "No barcode"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Unit cost {formatCurrency(line.unit_price)}</p>
                      </div>
                      <Field label="Ordered"><Input name="line_ordered_qty" value={line.qty_ordered} readOnly /></Field>
                      <Field label="Prev. Received"><Input name="line_previously_received_qty" value={line.previously_received_qty} readOnly /></Field>
                      <Field label="Pending"><Input name="line_pending_qty" value={line.pending_qty} readOnly /></Field>
                      <Field label="Received"><Input id={`received-${line.id}`} name="line_received_qty" type="number" min="0" max={line.pending_qty} step="0.0001" defaultValue={0} /></Field>
                      <Field label="Rejected"><Input name="line_rejected_qty" type="number" min="0" max={line.pending_qty} step="0.0001" defaultValue={0} /></Field>
                      <Field label="Batch"><Input name="line_batch_no" placeholder="Batch no" /></Field>
                      <Field label="Expiry"><Input name="line_expiry_date" type="date" /></Field>
                      <Field label="Remarks"><Input name="line_remarks" placeholder="Damage/reject notes" /></Field>
                      <input type="hidden" name="line_purchase_order_line_id" value={line.id} />
                      <input type="hidden" name="line_item_id" value={line.item_id} />
                      <input type="hidden" name="line_uom" value={line.uom} />
                      <input type="hidden" name="line_unit_cost" value={line.unit_price} />
                    </div>
                  ))}
                  {!lines.length ? (
                    <div className="flex items-center gap-2 p-4 text-sm text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      This PO has no pending lines to receive.
                    </div>
                  ) : null}
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <input name="delivery_order_attached" type="checkbox" className="h-4 w-4" />
                Delivery Order is available. Upload the file in the document attachment panel before posting.
              </label>
            </>
          ) : (
            <div className="rounded-lg border bg-secondary/30 p-8 text-center">
              <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-semibold">Select a purchase order to begin receiving</p>
              <p className="mt-1 text-sm text-muted-foreground">Only approved, sent, or partially received POs can be received.</p>
            </div>
          )}

          <div className="flex justify-end">
            <SubmitButton type="submit" disabled={!selectedOrder || !lines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create draft GRN</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
