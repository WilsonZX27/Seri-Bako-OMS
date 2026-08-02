import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { DocumentActionBar, DocumentActionForm, DocumentActionLink } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateOnly, formatDateTime, formatNumber } from "@/lib/utils";
import { approveProductionJob, cancelProductionJob, postProductionJob, rejectProductionJob, submitProductionJob } from "@/server/actions/production-jobs";
import { getPermissionMap } from "@/server/auth/permissions";
import { getDocumentBundle } from "@/server/queries/documents";
import { getProductionJob, ProductionJobNotFoundError } from "@/server/queries/production-jobs";

const productionSteps = [
  { key: "draft", label: "Draft", description: "Prepared with no stock impact." },
  { key: "submitted", label: "Submitted", description: "Waiting for production approval." },
  { key: "approved", label: "Approved", description: "Ready to post stock movement." },
  { key: "posted", label: "Posted", description: "Ingredients and output are in the Movement Ledger." },
];

export default async function ProductionJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  const detail = await getProductionJob(id).catch((error: unknown) => {
    if (error instanceof ProductionJobNotFoundError) notFound();
    throw error;
  });
  const [{ job, ingredientLines, outputLines }, permissions] = await Promise.all([
    Promise.resolve(detail),
    getPermissionMap(["production.submit", "production.approve", "production.post", "production.cancel", "production.reject"]),
  ]);
  const documentBundle = job.document_id ? await getDocumentBundle(job.document_id) : null;
  const totalIngredientCost = ingredientLines.reduce((sum, line) => sum + Number(line.line_cost), 0);
  const outputQty = outputLines.reduce((sum, line) => sum + Number(line.actual_qty ?? line.planned_qty), 0);
  const hasShortage = ingredientLines.some((line) => line.stock_available_qty != null && Number(line.stock_available_qty) < Number(line.actual_qty ?? line.required_qty));
  const canSubmit = job.status === "draft" && permissions["production.submit"];
  const canApprove = job.status === "submitted" && permissions["production.approve"];
  const canPost = job.status === "approved" && permissions["production.post"];
  const canCancel = ["draft", "submitted", "approved"].includes(job.status) && permissions["production.cancel"];
  const canReject = ["submitted", "approved"].includes(job.status) && permissions["production.reject"];
  const hasPrimaryAction = canSubmit || canApprove || canPost;
  const deleteControl = <BlockedDestructiveAction buttonLabel="Delete production job" title={`Cannot delete ${job.production_job_no}`} description={job.status === "posted" ? "This job has posted material consumption and output movements." : "Production jobs retain their approval and material history."} recommendation={job.status === "posted" ? "Use a controlled stock correction; physical deletion is prohibited." : "Cancel or reject the job through its current workflow."} />;
  const secondaryActions = canReject || canCancel ? <div className="space-y-2">{canReject ? <form action={rejectProductionJob.bind(null, job.id)} className="space-y-2"><Input name="remarks" placeholder="Rejection remarks required" required /><SubmitButton type="submit" pendingLabel="Rejecting..." variant="destructive" className="w-full">Reject Production Job</SubmitButton></form> : null}{canCancel ? <DocumentActionForm action={cancelProductionJob.bind(null, job.id)} pendingLabel="Cancelling..." variant="outline" className="text-destructive hover:text-destructive">Cancel Production Job</DocumentActionForm> : null}{deleteControl}</div> : deleteControl;
  const mobilePrimaryAction = canSubmit ? <DocumentActionForm action={submitProductionJob.bind(null, job.id)} pendingLabel="Submitting...">Submit Production Job</DocumentActionForm> : canApprove ? <ConfirmActionForm action={approveProductionJob.bind(null, job.id)} label="Approve as Manager" title="Approve this production job as Manager?" description="This makes the production job ready to post to stock." pendingLabel="Approving..." mobilePrimary /> : canPost ? <DocumentActionForm action={postProductionJob.bind(null, job.id)} pendingLabel="Posting...">Post Production to Stock</DocumentActionForm> : null;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Production", href: "/production" }, { label: "Production Jobs", href: "/production/jobs" }, { label: job.production_job_no }]}
      documentNo={job.production_job_no}
      title="Production Job"
      status={job.status}
      priority={job.priority}
      branch={job.branch_name}
      workflowSteps={productionSteps}
      currentStatus={job.status}
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /></> : null}
      mobileMoreOptions={<DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions>}
      sidePanel={
        <>
          <DocumentActionSection description="Only valid next workflow actions are shown." moreOptions={secondaryActions}>
            <DocumentActionBar>
              {canSubmit ? <DocumentActionForm action={submitProductionJob.bind(null, job.id)} pendingLabel="Submitting...">Submit Production Job</DocumentActionForm> : null}
              {canApprove ? <ConfirmActionForm action={approveProductionJob.bind(null, job.id)} label="Approve as Manager" title="Approve this production job as Manager?" description="This makes the production job ready to post to stock." pendingLabel="Approving..." mobilePrimary /> : null}
              {canPost ? <DocumentActionForm action={postProductionJob.bind(null, job.id)} pendingLabel="Posting...">Post Production to Stock</DocumentActionForm> : null}
            </DocumentActionBar>
            {!hasPrimaryAction ? <p className="text-sm text-muted-foreground">You can view this production job, but there is no workflow action available for your role or this status.</p> : null}
          </DocumentActionSection>
          <DocumentSideSection title="Validation / Next Step">{job.stock_transaction_id ? <DocumentActionLink href={`/stock-transactions/${job.stock_transaction_id}`} variant="outline">View Stock Movement</DocumentActionLink> : null}<p className="text-xs text-muted-foreground">{job.status === "draft" ? "Check recipe, output, and ingredient quantities before submission." : job.status === "submitted" ? "Manager approval is required before stock posting." : job.status === "approved" ? "Posting rechecks stock and creates the audited movement." : "Posted production is read-only."}</p></DocumentSideSection>
          {hasShortage && job.status !== "posted" ? (
            <DocumentSideSection title="Ingredient Warning">
              <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Some ingredient lines were short when this draft was created. Posting rechecks stock.
              </div>
            </DocumentSideSection>
          ) : null}
          {documentBundle ? (
            <>
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : null}
          <DocumentSideSection title="Metadata">
            <dl className="grid gap-2 text-xs">
              <div><dt className="text-muted-foreground">Created by</dt><dd className="font-medium">{job.created_by_name ?? "-"}</dd></div>
              <div><dt className="text-muted-foreground">Created</dt><dd className="font-medium">{formatDateTime(job.created_at)}</dd></div>
              <div><dt className="text-muted-foreground">Updated</dt><dd className="font-medium">{formatDateTime(job.updated_at)}</dd></div>
              <div><dt className="text-muted-foreground">Branch</dt><dd className="font-medium">{job.branch_name ?? "-"}</dd></div>
            </dl>
          </DocumentSideSection>
        </>
      }
    >
      {messages.error || messages.success ? (
        <Card>
          <CardContent className={`p-4 text-sm ${messages.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>
            {messages.error ?? messages.success}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Production Summary</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs uppercase text-muted-foreground">Production Date</p><p className="font-medium">{formatDateOnly(job.production_date)}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{job.branch_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Recipe</p><p className="font-medium">{job.recipe_no ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Output</p><p className="font-medium">{job.product_name ?? outputLines[0]?.output_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Planned Qty</p><p className="font-medium">{formatNumber(job.planned_output_qty)} {job.output_uom}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Actual Qty</p><p className="font-medium">{job.actual_output_qty != null ? `${formatNumber(job.actual_output_qty)} ${job.output_uom ?? ""}` : "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Created By</p><p className="font-medium">{job.created_by_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Ingredient Cost</p><p className="font-medium">{formatCurrency(totalIngredientCost)}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Cost / Output</p><p className="font-medium">{formatCurrency(outputQty > 0 ? totalIngredientCost / outputQty : 0)}</p></div>
          </div>
          {job.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{job.remarks}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ingredient Consumption</h2>
            <p className="text-sm font-semibold">{formatCurrency(totalIngredientCost)}</p>
          </div>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Required</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Line Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredientLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell><p className="font-medium">{line.item_name}</p><p className="text-xs text-muted-foreground">{line.item_code}</p></TableCell>
                    <TableCell className="text-right">{formatNumber(line.required_qty)}</TableCell>
                    <TableCell className="text-right">{line.actual_qty != null ? formatNumber(line.actual_qty) : "-"}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell className="text-right">{line.stock_available_qty == null ? "-" : formatNumber(line.stock_available_qty)}</TableCell>
                    <TableCell className="text-right">{line.variance_qty == null ? "-" : formatNumber(line.variance_qty)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.line_cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Output Lines</h2>
            <p className="text-sm font-semibold">{formatCurrency(outputLines.reduce((sum, line) => sum + line.line_cost, 0))}</p>
          </div>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Output</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Line Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outputLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell><p className="font-medium">{line.output_name}</p><p className="text-xs text-muted-foreground">{line.output_code}</p></TableCell>
                    <TableCell className="text-right">{formatNumber(line.planned_qty)}</TableCell>
                    <TableCell className="text-right">{line.actual_qty != null ? formatNumber(line.actual_qty) : "-"}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.line_cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </CardContent>
      </Card>

    </DocumentWorkspace>
  );
}
