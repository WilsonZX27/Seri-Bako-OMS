import { SupplierForm } from "@/components/supplier-form";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createSupplier } from "@/server/actions/suppliers";
import { formatPageError } from "@/server/actions/error-handling";

export default function NewSupplierPage() {
  try {
    return (
      <>
        <PageHeader title="New Supplier" description="Create a supplier master record." />
        <RecordWorkspace actionPanel={<RecordActionPanel title="Supplier Actions" description="Create this supplier master record for future purchasing use."><SubmitButton type="submit" form="supplier-create-form" className="w-full" pendingLabel="Creating..." data-mobile-primary-action>Create Supplier</SubmitButton><Button asChild variant="outline" className="w-full"><Link href="/suppliers">Cancel</Link></Button></RecordActionPanel>}>
          <SupplierForm formId="supplier-create-form" action={createSupplier} showSubmit={false} />
        </RecordWorkspace>
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="New Supplier" description="Create a supplier master record." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              {formatPageError(error, "The supplier form could not load right now. Please try again shortly.")}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
}
