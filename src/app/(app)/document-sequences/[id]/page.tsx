import { DocumentSequenceForm } from "@/components/document-sequence-form";
import { documentTypeLabel } from "@/lib/document-types";
import { PageHeader } from "@/components/ui/page-header";
import { updateDocumentSequence } from "@/server/actions/foundation";
import { getCompaniesForSelect, getDocumentSequence } from "@/server/queries/foundation";

export default async function EditDocumentSequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sequence, companies] = await Promise.all([getDocumentSequence(id), getCompaniesForSelect()]);
  return <><PageHeader title={documentTypeLabel(sequence.document_type)} description="Update controlled monthly document numbering." /><div className="p-5"><DocumentSequenceForm sequence={sequence} companies={companies} action={updateDocumentSequence.bind(null, id)} /></div></>;
}
