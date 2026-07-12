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
  const grns = await getPostedGrnsForInvoice();
  const selectedGrn = filters.grn_id ? grns.find((grn) => grn.id === filters.grn_id) ?? null : null;
  return (
    <>
      <PageHeader title="New Supplier Invoice" description="Create a basic AP invoice from a posted GRN." />
      <WorkspaceGrid
        rightRail={
          <ConsoleSection title="Invoice Actions">
            <Button type="submit" form="supplier-invoice-form" disabled={!selectedGrn} className="w-full">Create Invoice</Button>
          </ConsoleSection>
        }
      >
        {filters.error ? <Card><CardContent className="p-4 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
        <SupplierInvoiceForm grns={grns} selectedGrn={selectedGrn} action={createSupplierInvoice} />
      </WorkspaceGrid>
    </>
  );
}
