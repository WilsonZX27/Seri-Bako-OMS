"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatNumber, getToday } from "@/lib/utils";
import type { InvoiceSourceLine, PostedGrnForInvoice } from "@/server/queries/supplier-invoices";

type DraftLine = { goods_receiving_line_id: string; invoice_qty: number; invoice_unit_price: number };
type InitialDraft = {
  invoice_no: string;
  supplier_invoice_no: string;
  invoice_date: string;
  due_date: string | null;
  payment_terms_days: number;
  tax_amount: number;
  notes: string | null;
  lines: DraftLine[];
};

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function SupplierInvoiceForm({
  suppliers, grns, selectedSupplierId, action, initial,
}: {
  suppliers: Array<{ id: string; name: string; payment_terms_days: number }>;
  grns: PostedGrnForInvoice[];
  selectedSupplierId?: string;
  action: (formData: FormData) => Promise<void>;
  initial?: InitialDraft;
}) {
  const router = useRouter();
  const sourceLines = useMemo(() => new Map(grns.flatMap((grn) => grn.lines).map((line) => [line.id, line])), [grns]);
  const [lines, setLines] = useState<Record<string, DraftLine>>(() => Object.fromEntries((initial?.lines ?? []).map((line) => [line.goods_receiving_line_id, line])));
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoice_date ?? getToday());
  const supplierTerms = suppliers.find((supplier) => supplier.id === selectedSupplierId)?.payment_terms_days ?? 30;
  const [terms, setTerms] = useState(initial?.payment_terms_days ?? supplierTerms);
  const [dueDate, setDueDate] = useState(initial?.due_date ?? addDays(invoiceDate, terms));
  const [tax, setTax] = useState(Number(initial?.tax_amount ?? 0));
  const chosen = Object.values(lines);
  const subtotal = chosen.reduce((sum, line) => sum + line.invoice_qty * line.invoice_unit_price, 0);

  function setLine(source: InvoiceSourceLine, checked: boolean) {
    setLines((current) => {
      const next = { ...current };
      if (checked) next[source.id] = { goods_receiving_line_id: source.id, invoice_qty: source.available_qty, invoice_unit_price: Number(source.unit_cost) };
      else delete next[source.id];
      return next;
    });
  }

  function setGrn(grn: PostedGrnForInvoice, checked: boolean) {
    setLines((current) => {
      const next = { ...current };
      for (const source of grn.lines) {
        if (checked) next[source.id] = next[source.id] ?? { goods_receiving_line_id: source.id, invoice_qty: source.available_qty, invoice_unit_price: Number(source.unit_cost) };
        else delete next[source.id];
      }
      return next;
    });
  }

  function updateLine(id: string, key: "invoice_qty" | "invoice_unit_price", value: number) {
    setLines((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  return (
    <div className="min-w-0">
        <form id="supplier-invoice-form" action={action} className="erp-surface space-y-4 p-3 md:p-4">
          {initial ? <input type="hidden" name="invoice_no" value={initial.invoice_no} /> : null}
          <input type="hidden" name="lines" value={JSON.stringify(chosen)} />
          <section data-supplier-invoice-setup className="grid grid-cols-2 gap-3 border-b border-[var(--sb-border-soft)] pb-4 md:grid-cols-3">
            <Field label="Supplier" required className="col-span-2 md:col-span-1">
              <SelectNative
                name={initial ? undefined : "supplier_id"}
                value={selectedSupplierId ?? ""}
                disabled={!!initial}
                onChange={(event) => router.push(event.target.value ? `/supplier-invoices/new?supplier_id=${event.target.value}` : "/supplier-invoices/new")}
                required
              >
                <option value="">Select supplier first</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </SelectNative>
              {initial ? <input type="hidden" name="supplier_id" value={selectedSupplierId} /> : null}
            </Field>
            <Field label="Supplier Invoice Reference" required className="col-span-2 md:col-span-1"><Input name="supplier_invoice_no" defaultValue={initial?.supplier_invoice_no} required /></Field>
            <Field label="Invoice Date" required><Input name="invoice_date" type="date" value={invoiceDate} onChange={(event) => { setInvoiceDate(event.target.value); setDueDate(addDays(event.target.value, terms)); }} required /></Field>
            <Field label="Payment Terms (days)" required><Input name="payment_terms_days" type="number" min="0" step="1" value={terms} onChange={(event) => { const days = Number(event.target.value); setTerms(days); setDueDate(addDays(invoiceDate, days)); }} required /></Field>
            <Field label="Due Date"><Input name="due_date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
            <Field label="Tax"><Input name="tax_amount" type="number" min="0" step="0.01" value={tax} onChange={(event) => setTax(Number(event.target.value))} /></Field>
            <div className="col-span-2 md:col-span-3"><Field label="Notes"><Textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} placeholder="Invoice notes" /></Field></div>
          </section>

          {selectedSupplierId ? grns.map((grn) => {
            const allSelected = grn.lines.every((line) => !!lines[line.id]);
            return (
              <section key={grn.id} data-supplier-invoice-grn className="overflow-hidden border-y border-[var(--sb-border-soft)]">
                <label className="flex cursor-pointer items-center gap-2 bg-secondary/40 px-3 py-2 text-sm font-medium">
                  <input type="checkbox" checked={allSelected} onChange={(event) => setGrn(grn, event.target.checked)} />
                  {grn.grn_no} / {grn.po_no ?? "PO"} / Available {formatCurrency(grn.received_value)}
                </label>
                <div className="sb-table-region hidden md:block">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-10" /><TableHead>Item</TableHead><TableHead className="text-right">PO Ordered</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Previously Invoiced</TableHead><TableHead className="text-right">Invoice Qty</TableHead><TableHead className="text-right">PO Price</TableHead><TableHead className="text-right">Invoice Price</TableHead><TableHead className="text-right">Qty / Price Variance</TableHead></TableRow></TableHeader>
                    <TableBody>{grn.lines.map((source) => {
                      const line = lines[source.id];
                      const qtyVariance = Number(line?.invoice_qty ?? 0) - source.available_qty;
                      const priceVariance = Number(line?.invoice_unit_price ?? source.unit_cost) - source.po_unit_price;
                      return <TableRow key={source.id}>
                        <TableCell><input aria-label={`Select ${source.item_name}`} type="checkbox" checked={!!line} onChange={(event) => setLine(source, event.target.checked)} /></TableCell>
                        <TableCell><p className="font-medium">{source.item_name}</p><p className="text-xs text-muted-foreground">{source.item_code ?? "-"} / {source.uom}</p></TableCell>
                        <TableCell className="text-right">{formatNumber(source.po_ordered_qty)}</TableCell>
                        <TableCell className="text-right">{formatNumber(source.received_qty)}</TableCell>
                        <TableCell className="text-right">{formatNumber(source.previously_invoiced_qty)}</TableCell>
                        <TableCell className="min-w-28"><Input aria-label={`${source.item_name} invoice quantity`} type="number" min="0.0001" max={source.available_qty} step="0.0001" disabled={!line} value={line?.invoice_qty ?? source.available_qty} onChange={(event) => updateLine(source.id, "invoice_qty", Number(event.target.value))} /></TableCell>
                        <TableCell className="text-right">{formatCurrency(source.po_unit_price)}</TableCell>
                        <TableCell className="min-w-28"><Input aria-label={`${source.item_name} invoice price`} type="number" min="0" step="0.0001" disabled={!line} value={line?.invoice_unit_price ?? source.unit_cost} onChange={(event) => updateLine(source.id, "invoice_unit_price", Number(event.target.value))} /></TableCell>
                        <TableCell className="text-right text-xs">{formatNumber(qtyVariance)} / {formatCurrency(priceVariance)}</TableCell>
                      </TableRow>;
                    })}</TableBody>
                  </Table>
                </div>
                <div data-supplier-invoice-line-list className="divide-y divide-[var(--sb-border-soft)] md:hidden">
                  {grn.lines.map((source) => {
                    const line = lines[source.id];
                    const qtyVariance = Number(line?.invoice_qty ?? 0) - source.available_qty;
                    const priceVariance = Number(line?.invoice_unit_price ?? source.unit_cost) - source.po_unit_price;
                    return <article key={source.id} className="min-w-0 p-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <input aria-label={`Select ${source.item_name}`} type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={!!line} onChange={(event) => setLine(source, event.target.checked)} />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">{source.item_name}</p>
                          <p className="text-xs text-muted-foreground">{source.item_code ?? "-"} / {source.uom}</p>
                        </div>
                      </div>
                      {line ? <div data-supplier-invoice-line-editor>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <Field label="Invoice Qty"><Input aria-label={`${source.item_name} invoice quantity`} type="number" min="0.0001" max={source.available_qty} step="0.0001" value={line.invoice_qty} onChange={(event) => updateLine(source.id, "invoice_qty", Number(event.target.value))} /></Field>
                          <Field label="Invoice Price"><Input aria-label={`${source.item_name} invoice price`} type="number" min="0" step="0.0001" value={line.invoice_unit_price} onChange={(event) => updateLine(source.id, "invoice_unit_price", Number(event.target.value))} /></Field>
                        </div>
                        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--sb-border-soft)] pt-2 text-xs">
                          <div><dt className="text-muted-foreground">Received</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(source.received_qty)}</dd></div>
                          <div><dt className="text-muted-foreground">Available</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(source.available_qty)}</dd></div>
                          <div><dt className="text-muted-foreground">PO price</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatCurrency(source.po_unit_price)}</dd></div>
                        </dl>
                        <p className="mt-2 text-xs text-muted-foreground">Variance: {formatNumber(qtyVariance)} qty / {formatCurrency(priceVariance)}</p>
                      </div> : null}
                    </article>;
                  })}
                </div>
              </section>
            );
          }) : <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Select a supplier to load eligible posted GRNs.</p>}

          {selectedSupplierId && !grns.length ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No eligible uninvoiced received quantities remain for this supplier.</p> : null}
          {selectedSupplierId && grns.length ? <p className={chosen.length ? "text-xs text-muted-foreground" : "text-xs font-medium text-[var(--sb-warning-text)]"} aria-live="polite">
            {chosen.length ? `${chosen.length} invoice ${chosen.length === 1 ? "line" : "lines"} selected.` : "Select at least one receiving line before saving the invoice."}
          </p> : null}
          <div className="grid grid-cols-2 gap-3 bg-secondary/30 p-3 text-sm md:flex md:justify-end md:gap-6">
            <span>Subtotal <strong>{formatCurrency(subtotal)}</strong></span>
            <span>Total <strong>{formatCurrency(subtotal + tax)}</strong></span>
          </div>
          {chosen.some((line) => line.invoice_qty > (sourceLines.get(line.goods_receiving_line_id)?.available_qty ?? 0)) ? <p className="text-sm text-destructive">Invoice quantity exceeds an available received quantity.</p> : null}
        </form>
    </div>
  );
}
