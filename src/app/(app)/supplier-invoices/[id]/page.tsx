import { randomUUID } from "node:crypto";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionLink } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { StatusBadge } from "@/components/ui/status-badge";
import { SupplierInvoiceForm } from "@/components/supplier-invoice-form";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { approveSupplierInvoice, recordSupplierInvoicePayment, updateSupplierInvoiceDraft, voidSupplierInvoice } from "@/server/actions/supplier-invoices";
import { getPermissionMap } from "@/server/auth/permissions";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPostedGrnsForInvoice, getSupplierInvoice } from "@/server/queries/supplier-invoices";

const invoiceSteps = [
  { key: "draft", label: "Draft", description: "Invoice details can be edited." },
  { key: "open", label: "Approved / Open", description: "Totals are locked and payment is due." },
  { key: "partially_paid", label: "Partially Paid", description: "Some payment has been recorded." },
  { key: "paid", label: "Paid", description: "Invoice balance is settled." },
];

function today() { return new Date().toISOString().slice(0, 10); }

export default async function SupplierInvoiceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ id }, messageParams] = await Promise.all([params, searchParams]);
  const [{ invoice, payments, lines, linkedPos, linkedGrns }, permissions] = await Promise.all([
    getSupplierInvoice(id),
    getPermissionMap(["supplier_invoice.create", "supplier_invoice.approve", "supplier_invoice.pay", "supplier_invoice.void"]),
  ]);
  const [documentBundle, editSources] = await Promise.all([
    invoice.document_id ? getDocumentBundle(invoice.document_id) : null,
    invoice.status === "draft" ? getPostedGrnsForInvoice(invoice.supplier_id, invoice.id) : null,
  ]);
  const canPay = permissions["supplier_invoice.pay"] && ["open", "partially_paid"].includes(invoice.status);
  const canVoid = permissions["supplier_invoice.void"] && invoice.status !== "void" && invoice.status !== "paid" && Number(invoice.amount_paid) === 0;
  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Supplier Invoices", href: "/supplier-invoices" }, { label: invoice.invoice_no }]}
      documentNo={invoice.invoice_no}
      title="Supplier Invoice"
      status={invoice.status}
      workflowSteps={invoiceSteps}
      currentStatus={invoice.status}
      sidePanel={
        <>
          <DocumentSideSection title="Invoice Actions" description="Status-aware finance actions for this invoice.">
            <DocumentActionBar>
              {linkedPos.map((po) => <DocumentActionLink key={po.id} href={`/purchase-orders/${po.id}`} variant="outline">View {po.no}</DocumentActionLink>)}
              {linkedGrns.map((grn) => <DocumentActionLink key={grn.id} href={`/goods-receivings/${grn.id}`} variant="outline">View {grn.no}</DocumentActionLink>)}
            </DocumentActionBar>
            {invoice.status === "draft" && permissions["supplier_invoice.create"] ? <SubmitButton form="supplier-invoice-form" pendingLabel="Saving..." className="mt-3 w-full justify-center">Save Draft</SubmitButton> : null}
            {invoice.status === "draft" && permissions["supplier_invoice.approve"] ? <form action={approveSupplierInvoice.bind(null, invoice.id)} className="mt-2"><SubmitButton pendingLabel="Approving..." className="w-full justify-center">Approve / Open</SubmitButton></form> : null}
            {canPay ? (
              <form action={recordSupplierInvoicePayment.bind(null, invoice.id)} className="mt-3 grid gap-2 border-t pt-3">
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <Input name="payment_date" type="date" defaultValue={today()} required />
                <Input name="amount" type="number" min="0.01" max={invoice.balance_due} step="0.01" placeholder={`Outstanding ${formatCurrency(invoice.balance_due)}`} required />
                <Input name="payment_method" placeholder="Payment method" required />
                <Input name="reference_no" placeholder="Reference" />
                <Textarea name="notes" placeholder="Payment notes" />
                <SubmitButton pendingLabel="Recording..." className="w-full justify-center">Record Payment</SubmitButton>
              </form>
            ) : invoice.status !== "draft" ? <p className="mt-3 text-xs text-muted-foreground">No further payment action is available.</p> : null}
            {canVoid ? <form action={voidSupplierInvoice.bind(null, invoice.id)} className="mt-3 grid gap-2 border-t pt-3"><Textarea name="reason" placeholder="Required void reason" required /><SubmitButton variant="destructive" pendingLabel="Voiding..." className="w-full justify-center">Void Invoice</SubmitButton></form> : null}
          </DocumentSideSection>
          {documentBundle ? <>
            <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
            <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
            <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
            <RevisionPanel revisions={documentBundle.revisions} />
          </> : null}
        </>
      }
    >
      {messageParams.error || messageParams.success ? <Card><CardContent className={`p-3 text-xs ${messageParams.error ? "text-destructive" : "text-emerald-700"}`}>{messageParams.error ?? messageParams.success}</CardContent></Card> : null}
      {invoice.status === "draft" && editSources ? (
        <SupplierInvoiceForm
          suppliers={editSources.suppliers}
          grns={editSources.grns}
          selectedSupplierId={invoice.supplier_id}
          action={updateSupplierInvoiceDraft.bind(null, invoice.id)}
          initial={{
            invoice_no: invoice.invoice_no,
            supplier_invoice_no: invoice.supplier_invoice_no,
            invoice_date: invoice.invoice_date,
            due_date: invoice.due_date,
            payment_terms_days: invoice.payment_terms_days,
            tax_amount: Number(invoice.tax_amount),
            notes: invoice.notes,
            lines: lines.map((line) => ({ goods_receiving_line_id: line.goods_receiving_line_id, invoice_qty: Number(line.invoice_qty), invoice_unit_price: Number(line.invoice_unit_price) })),
          }}
        />
      ) : <>
        <Card><CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Invoice Summary</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs uppercase text-muted-foreground">Supplier Reference</p><p className="font-medium">{invoice.supplier_invoice_no}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{invoice.supplier_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Invoice Date</p><p className="font-medium">{invoice.invoice_date}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Due Date</p><p className="font-medium">{invoice.due_date ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Payment Terms</p><p className="font-medium">{invoice.payment_terms_days} days</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Status</p><StatusBadge status={invoice.status} /></div>
            <div><p className="text-xs uppercase text-muted-foreground">Paid</p><p className="font-medium">{formatCurrency(invoice.amount_paid)}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Outstanding</p><p className="font-medium">{formatCurrency(invoice.balance_due)}</p></div>
          </div>
          {invoice.notes ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{invoice.notes}</p> : null}
          {invoice.void_reason ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"><strong>Void reason:</strong> {invoice.void_reason}</p> : null}
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Invoice Matching</h2><strong>{formatCurrency(invoice.total_amount)}</strong></div>
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>PO / GRN</TableHead><TableHead>Item</TableHead><TableHead className="text-right">PO Ordered</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Previously Invoiced</TableHead><TableHead className="text-right">Invoice Qty</TableHead><TableHead className="text-right">PO Price</TableHead><TableHead className="text-right">Invoice Price</TableHead><TableHead className="text-right">Qty / Price Variance</TableHead><TableHead className="text-right">Line Total</TableHead></TableRow></TableHeader>
            <TableBody>{lines.map((line) => <TableRow key={line.id}>
              <TableCell>{line.po_no}<br /><span className="text-xs text-muted-foreground">{line.grn_no}</span></TableCell>
              <TableCell>{line.item_name}<br /><span className="text-xs text-muted-foreground">{line.item_code ?? "-"} / {line.uom}</span></TableCell>
              <TableCell className="text-right">{formatNumber(line.ordered_qty)}</TableCell><TableCell className="text-right">{formatNumber(line.received_qty)}</TableCell><TableCell className="text-right">{formatNumber(line.previously_invoiced_qty)}</TableCell><TableCell className="text-right">{formatNumber(line.invoice_qty)}</TableCell>
              <TableCell className="text-right">{formatCurrency(line.po_unit_price)}</TableCell><TableCell className="text-right">{formatCurrency(line.invoice_unit_price)}</TableCell><TableCell className="text-right text-xs">{formatNumber(Number(line.invoice_qty) - (Number(line.received_qty) - Number(line.previously_invoiced_qty)))} / {formatCurrency(Number(line.invoice_unit_price) - Number(line.po_unit_price))}</TableCell><TableCell className="text-right">{formatCurrency(line.line_total)}</TableCell>
            </TableRow>)}</TableBody>
          </Table></div>
          <div className="mt-3 flex justify-end gap-6 text-sm"><span>Subtotal <strong>{formatCurrency(invoice.subtotal)}</strong></span><span>Tax <strong>{formatCurrency(invoice.tax_amount)}</strong></span><span>Total <strong>{formatCurrency(invoice.total_amount)}</strong></span></div>
        </CardContent></Card>
      </>}
      <Card><CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Payment History</h2><span className="text-xs text-muted-foreground">{payments.length} payment(s)</span></div>
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Payment No</TableHead><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>{payments.map((payment) => <TableRow key={payment.id}><TableCell>{payment.payment_no}</TableCell><TableCell>{payment.payment_date}</TableCell><TableCell>{payment.payment_method ?? "-"}</TableCell><TableCell>{payment.reference_no ?? "-"}</TableCell><TableCell>{payment.notes ?? "-"}</TableCell><TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell></TableRow>)}
          {!payments.length ? <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No payments recorded.</TableCell></TableRow> : null}</TableBody>
        </Table></div>
      </CardContent></Card></DocumentWorkspace>
  );
}
