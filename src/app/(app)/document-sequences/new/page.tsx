import { DocumentSequenceForm } from "@/components/document-sequence-form";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { SubmitButton } from "@/components/ui/submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { createDocumentSequence } from "@/server/actions/foundation";
import { getCompaniesForSelect } from "@/server/queries/foundation";

export default async function NewDocumentSequencePage() {
  const companies = await getCompaniesForSelect();
  const formId = "document-sequence-create-form";
  return <><PageHeader title="New Document Sequence" description="Create controlled monthly numbering for an operational document type." /><RecordWorkspace actionPanel={<RecordActionPanel title="Sequence Actions" description="Create the controlled monthly document counter."><SubmitButton type="submit" form={formId} className="w-full" pendingLabel="Creating..." showOverlay overlayLabel="Creating document sequence..." data-mobile-primary-action>Create sequence</SubmitButton></RecordActionPanel>}><DocumentSequenceForm formId={formId} showSubmit={false} companies={companies} action={createDocumentSequence} /></RecordWorkspace></>;
}
