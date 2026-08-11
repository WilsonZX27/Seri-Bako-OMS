import Link from "next/link";
import { ArrowLeft, Save, Send } from "lucide-react";
import { PurchaseRequestForm } from "@/components/procurement-forms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { createPurchaseRequest } from "@/server/actions/procurement";
import { hasPermission } from "@/server/auth/permissions";
import { getBranchesForSelect, getBranchSupplierMappingsForSelect, getCurrentProfile, getItemsForSelect } from "@/server/queries/common";

export default async function NewPurchaseRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [items, supplierMappings, branches, hasCommercialAccess, profile] = await Promise.all([
    getItemsForSelect(),
    getBranchSupplierMappingsForSelect(),
    getBranchesForSelect({ restrictToActorScope: true }),
    hasPermission("pr.view_all"),
    getCurrentProfile(),
  ]);
  const canViewCommercial = hasCommercialAccess && !["kitchen", "kitchen_staff"].includes(String(profile?.role_code ?? "").toLowerCase());
  const selectedBranchId = params.branch_id && branches.some((branch) => branch.id === params.branch_id) ? params.branch_id : branches[0]?.id;
  const initialItem = params.item_id ? items.find((item) => item.id === params.item_id) : null;
  const initialMappings = initialItem && selectedBranchId ? supplierMappings.filter((mapping) => mapping.item_id === initialItem.id && mapping.branch_id === selectedBranchId) : [];
  const initialMapping = initialMappings.find((mapping) => mapping.is_preferred) ?? (initialMappings.length === 1 ? initialMappings[0] : null);
  const initialLine = initialItem ? {
    itemId: initialItem.id,
    itemSearch: `${initialItem.item_code} - ${initialItem.item_name}`,
    qty: params.qty ?? "",
    uom: params.uom ?? initialItem.purchase_unit ?? initialItem.base_unit,
    supplierId: initialMappings.some((mapping) => mapping.supplier_id === params.supplier_id) ? params.supplier_id ?? "" : initialMapping?.supplier_id ?? "",
    cost: String(initialMapping?.unit_cost ?? initialItem.cost ?? 0),
    remarks: params.notes ?? "",
  } : undefined;
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const primaryAction = <SubmitButton type="submit" form="purchase-request-form" name="intent" value="submit" pendingLabel="Submitting..." className="w-full"><Send className="size-4" />Submit PR</SubmitButton>;
  const secondaryActions = <div className="grid gap-1"><SubmitButton type="submit" form="purchase-request-form" name="intent" value="draft" pendingLabel="Saving..." variant="ghost" className="sb-action-row"><Save className="size-4" />Save Draft</SubmitButton><Button asChild variant="ghost" className="sb-action-row"><Link href="/purchase-requests"><ArrowLeft className="h-4 w-4" />Back to purchase requests</Link></Button></div>;
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
        branch={selectedBranch?.branch_name}
        mobileStatusOnly
        workflowSteps={workflowSteps}
        currentStatus="draft"
        tabletRailMode="split"
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
          supplierMappings={supplierMappings}
          branches={branches}
          initialBranchId={selectedBranchId}
          initialLines={initialLine ? [initialLine] : undefined}
          initialRemarks={params.notes}
          canViewCommercial={canViewCommercial}
          action={createPurchaseRequest}
        />
      </DocumentWorkspace>
  );
}
