import { BranchForm } from "@/components/foundation-forms";
import { BranchSupplyRouteForm } from "@/components/branch-supply-route-form";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import { deleteBranch, restoreBranch, updateBranch, updateBranchSupplyRoutes } from "@/server/actions/foundation";
import { getBranch, getBranchSupplyRouteContext, getCompaniesForSelect } from "@/server/queries/foundation";
import { detailOrNotFound } from "@/server/queries/detail";
import { hasPermission } from "@/server/auth/permissions";
import { redirect } from "next/navigation";

export default async function EditBranchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  if (!(await hasPermission("branches.update"))) redirect("/branches");
  const messages = await searchParams;
  const [branch, companies, supplyRouteContext] = await Promise.all([detailOrNotFound(getBranch(id)), getCompaniesForSelect(), getBranchSupplyRouteContext()]);
  const lifecycleAction = branch.deleted_at ? (
    <form action={restoreBranch.bind(null, id)}><SubmitButton type="submit" className="w-full" pendingLabel="Restoring...">Restore Branch</SubmitButton></form>
  ) : (
    <DangerConfirmForm action={deleteBranch.bind(null, id)} title="Deactivate this branch?" description="This hides the branch from active lists while preserving operational history." warning="This record may be linked to staff access, stock transactions, and operational documents." checkboxLabel="I understand this may affect future operations." confirmWord="DEACTIVATE" buttonLabel="Deactivate branch" pendingLabel="Deactivating..." />
  );
  return (
    <>
      <PageHeader title={branch.branch_name} description={`${branch.branch_code} · ${branch.branch_type.replaceAll("_", " ")}`} />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Branch Actions"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={branch.status} /></div><SubmitButton type="submit" form="branch-edit-form" className="w-full" pendingLabel="Saving..." data-mobile-primary-action>Save Branch</SubmitButton><Button asChild variant="outline" className="w-full"><Link href="/branches">Back to Branches</Link></Button></RecordActionPanel><RecordActionPanel title="Lifecycle">{lifecycleAction}</RecordActionPanel><RecordActionPanel title="Metadata"><dl className="grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Created</dt><dd>{formatDateTime(branch.created_at).slice(0, 10)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Updated</dt><dd>{formatDateTime(branch.updated_at).slice(0, 10)}</dd></div></dl></RecordActionPanel></>}>
        {messages.error || messages.success ? <Card><CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>{messages.error ?? messages.success}</CardContent></Card> : null}
        <BranchForm formId="branch-edit-form" branch={branch} companies={companies} action={updateBranch.bind(null, id)} showSubmit={false} />
        <BranchSupplyRouteForm branch={branch} context={supplyRouteContext} action={updateBranchSupplyRoutes.bind(null, id)} />
      </RecordWorkspace>
    </>
  );
}
