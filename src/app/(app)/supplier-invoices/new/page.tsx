import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SupplierInvoiceForm } from "@/components/supplier-invoice-form";
import { createSupplierInvoice } from "@/server/actions/supplier-invoices";
import { getPostedGrnsForInvoice } from "@/server/queries/supplier-invoices";

export default async function NewSupplierInvoicePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const { grns, suppliers } = await getPostedGrnsForInvoice(filters.supplier_id);
  return (
    <>
      <PageHeader title="New Supplier Invoice" description="Create a basic AP invoice from a posted GRN." />
      <WorkspaceGrid
        hideMobileConsole
        className="pb-20 xl:pb-3"
        rightRail={
          <ConsoleSection title="Invoice Actions">
            <div data-mobile-primary-action><Button type="submit" form="supplier-invoice-form" disabled={!filters.supplier_id || !grns.length} className="w-full">Save Invoice Details</Button></div>
            <p className="mt-2 text-xs text-muted-foreground">Attach the supplier invoice on the saved draft before Finance Review.</p>
          </ConsoleSection>
        }
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <SupplierInvoiceForm suppliers={suppliers} grns={grns} selectedSupplierId={filters.supplier_id} action={createSupplierInvoice} />
        <div data-inline-form-actions className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-40 border bg-background p-2 shadow-sm xl:hidden"><Button type="submit" form="supplier-invoice-form" disabled={!filters.supplier_id || !grns.length} className="w-full">Save Invoice Details</Button></div>
      </WorkspaceGrid>
    </>
  );
}
