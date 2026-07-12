"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { PostedGrnForInvoice } from "@/server/queries/supplier-invoices";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function SupplierInvoiceForm({ grns, selectedGrn, action }: { grns: PostedGrnForInvoice[]; selectedGrn: PostedGrnForInvoice | null; action: (formData: FormData) => Promise<void> }) {
  const router = useRouter();
  const [invoiceDate, setInvoiceDate] = useState(today());
  const total = selectedGrn?.received_value ?? 0;
  const dueDate = useMemo(() => addDays(invoiceDate, 30), [invoiceDate]);
  return (
    <Card>
      <CardContent className="p-5">
        <form id="supplier-invoice-form" action={action} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Posted GRN" required>
              <SelectNative value={selectedGrn?.id ?? ""} onChange={(event) => router.push(event.target.value ? `/supplier-invoices/new?grn_id=${event.target.value}` : "/supplier-invoices/new")} required>
                <option value="">Select posted GRN</option>
                {grns.map((grn) => <option key={grn.id} value={grn.id}>{grn.grn_no} - {grn.po_no ?? "PO"} - {grn.supplier_name ?? "Supplier"} - {formatCurrency(grn.received_value)}</option>)}
              </SelectNative>
            </Field>
            <Field label="Supplier Invoice No" required><Input name="supplier_invoice_no" required placeholder="QA-INV-729-001" /></Field>
            <Field label="Invoice Date" required><Input name="invoice_date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required /></Field>
            <Field label="Due Date"><Input name="due_date" type="date" defaultValue={dueDate} /></Field>
            <Field label="Subtotal" required><Input name="subtotal" type="number" min="0.01" step="0.01" value={total || ""} readOnly required /></Field>
            <Field label="Tax"><Input name="tax_amount" type="number" min="0" step="0.01" defaultValue={0} /></Field>
            <Field label="Total Amount" required><Input name="total_amount" type="number" min="0.01" step="0.01" value={total || ""} readOnly required /></Field>
            <div className="md:col-span-3"><Field label="Notes"><Textarea name="notes" placeholder="Invoice notes" /></Field></div>
          </div>
          {selectedGrn ? (
            <>
              <input type="hidden" name="goods_receiving_id" value={selectedGrn.id} />
              <div className="rounded-md border bg-secondary/30 p-3 text-sm">
                <p><strong>Supplier:</strong> {selectedGrn.supplier_name ?? "-"}</p>
                <p><strong>PO:</strong> {selectedGrn.po_no ?? "-"}</p>
                <p><strong>GRN:</strong> {selectedGrn.grn_no}</p>
              </div>
            </>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
