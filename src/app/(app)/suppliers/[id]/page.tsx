import { SupplierForm } from "@/components/supplier-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateSupplier } from "@/server/actions/suppliers";
import { getSupplier } from "@/server/queries/suppliers";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await getSupplier(id);

  return (
    <>
      <PageHeader title="Edit Supplier" description={supplier.name} />
      <div className="p-5">
        <SupplierForm supplier={supplier} action={updateSupplier.bind(null, id)} />
      </div>
    </>
  );
}
