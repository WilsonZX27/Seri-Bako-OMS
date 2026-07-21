import Link from "next/link";
import { PurchaseRequestForm } from "@/components/procurement-forms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { createPurchaseRequest } from "@/server/actions/procurement";
import { hasPermission } from "@/server/auth/permissions";
import { getBranchesForSelect, getCurrentProfile, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewPurchaseRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [items, suppliers, branches, hasCommercialAccess, profile] = await Promise.all([
    getItemsForSelect(),
    getSuppliersForSelect(),
    getBranchesForSelect(),
    hasPermission("pr.view_all"),
    getCurrentProfile(),
  ]);
  const canViewCommercial = hasCommercialAccess && !["kitchen", "kitchen_staff"].includes(String(profile?.role_code ?? "").toLowerCase());
  const initialItem = params.item_id ? items.find((item) => item.id === params.item_id) : null;
  const initialLine = initialItem ? {
    itemId: initialItem.id,
    itemSearch: `${initialItem.item_code} - ${initialItem.item_name}`,
    qty: params.qty ?? "",
    uom: params.uom ?? initialItem.purchase_unit ?? initialItem.base_unit,
    supplierId: params.supplier_id ?? initialItem.supplier_id ?? "",
    cost: String(initialItem.cost ?? 0),
    remarks: params.notes ?? "",
  } : undefined;
  const primaryAction = <SubmitButton type="submit" form="purchase-request-form" name="intent" value="submit" pendingLabel="Submitting..." className="w-full">Submit PR</SubmitButton>;
  const secondaryActions = <div className="grid gap-2"><SubmitButton type="submit" form="purchase-request-form" name="intent" value="draft" pendingLabel="Saving..." variant="outline" className="w-full">Save Draft</SubmitButton><Button asChild variant="ghost" className="w-full"><Link href="/purchase-requests">Cancel</Link></Button></div>;
  const workflowSteps = [
    { key: "draft", label: "Draft", description: "Request details and items can be edited." },
    { key: "manager_review", label: "Manager", description: "Manager reviews the operational need." },
    { key: "purchasing_review", label: "Purchasing", description: "Purchasing checks sourcing." },
    { key: "finance_review", label: "Finance", description: "Finance reviews the commitment." },
    { key: "ready_to_convert", label: "Ready", description: "The approved request can become a PO." },
  ];
  return (
      <DocumentWorkspace
        breadcrumbs={[{ label: "Purchase Requests", href: "/purchase-requests" }, { label: "New" }]}
        documentNo="New Purchase Request"
        title="Purchase Request"
        status="draft"
        branch={branches.find((branch) => branch.id === params.branch_id)?.branch_name}
        workflowSteps={workflowSteps}
        currentStatus="draft"
        mobilePrimaryAction={primaryAction}
        mobileMoreOptions={<DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions>}
        sidePanel={<>
            <DocumentActionSection moreOptions={secondaryActions}>{primaryAction}</DocumentActionSection>
            <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Add at least one item before submitting this purchase request.</p></DocumentSideSection>
            <DocumentSideSection title="Request Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Status</span><strong>Draft</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Number</span><strong>Auto</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Lines</span><strong>Review before submit</strong></div>
              </div>
            </DocumentSideSection>
          </>}
      >
        {params.error ? <Card><CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent></Card> : null}
        <PurchaseRequestForm
          items={items}
          suppliers={suppliers}
          branches={branches}
          initialBranchId={params.branch_id}
          initialLines={initialLine ? [initialLine] : undefined}
          initialRemarks={params.notes}
          canViewCommercial={canViewCommercial}
          action={createPurchaseRequest}
        />
      </DocumentWorkspace>
  );
}
