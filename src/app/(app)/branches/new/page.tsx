import { BranchForm } from "@/components/foundation-forms";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { createBranch } from "@/server/actions/foundation";
import { getCompaniesForSelect } from "@/server/queries/foundation";

export default async function NewBranchPage() {
  const companies = await getCompaniesForSelect();
  return (
    <>
      <PageHeader title="New Branch" description="Create a central kitchen, outlet, event booth, office, or other operating unit." />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Branch Actions" description="Create an operating unit. Stock remains controlled by ledger movements."><Button type="submit" form="branch-create-form" className="w-full">Create Branch</Button><Button asChild variant="outline" className="w-full"><Link href="/branches">Cancel</Link></Button></RecordActionPanel>}><BranchForm formId="branch-create-form" companies={companies} action={createBranch} showSubmit={false} /></RecordWorkspace>
    </>
  );
}
