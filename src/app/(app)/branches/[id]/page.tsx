import { BranchForm } from "@/components/foundation-forms";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteBranch, restoreBranch, updateBranch } from "@/server/actions/foundation";
import { getBranch, getCompaniesForSelect } from "@/server/queries/foundation";
import { hasPermission } from "@/server/auth/permissions";
import { redirect } from "next/navigation";

export default async function EditBranchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  if (!(await hasPermission("branches.update"))) redirect("/branches");
  const messages = await searchParams;
  const [branch, companies] = await Promise.all([getBranch(id), getCompaniesForSelect()]);
  const lifecycleAction = branch.deleted_at ? (
    <form action={restoreBranch.bind(null, id)}><Button type="submit" className="w-full">Restore Branch</Button></form>
  ) : (
    <DangerConfirmForm action={deleteBranch.bind(null, id)} title="Deactivate this branch?" description="This hides the branch from active lists while preserving operational history." warning="This record may be linked to staff access, stock transactions, and operational documents." checkboxLabel="I understand this may affect future operations." confirmWord="DEACTIVATE" buttonLabel="Deactivate branch" pendingLabel="Deactivating..." />
  );
  return (
    <>
      <PageHeader title={branch.branch_name} description={`${branch.branch_code} · ${branch.branch_type.replaceAll("_", " ")}`} />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Branch Actions"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={branch.status} /></div><Button type="submit" form="branch-edit-form" className="w-full">Save Branch</Button><Button asChild variant="outline" className="w-full"><Link href="/branches">Back to Branches</Link></Button></RecordActionPanel><RecordActionPanel title="Lifecycle">{lifecycleAction}</RecordActionPanel><RecordActionPanel title="Metadata"><dl className="grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Created</dt><dd>{new Date(branch.created_at).toLocaleDateString("en-MY")}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Updated</dt><dd>{new Date(branch.updated_at).toLocaleDateString("en-MY")}</dd></div></dl></RecordActionPanel></>}>
        {messages.error || messages.success ? <Card><CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-emerald-700"}`}>{messages.error ?? messages.success}</CardContent></Card> : null}
        <BranchForm formId="branch-edit-form" branch={branch} companies={companies} action={updateBranch.bind(null, id)} showSubmit={false} />
      </RecordWorkspace>
    </>
  );
}
