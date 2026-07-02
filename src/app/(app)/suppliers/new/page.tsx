import { SupplierForm } from "@/components/supplier-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createSupplier } from "@/server/actions/suppliers";
import { formatPageError } from "@/server/actions/error-handling";

export default function NewSupplierPage() {
  try {
    return (
      <>
        <PageHeader title="New Supplier" description="Create a supplier master record." />
        <div className="p-5">
          <SupplierForm action={createSupplier} />
        </div>
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
