import { ItemForm } from "@/components/item-form";
import { SubmitButton } from "@/components/ui/submit-button";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createItem } from "@/server/actions/items";
import { formatPageError } from "@/server/actions/error-handling";
import { getBranchesForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { hasPermission } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  try {
    const [suppliers, branches, canCreateSupplier, canCreateSourcing] = await Promise.all([
      getSuppliersForSelect(),
      getBranchesForSelect({ restrictToActorScope: true }),
      hasPermission("suppliers.create"),
      hasPermission("supplier_items.create"),
    ]);

    return (
      <>
        <PageHeader title="New Item" description="Create an ingredient or packaging item." />
        <RecordWorkspace actionPanel={<RecordActionPanel title="Primary Action" description="Creating an item changes master data only; stock remains ledger-controlled."><SubmitButton type="submit" form="item-create-form" className="w-full" pendingLabel="Creating..." data-mobile-primary-action>Create Item</SubmitButton><Button asChild variant="outline" className="w-full"><Link href="/items">Cancel</Link></Button></RecordActionPanel>}>
          <ItemForm formId="item-create-form" suppliers={suppliers} branches={branches} action={createItem} showSubmit={false} canCreateSupplier={canCreateSupplier} canCreateSourcing={canCreateSourcing} />
        </RecordWorkspace>
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="New Item" description="Create an ingredient or packaging item." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              {formatPageError(error, "The item form could not load right now. Please try again shortly.")}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
}
