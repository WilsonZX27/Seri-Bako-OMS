import { SupplierForm } from "@/components/supplier-form";
import { PageHeader } from "@/components/ui/page-header";
import { createSupplier } from "@/server/actions/suppliers";

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="New Supplier" description="Create a supplier master record." />
      <div className="p-5">
        <SupplierForm action={createSupplier} />
      </div>
    </>
  );
}
