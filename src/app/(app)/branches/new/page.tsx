import { BranchForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createBranch } from "@/server/actions/foundation";
import { getCompaniesForSelect } from "@/server/queries/foundation";

export default async function NewBranchPage() {
  const companies = await getCompaniesForSelect();
  return (
    <>
      <PageHeader title="New Branch" description="Create a central kitchen, outlet, event booth, office, or other operating unit." />
      <div className="p-5"><BranchForm companies={companies} action={createBranch} /></div>
    </>
  );
}
