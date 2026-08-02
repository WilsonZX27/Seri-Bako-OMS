import { UomConversionForm } from "@/components/master-data-forms";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteUomConversion, restoreUomConversion, updateUomConversion } from "@/server/actions/master-data";
import { getUomConversion } from "@/server/queries/master-data";

export default async function EditUomConversionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversion = await getUomConversion(id);
  const formId = "uom-conversion-edit-form";
  const lifecycleAction = conversion.deleted_at ? (
    <form action={restoreUomConversion.bind(null, id)}><SubmitButton type="submit" className="w-full" pendingLabel="Restoring...">Restore conversion</SubmitButton></form>
  ) : (
    <DangerConfirmForm action={deleteUomConversion.bind(null, id)} title="Archive this conversion?" description="This removes the conversion from active use while preserving history." warning="Existing transactions keep their recorded quantities and units." checkboxLabel="I understand this conversion will no longer be available for new records." confirmWord="ARCHIVE" buttonLabel="Archive conversion" pendingLabel="Archiving..." />
  );
  return (
    <>
      <PageHeader title="Edit UOM Conversion" description={`${conversion.from_uom} to ${conversion.to_uom}`} />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Conversion Actions" description="Save this reusable conversion factor."><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={conversion.status} /></div><SubmitButton type="submit" form={formId} className="w-full" pendingLabel="Saving..." data-mobile-primary-action>Save conversion</SubmitButton></RecordActionPanel><RecordActionPanel title="Lifecycle">{lifecycleAction}</RecordActionPanel></>}>
        <UomConversionForm formId={formId} showSubmit={false} conversion={conversion} action={updateUomConversion.bind(null, id)} />
      </RecordWorkspace>
    </>
  );
}
