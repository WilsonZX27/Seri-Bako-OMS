import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { SupplierInvoiceForm } from "@/components/supplier-invoice-form";
import { createSupplierInvoice } from "@/server/actions/supplier-invoices";
import { getPostedGrnsForInvoice } from "@/server/queries/supplier-invoices";

export default async function NewSupplierInvoicePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const { grns, suppliers } = await getPostedGrnsForInvoice(filters.supplier_id);
  const primaryAction = <Button type="submit" form="supplier-invoice-form" disabled={!filters.supplier_id || !grns.length} className="w-full">Save Invoice Details</Button>;
  const steps = [
    { key: "draft", label: "Draft", description: "Invoice matching details can be edited." },
    { key: "open", label: "Approved / Open", description: "Finance has approved the invoice for payment." },
    { key: "partially_paid", label: "Partially Paid", description: "Some payment has been recorded." },
    { key: "paid", label: "Paid", description: "The supplier balance is settled." },
  ];
  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Supplier Invoices", href: "/supplier-invoices" }, { label: "New" }]}
        documentNo="New Supplier Invoice"
        title="Supplier Invoice"
        status="draft"
        workflowSteps={steps}
        currentStatus="draft"
        mobilePrimaryAction={primaryAction}
        sidePanel={<><DocumentSideSection title="Primary Action">{primaryAction}</DocumentSideSection><DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Choose a supplier and at least one posted receiving. Attach the supplier invoice on the saved draft before Finance approval.</p></DocumentSideSection></>}
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <SupplierInvoiceForm suppliers={suppliers} grns={grns} selectedSupplierId={filters.supplier_id} action={createSupplierInvoice} />
      </DocumentWorkspace>
  );
}
