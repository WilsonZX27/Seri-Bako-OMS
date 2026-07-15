import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionLink } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { StatusBadge } from "@/components/ui/status-badge";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { formatCurrency } from "@/lib/utils";
import { recordSupplierInvoicePayment } from "@/server/actions/supplier-invoices";
import { getPermissionMap } from "@/server/auth/permissions";
import { getDocumentBundle } from "@/server/queries/documents";
import { getSupplierInvoice } from "@/server/queries/supplier-invoices";

const invoiceSteps = [
  { key: "unpaid", label: "Unpaid", description: "Invoice is awaiting payment." },
  { key: "partially_paid", label: "Partially Paid", description: "Some payment has been recorded." },
  { key: "paid", label: "Paid", description: "Invoice balance is settled." },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function SupplierInvoiceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ id }, messageParams] = await Promise.all([params, searchParams]);
  const [{ invoice, payments }, permissions] = await Promise.all([getSupplierInvoice(id), getPermissionMap(["supplier_invoice.pay"])]);
  const documentBundle = invoice.document_id ? await getDocumentBundle(invoice.document_id) : null;
  const canPay = permissions["supplier_invoice.pay"] && invoice.status !== "paid" && invoice.status !== "cancelled";
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
          <DocumentSideSection title="Primary Action" description="Record payments against the outstanding balance.">
            <DocumentActionBar>
              <DocumentActionLink href={`/purchase-orders/${invoice.purchase_order_id}`} variant="outline">View PO</DocumentActionLink>
              <DocumentActionLink href={`/goods-receivings/${invoice.goods_receiving_id}`} variant="outline">View GRN</DocumentActionLink>
              <BlockedDestructiveAction buttonLabel="Delete invoice" title={`Cannot delete ${invoice.invoice_no}`} description="The invoice is linked to supplier, PO, GRN, document, and payment history." recommendation="Use the existing cancellation or correction process when available; paid history must remain auditable." />
            </DocumentActionBar>
            {canPay ? (
              <form action={recordSupplierInvoicePayment.bind(null, invoice.id)} className="mt-3 grid gap-2">
                <Input name="payment_date" type="date" defaultValue={today()} required />
                <Input name="amount" type="number" min="0.01" max={invoice.balance_due} step="0.01" placeholder={`Outstanding ${formatCurrency(invoice.balance_due)}`} required />
                <Input name="payment_method" placeholder="Payment method" />
                <Input name="reference_no" placeholder="Reference no" />
                <SubmitButton type="submit" pendingLabel="Recording..." className="w-full justify-center">Record Payment</SubmitButton>
              </form>
            ) : <p className="mt-3 text-xs text-muted-foreground">No further payment action is available.</p>}
          </DocumentSideSection>
          {documentBundle ? (
            <>
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : null}
        </>
      }
    >
      {messageParams.error || messageParams.success ? <Card><CardContent className={`p-3 text-xs ${messageParams.error ? "text-destructive" : "text-emerald-700"}`}>{messageParams.error ?? messageParams.success}</CardContent></Card> : null}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Invoice Summary</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs uppercase text-muted-foreground">Supplier Invoice No</p><p className="font-medium">{invoice.supplier_invoice_no}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{invoice.supplier_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">PO</p><p className="font-medium">{invoice.po_no ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">GRN</p><p className="font-medium">{invoice.grn_no ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Invoice Date</p><p className="font-medium">{invoice.invoice_date}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Due Date</p><p className="font-medium">{invoice.due_date ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Status</p><StatusBadge status={invoice.status} /></div>
            <div><p className="text-xs uppercase text-muted-foreground">Balance</p><p className="font-medium">{formatCurrency(invoice.balance_due)}</p></div>
          </div>
          {invoice.notes ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{invoice.notes}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-4">
          <div><p className="text-xs uppercase text-muted-foreground">Subtotal</p><p className="font-semibold">{formatCurrency(invoice.subtotal)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Tax</p><p className="font-semibold">{formatCurrency(invoice.tax_amount)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Total</p><p className="font-semibold">{formatCurrency(invoice.total_amount)}</p></div>
          <div><p className="text-xs uppercase text-muted-foreground">Amount Paid</p><p className="font-semibold">{formatCurrency(invoice.amount_paid)}</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Payment History</h2>
            <span className="text-xs text-muted-foreground">{payments.length} payment(s)</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Payment No</TableHead><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((payment) => <TableRow key={payment.id}><TableCell>{payment.payment_no}</TableCell><TableCell>{payment.payment_date}</TableCell><TableCell>{payment.payment_method ?? "-"}</TableCell><TableCell>{payment.reference_no ?? "-"}</TableCell><TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell></TableRow>)}
                {!payments.length ? <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No payments recorded.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DocumentWorkspace>
  );
}
