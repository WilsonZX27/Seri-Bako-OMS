"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PackageX } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { FormPendingBridge } from "@/components/ui/submit-button";
import { formatCurrency, formatNumber, getToday } from "@/lib/utils";
import type { ReturnableGoodsReceiving, ReturnableGoodsReceivingLine } from "@/server/queries/purchase-returns";

export function PurchaseReturnForm({
  receivings,
  selectedReceiving,
  lines,
  action,
}: {
  receivings: ReturnableGoodsReceiving[];
  selectedReceiving: ReturnableGoodsReceiving | null;
  lines: ReturnableGoodsReceivingLine[];
  action: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [reason, setReason] = useState("");
  return (
    <div className="min-w-0">
        <form id="purchase-return-form" action={action} className="erp-surface grid gap-3 p-3 md:p-4"><FormPendingBridge formId="purchase-return-form" />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="purchase_return_no" value="PRT-AUTO" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Field label="Posted GRN" required className="col-span-2 lg:col-span-1">
              <SelectNative value={selectedReceiving?.id ?? ""} onChange={(event) => router.push(event.target.value ? `/purchase-returns/new?grn_id=${event.target.value}` : "/purchase-returns/new")} disabled={!receivings.length} required>
                <option value="">{receivings.length ? "Select posted GRN" : "No returnable GRNs available"}</option>
                {receivings.map((grn) => (
                  <option key={grn.id} value={grn.id}>
                    {grn.grn_no} - {grn.supplier_name ?? "Supplier"} - Returnable {formatNumber(grn.returnable_qty)}
                  </option>
                ))}
              </SelectNative>
            </Field>
            <Field label="Return Date" required>
              <Input name="return_date" type="date" defaultValue={getToday()} required />
            </Field>
            <Field label="Reason" className="col-span-1 lg:col-span-1">
              <SelectNative name="reason" value={reason} onChange={(event) => setReason(event.target.value)}>
                <option value="">Select a reason</option>
                <option value="Supplier return">Supplier return</option>
                <option value="Quality issue">Quality issue</option>
                <option value="Damaged in transit">Damaged in transit</option>
                <option value="Wrong item">Wrong item</option>
                <option value="Over-delivered">Over-delivered</option>
                <option value="Other">Other</option>
              </SelectNative>
            </Field>
            {reason === "Other" ? <Field label="Notes" className="col-span-2 lg:col-span-3"><Textarea name="remarks" placeholder="Describe the return reason" required /></Field> : <input type="hidden" name="remarks" value="" />}
          </div>

          {selectedReceiving ? (
            <>
              <input type="hidden" name="goods_receiving_id" value={selectedReceiving.id} />
              <div className="overflow-hidden rounded-[var(--sb-panel-radius)] border" data-purchase-return-lines data-inset-surface>
                <div className="flex flex-col gap-1 border-b bg-secondary/40 px-4 py-3">
                  <p className="text-xs font-semibold">Return Lines</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedReceiving.grn_no} / {selectedReceiving.po_no ?? "PO"} / {selectedReceiving.supplier_name ?? "Supplier"}. Stock deducts only after posting.
                  </p>
                </div>
                <div className="divide-y">
                  {lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-2 gap-3 p-3 xl:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))_1.25fr]">
                      <div className="col-span-2 xl:col-span-1">
                        <p className="font-medium">{line.item?.item_name ?? line.item_id}</p>
                        <p className="text-xs text-muted-foreground">{line.item?.item_code ?? "-"} · Unit cost {formatCurrency(line.unit_cost)}</p>
                      </div>
                      <Field label="Return Qty" required className="order-2 xl:order-none"><Input name="line_return_qty" type="number" min="0" max={line.returnable_qty} step="0.0001" defaultValue={line.returnable_qty} /></Field>
                      <Field label="UOM" className="order-2 xl:order-none"><Input name="line_uom" value={line.uom} readOnly /></Field>
                      <Field label="Returnable" className="order-3 xl:order-none"><Input value={line.returnable_qty} readOnly /></Field>
                      <Field label="Received" className="order-3 xl:order-none"><Input name="line_received_qty" value={line.received_qty} readOnly /></Field>
                      <Field label="Returned" className="order-3 xl:order-none"><Input name="line_previously_returned_qty" value={line.returned_qty} readOnly /></Field>
                      <Field label="Reason" className="col-span-2 order-4 xl:col-span-1 xl:order-none"><Input name="line_reason" placeholder="Optional line reason" /></Field>
                      <input type="hidden" name="line_goods_receiving_line_id" value={line.id} />
                      <input type="hidden" name="line_purchase_order_line_id" value={line.purchase_order_line_id} />
                      <input type="hidden" name="line_item_id" value={line.item_id} />
                      <input type="hidden" name="line_unit_cost" value={line.unit_cost} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div data-inset-surface className="rounded-[var(--sb-panel-radius)] border bg-secondary/30 p-8 text-center">
              <PackageX className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-semibold">{receivings.length ? "Select a posted GRN to return stock" : "No stock available for return"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{receivings.length ? "Only GRN lines with remaining returnable quantity appear here." : "Posted receivings with remaining returnable quantity will appear here."}</p>
            </div>
          )}
        </form>
    </div>
  );
}
