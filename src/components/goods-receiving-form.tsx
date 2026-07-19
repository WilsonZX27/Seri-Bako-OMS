"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, PackageCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
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
  const grnNo = "GRN-AUTO";

  function selectPo(poId: string) {
    router.push(poId ? `/goods-receivings/new?po_id=${poId}` : "/goods-receivings/new");
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form id="goods-receiving-form" action={action} className="space-y-3">
          <input type="hidden" name="grn_no" value={grnNo} />
          <input type="hidden" name="status" value="draft" />
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Purchase Order" required>
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
              <div className="rounded-md border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">Auto-generated on submit</div>
            </Field>
            <Field label="Received Date" required>
              <Input name="received_date" type="date" defaultValue={today()} required />
            </Field>
            <Field label="Delivery Order Number">
              <Input name="delivery_order_no" placeholder="Supplier DO reference" />
            </Field>
            <Field label="Branch" required>
              <SelectNative name="branch_id" defaultValue={branches[0]?.id ?? ""} required>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
              <p className="mt-1 text-xs text-muted-foreground">Select the branch receiving this delivery.</p>
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
              <div className="rounded-lg border">
                <div className="flex flex-col gap-2 border-b bg-secondary/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold">Receiving Lines</p>
                    <p className="text-xs text-muted-foreground">Draft does not affect stock. Stock increases only after posting this GRN.</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">PO:</span> <span className="font-semibold">{selectedOrder.po_no}</span>
                  </div>
                </div>
                <div className="divide-y">
                  {lines.map((line) => (
                    <div key={line.id} id={`line-${line.id}`} className="grid gap-2 p-3 xl:grid-cols-[2fr_repeat(5,96px)_112px_112px_1.3fr]">
                      <div>
                        <p className="font-medium">{line.item?.item_name ?? line.item_id}</p>
                        <p className="text-xs text-muted-foreground">{line.item?.item_code}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Unit cost {formatCurrency(line.unit_price)}</p>
                      </div>
                      <Field label="Ordered"><Input name="line_ordered_qty" value={line.qty_ordered} readOnly /></Field>
                      <Field label="Prev. Received"><Input name="line_previously_received_qty" value={line.previously_received_qty} readOnly /></Field>
                      <Field label="Pending"><Input name="line_pending_qty" value={line.pending_qty} readOnly /></Field>
                      <Field label="Received" required><Input id={`received-${line.id}`} name="line_received_qty" type="number" min="0" max={line.pending_qty} step="0.0001" defaultValue={0} /></Field>
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

              <p className="rounded-lg border bg-secondary/30 p-3 text-sm text-muted-foreground">
                Save the receiving, then attach the supplier Delivery Order before posting to stock. Mobile upload supports camera, photo library, and files.
              </p>
            </>
          ) : (
            <div className="rounded-lg border bg-secondary/30 p-8 text-center">
              <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-semibold">Select a purchase order to begin receiving</p>
              <p className="mt-1 text-sm text-muted-foreground">Only approved, sent, or partially received POs can be received.</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
