import { DocumentSequenceForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createDocumentSequence } from "@/server/actions/foundation";
import { getCompaniesForSelect } from "@/server/queries/foundation";

export default async function NewDocumentSequencePage() {
  const companies = await getCompaniesForSelect();
  return (
    <>
      <PageHeader title="New Document Sequence" description="Create a numbering rule for an operational document." />
      <div className="p-5"><DocumentSequenceForm companies={companies} action={createDocumentSequence} /></div>
    </>
  );
}
