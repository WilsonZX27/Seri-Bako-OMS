import { SupplierForm } from "@/components/supplier-form";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateOnly } from "@/lib/utils";
import { deleteSupplier, restoreSupplier, updateSupplier } from "@/server/actions/suppliers";
import { getSupplier } from "@/server/queries/suppliers";
import { PhaseOneDeleteAction } from "@/components/phase-one-delete-action";
import { hasPermission } from "@/server/auth/permissions";

export default async function EditSupplierPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const [supplier, canUpdate] = await Promise.all([getSupplier(id), hasPermission("suppliers.update")]);
  const lifecycleAction = !canUpdate ? null : supplier.status === "inactive" ? (
    <form action={restoreSupplier.bind(null, id)}><SubmitButton type="submit" className="w-full" pendingLabel="Restoring...">Restore Supplier</SubmitButton></form>
  ) : (
    <><PhaseOneDeleteAction recordType="supplier" recordId={id} label="supplier" /><DangerConfirmForm action={deleteSupplier.bind(null, id)} title="Deactivate this supplier?" description="This hides the supplier from active lists while preserving purchasing history." warning="This record may be linked to supplier items, purchase orders, and receiving history." checkboxLabel="I understand this may affect future purchasing." confirmWord="DEACTIVATE" buttonLabel="Deactivate supplier" pendingLabel="Deactivating..." /></>
  );

  return (
    <>
      <PageHeader title={supplier.name} description={`${supplier.supplier_group ?? supplier.supplier_code ?? "No item group"} · Supplier master`} />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Supplier Actions"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={supplier.status} /></div>{canUpdate ? <SubmitButton type="submit" form="supplier-edit-form" className="w-full" pendingLabel="Saving..." data-mobile-primary-action>Save Supplier</SubmitButton> : null}<Button asChild variant="outline" className="w-full"><Link href="/suppliers">Back to Suppliers</Link></Button></RecordActionPanel><RecordActionPanel title="Items & branches" description="Maintain the supplier catalogue and the branches allowed to buy from it."><Button asChild variant="outline" className="w-full"><Link href={`/supplier-items/new?supplierId=${id}`}>Add item mapping</Link></Button><Button asChild variant="ghost" className="w-full"><Link href={`/supplier-items?search=${encodeURIComponent(supplier.supplier_code ?? supplier.name)}`}>View mappings</Link></Button></RecordActionPanel>{lifecycleAction ? <RecordActionPanel title="Lifecycle">{lifecycleAction}</RecordActionPanel> : null}<RecordActionPanel title="Metadata"><dl className="grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Created</dt><dd>{formatDateOnly(supplier.created_at)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Updated</dt><dd>{formatDateOnly(supplier.updated_at)}</dd></div></dl></RecordActionPanel></>}>
        {messages.error || messages.success ? <Card><CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>{messages.error ?? messages.success}</CardContent></Card> : null}
        <SupplierForm formId="supplier-edit-form" supplier={supplier} action={updateSupplier.bind(null, id)} showSubmit={false} />
      </RecordWorkspace>
    </>
  );
}
