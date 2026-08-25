import { DocumentSequenceForm } from "@/components/document-sequence-form";
import { documentTypeLabel } from "@/lib/document-types";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateDocumentSequence } from "@/server/actions/foundation";
import { getCompaniesForSelect, getDocumentSequence } from "@/server/queries/foundation";
import { detailOrNotFound } from "@/server/queries/detail";

export default async function EditDocumentSequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sequence, companies] = await Promise.all([detailOrNotFound(getDocumentSequence(id)), getCompaniesForSelect()]);
  const formId = "document-sequence-edit-form";
  return <><PageHeader title={documentTypeLabel(sequence.document_type)} description="Update controlled monthly document numbering." /><RecordWorkspace actionPanel={<RecordActionPanel title="Sequence Actions" description="Save changes to the controlled monthly document counter."><SubmitButton type="submit" form={formId} className="w-full" pendingLabel="Saving..." showOverlay overlayLabel="Saving document sequence..." data-mobile-primary-action>Save sequence</SubmitButton></RecordActionPanel>}><DocumentSequenceForm formId={formId} showSubmit={false} sequence={sequence} companies={companies} action={updateDocumentSequence.bind(null, id)} /></RecordWorkspace></>;
}
