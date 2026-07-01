import { BranchForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateBranch } from "@/server/actions/foundation";
import { getBranch, getCompaniesForSelect } from "@/server/queries/foundation";

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [branch, companies] = await Promise.all([getBranch(id), getCompaniesForSelect()]);
  return (
    <>
      <PageHeader title="Edit Branch" description="Update branch details and status." />
      <div className="p-5"><BranchForm branch={branch} companies={companies} action={updateBranch.bind(null, id)} /></div>
    </>
  );
}
