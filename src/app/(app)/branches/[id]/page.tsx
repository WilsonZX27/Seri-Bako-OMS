import { BranchForm } from "@/components/foundation-forms";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { deleteBranch, updateBranch } from "@/server/actions/foundation";
import { getBranch, getCompaniesForSelect } from "@/server/queries/foundation";

export default async function EditBranchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const messages = await searchParams;
  const [branch, companies] = await Promise.all([getBranch(id), getCompaniesForSelect()]);
  return (
    <>
      <PageHeader title="Edit Branch" description="Update branch details and status." />
      <div className="space-y-4 p-5">
        {messages.error || messages.success ? <Card><CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-emerald-700"}`}>{messages.error ?? messages.success}</CardContent></Card> : null}
        <BranchForm branch={branch} companies={companies} action={updateBranch.bind(null, id)} />
        <DangerConfirmForm
          action={deleteBranch.bind(null, id)}
          title="Deactivate this branch?"
          description="This will hide the record from active lists. Existing documents and stock history will remain linked."
          warning="This record may be linked to staff access, stock transactions, and operational documents."
          checkboxLabel="I understand this does not delete history and may affect future operations."
          confirmWord="DEACTIVATE"
          buttonLabel="Deactivate branch"
          pendingLabel="Deactivating..."
        />
      </div>
    </>
  );
}
