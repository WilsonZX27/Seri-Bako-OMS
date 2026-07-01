import { DocumentSequenceForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateDocumentSequence } from "@/server/actions/foundation";
import { getCompaniesForSelect, getDocumentSequence } from "@/server/queries/foundation";

export default async function EditDocumentSequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sequence, companies] = await Promise.all([getDocumentSequence(id), getCompaniesForSelect()]);
  return (
    <>
      <PageHeader title="Edit Document Sequence" description="Update prefix, padding, current number, and reset rule." />
      <div className="p-5"><DocumentSequenceForm sequence={sequence} companies={companies} action={updateDocumentSequence.bind(null, id)} /></div>
    </>
  );
}
