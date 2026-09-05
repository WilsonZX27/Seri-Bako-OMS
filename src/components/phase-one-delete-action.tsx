import { DangerConfirmForm, BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { getPhaseOneDeletePreview } from "@/server/queries/hard-delete";
import { hardDeletePhaseOne } from "@/server/actions/hard-delete";
export async function PhaseOneDeleteAction({ recordType, recordId, label }: { recordType: string; recordId: string; label: string }) {
  const preview = await getPhaseOneDeletePreview(recordType, recordId).catch(() => null);
  const deps = preview ? Object.entries(preview.dependencies ?? {}).filter(([, count]) => Number(count) > 0).map(([key, count]) => `${key}: ${count}`).join("; ") : "Dependency preview unavailable.";
  return preview?.eligible ? <DangerConfirmForm action={hardDeletePhaseOne.bind(null, recordType, recordId)} title={`Permanently delete ${label}?`} description="This cannot be undone." checkboxLabel="I understand this record will be permanently deleted." confirmWord={preview.confirmation} triggerIcon="delete" buttonLabel="Delete permanently" pendingLabel="Deleting..." /> : <BlockedDestructiveAction buttonLabel={`Delete ${label}`} title={`Cannot delete ${label}`} description={preview?.reason ?? "Permanent deletion is unavailable for this record."} recommendation={deps} />;
}
