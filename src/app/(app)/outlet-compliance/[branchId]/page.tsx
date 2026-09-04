import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, Eye, FileText } from "lucide-react";
import { ComplianceAttachmentUpload } from "@/components/compliance-attachment-upload";
import { ComplianceFileInput } from "@/components/compliance-file-input";
import { AttachmentRemoveAction } from "@/components/documents/attachment-remove-action";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/system-states";
import { formatDateTime } from "@/lib/utils";
import { getPermissionMap } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";
import { addOutletComplianceAttachment, archiveOutletComplianceAttachment, createComplianceRecord, updateOutletComplianceDetails } from "@/server/actions/compliance";
import { getOutletComplianceWorkspace } from "@/server/queries/compliance";

const meta: Record<string, { label: string; variant: "success" | "warning" | "danger" | "secondary" }> = {
  missing: { label: "Missing", variant: "secondary" }, valid: { label: "Current", variant: "success" },
  due_7: { label: "Expiring", variant: "warning" }, due_30: { label: "Expiring", variant: "warning" },
  due_60: { label: "Expiring", variant: "warning" }, due_90: { label: "Expiring", variant: "warning" },
  expired: { label: "Expired", variant: "danger" }, uploaded: { label: "Current", variant: "success" },
};

export default async function OutletChecklistPage({ params, searchParams }: { params: Promise<{ branchId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ branchId }, message] = await Promise.all([params, searchParams]);
  let workspace: Awaited<ReturnType<typeof getOutletComplianceWorkspace>>;
  let permissions: Awaited<ReturnType<typeof getPermissionMap>>;
  try {
    [workspace, permissions] = await Promise.all([getOutletComplianceWorkspace(branchId), getPermissionMap(["outlet_compliance.upload", "outlet_compliance.document.read"])]);
  } catch (error) {
    logServerError(error, { source: "page.outletCompliance.detail", branchId });
    return <><PageHeader title="Compliance" description="Required licences and operating documents." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" hideMobileConsole hideDesktopConsole><Notice tone="warning" title="Checklist temporarily unavailable">We could not verify this checklist. Saved records are unchanged.<span className="mt-2 flex gap-3"><Link className="font-semibold underline" href={`/outlet-compliance/${branchId}`}>Retry</Link><Link className="font-semibold underline" href="/outlet-compliance">Compliance register</Link></span></Notice></WorkspaceGrid></>;
  }
  const branch = workspace.branches.find((row) => row.id === branchId);
  if (!branch) notFound();
  const rows = workspace.requirements.filter((row) => row.branch_id === branchId);
  const current = rows.filter((row) => row.record && !["missing", "expired"].includes(row.record.state)).length;
  const missing = rows.filter((row) => !row.record || row.record.state === "missing").length;
  const canUpload = permissions["outlet_compliance.upload"];
  const canRead = permissions["outlet_compliance.document.read"];
  const rail = <><ConsoleSection title="Actions" kind="action"><Button asChild size="sm" variant="outline" className="w-full"><Link href="/outlet-calendar">Open calendar</Link></Button></ConsoleSection><ConsoleSection title="Checklist" kind="status"><dl className="divide-y divide-[var(--sb-border-soft)]"><Fact label="Current" value={`${current}/${rows.length}`}/><Fact label="Missing" value={missing}/></dl></ConsoleSection><ConsoleSection title="File access" kind="reference"><p className="text-muted-foreground">Attachments remain with their matching requirement and audit history.</p></ConsoleSection></>;
  return <><PageHeader title={branch.branch_name} description="Required licences and operating documents." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" rightRail={rail} tabletRailBreakpoint="lg">
    {message.error || message.success ? <div role="status" className={`rounded-[var(--sb-panel-radius)] border px-3 py-2 text-sm ${message.error ? "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" : "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]"}`}>{message.error ?? message.success}</div> : null}
    <section aria-labelledby="checklist-title"><div className="mb-3"><h2 id="checklist-title" className="text-sm font-semibold">Compliance checklist</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Select a requirement to maintain its record and files.</p></div><div className="mx-auto grid max-w-5xl gap-2">{rows.map((row) => {
      const record = row.record;
      const display = meta[record?.state ?? "missing"] ?? meta.missing;
      return <details key={row.id} className="group overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)]">
        <summary className="grid min-h-14 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)] [&::-webkit-details-marker]:hidden">
          <span className="min-w-0"><strong className="block truncate text-sm leading-5">{row.type?.type_name ?? "Required document"}</strong>{record?.expires_on || row.waiver_reason ? <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{record?.expires_on ? `Expires ${record.expires_on}` : `Waived: ${row.waiver_reason}`}</span> : null}</span><Badge variant={display.variant}>{display.label}</Badge><ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true"/><span className="sr-only">Open requirement details</span>
        </summary>
        {canUpload ? <div className="grid items-start gap-3 border-t bg-[var(--sb-surface-muted)] p-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <section aria-label="Compliance details" className="rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-white p-3"><h3 className="mb-3 text-xs font-semibold">Compliance details</h3>
            <form action={record ? updateOutletComplianceDetails.bind(null, record.id) : createComplianceRecord} className="grid gap-3">
              {!record ? <><input type="hidden" name="compliance_type_id" value={row.compliance_type_id}/><input type="hidden" name="subject_kind" value="outlet"/><input type="hidden" name="branch_id" value={branch.id}/><input type="hidden" name="staff_id" value=""/><input type="hidden" name="responsible_staff_id" value=""/><input type="hidden" name="subject_label" value={branch.branch_name}/></> : null}
              <FormField label="Reference / certificate number"><input name="reference_no" defaultValue={record?.reference_no ?? ""} className={controlClass} placeholder="Document number"/></FormField>
              <div className="grid items-end gap-3 sm:grid-cols-2"><FormField label="Issued / inspected on"><input name="issued_on" type="date" defaultValue={record?.issued_on ?? ""} required className={controlClass}/></FormField><FormField label="Expires / next inspection"><input name="expires_on" type="date" defaultValue={record?.expires_on ?? ""} required className={controlClass}/></FormField></div>
              <FormField label="Notes"><input name="notes" defaultValue={record?.notes ?? ""} className={controlClass} placeholder="Issuer, coverage or renewal note"/></FormField>
              {!record ? <><FormField label="Attachment label"><input name="file_name" minLength={3} maxLength={180} required className={controlClass} placeholder="Name this attachment"/></FormField><FormField label="Attachment file"><ComplianceFileInput /></FormField></> : null}
              <SubmitButton size="sm" className="w-full justify-center" pendingLabel={record ? "Updating..." : "Uploading..."}>{record ? "Update" : "Upload"}</SubmitButton>
            </form>
          </section>
          {record ? <section aria-label="Attachments" className="rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-white p-3"><h3 className="mb-3 text-xs font-semibold">Attachments</h3><ComplianceAttachmentUpload action={addOutletComplianceAttachment.bind(null, record.id)}/><div className="mt-3 divide-y border-t border-[var(--sb-border-soft)]">{record.attachments.map((attachment) => <div key={attachment.id} className="flex min-w-0 items-start gap-2 py-3"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="break-words text-xs font-medium">{attachment.file_name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">Uploaded by {attachment.uploaded_by_name ?? "staff"} · {formatDateTime(attachment.created_at)}</p></div><div className="flex shrink-0 items-center gap-1">{canRead ? <Button asChild size="icon" variant="ghost" className="h-8 w-8"><a href={`/api/attachments/${attachment.id}`} target="_blank" rel="noreferrer" aria-label={`View ${attachment.file_name}`}><Eye className="h-4 w-4"/></a></Button> : null}<AttachmentRemoveAction action={archiveOutletComplianceAttachment.bind(null, record.id, attachment.id)} fileName={attachment.file_name}/></div></div>)}{!record.attachments.length ? <p className="py-3 text-xs text-muted-foreground">No attachments. This requirement is missing evidence.</p> : null}</div></section> : null}
        </div> : null}
      </details>;
    })}</div>{!rows.length ? <EmptyState title="Checklist not initialised" description="Add the required site document types first."/> : null}</section>
  </WorkspaceGrid></>;
}

function Fact({ label, value }: { label: string; value: string | number }) { return <div className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>; }
const controlClass = "mt-1 h-[var(--sb-control-height)] w-full rounded-[var(--sb-radius-control)] border bg-white px-3 text-sm";
function FormField({ label, children }: { label: string; children: ReactNode }) { return <label className="flex min-w-0 flex-col text-xs font-medium"><span className="min-h-4 leading-4">{label}</span>{children}</label>; }
