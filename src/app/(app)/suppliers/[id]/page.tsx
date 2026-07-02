import { SupplierForm } from "@/components/supplier-form";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { deleteSupplier, updateSupplier } from "@/server/actions/suppliers";
import { getSupplier } from "@/server/queries/suppliers";

export default async function EditSupplierPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const supplier = await getSupplier(id);

  return (
    <>
      <PageHeader title="Edit Supplier" description={supplier.name} />
      <div className="space-y-4 p-5">
        {messages.error || messages.success ? <Card><CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-emerald-700"}`}>{messages.error ?? messages.success}</CardContent></Card> : null}
        <SupplierForm supplier={supplier} action={updateSupplier.bind(null, id)} />
        <DangerConfirmForm
          action={deleteSupplier.bind(null, id)}
          title="Deactivate this supplier?"
          description="This will hide the record from active lists. Existing documents and stock history will remain linked."
          warning="This record may be linked to supplier items, purchase orders, and existing receiving history."
          checkboxLabel="I understand this does not delete history and may affect future operations."
          confirmWord="DEACTIVATE"
          buttonLabel="Deactivate supplier"
          pendingLabel="Deactivating..."
        />
      </div>
    </>
  );
}
