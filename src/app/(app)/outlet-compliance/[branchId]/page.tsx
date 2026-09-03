import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/system-states";
import { getPermissionMap } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";
import { createComplianceRecord, revokeComplianceRecord } from "@/server/actions/compliance";
import { getOutletComplianceWorkspace } from "@/server/queries/compliance";

const meta: Record<string, { label: string; variant: "success" | "warning" | "danger" | "secondary" }> = {
  missing: { label: "Missing", variant: "danger" }, valid: { label: "Current", variant: "success" },
  due_7: { label: "Expiring", variant: "danger" }, due_30: { label: "Expiring", variant: "warning" },
  due_60: { label: "Expiring", variant: "warning" }, due_90: { label: "Expiring", variant: "secondary" },
  expired: { label: "Expired", variant: "danger" }, uploaded: { label: "Current", variant: "success" },
};

export default async function OutletChecklistPage({ params, searchParams }: { params: Promise<{ branchId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ branchId }, message] = await Promise.all([params, searchParams]);
  let workspace: Awaited<ReturnType<typeof getOutletComplianceWorkspace>>;
  let permissions: Awaited<ReturnType<typeof getPermissionMap>>;
  try {
    [workspace, permissions] = await Promise.all([getOutletComplianceWorkspace(branchId), getPermissionMap(["outlet_compliance.upload"])]);
  } catch (error) {
    logServerError(error, { source: "page.outletCompliance.detail", branchId });
    return <><PageHeader title="Outlet Compliance" description="Required licences and operating documents." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" hideMobileConsole hideDesktopConsole><Notice tone="warning" title="Checklist temporarily unavailable">We could not verify this outlet checklist. Saved records are unchanged.<span className="mt-2 flex gap-3"><Link className="font-semibold underline" href={`/outlet-compliance/${branchId}`}>Retry</Link><Link className="font-semibold underline" href="/outlet-compliance">Back to outlet register</Link></span></Notice></WorkspaceGrid></>;
  }
  const branch = workspace.branches.find((row) => row.id === branchId);
  if (!branch) notFound();
  const rows = workspace.requirements.filter((row) => row.branch_id === branchId);
  const current = rows.filter((row) => row.record && row.record.state !== "missing" && row.record.state !== "expired").length;
  const missing = rows.filter((row) => !row.record || row.record.state === "missing").length;
  const removable = permissions["outlet_compliance.upload"] ? rows.filter((row) => row.record) : [];
  const rail = <><ConsoleSection title="Actions" kind="action"><Button asChild size="sm" variant="outline" className="w-full"><Link href="/outlet-calendar">Open calendar</Link></Button>{removable.map((row) => <form key={row.record!.id} action={revokeComplianceRecord}><input type="hidden" name="record_id" value={row.record!.id}/><Button type="submit" size="sm" variant="outline" className="w-full">Remove {row.type?.type_name ?? "document"}</Button></form>)}</ConsoleSection><ConsoleSection title="Checklist" kind="status"><dl className="divide-y divide-[var(--sb-border-soft)]"><Fact label="Current" value={`${current}/${rows.length}`}/><Fact label="Missing" value={missing}/></dl></ConsoleSection><ConsoleSection title="File access" kind="reference"><p className="text-muted-foreground">Documents become current immediately after upload. Replace or remove them from the matching checklist item.</p></ConsoleSection></>;
  return <><PageHeader title={branch.branch_name} description="Required licences and operating documents." backHref="/outlet-compliance" contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" rightRail={rail} tabletRailBreakpoint="lg">
    {message.error || message.success ? <div role="status" className={`rounded-[var(--sb-panel-radius)] border px-3 py-2 text-sm ${message.error ? "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" : "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]"}`}>{message.error ?? message.success}</div> : null}
    <section aria-labelledby="checklist-title"><div className="mb-3"><h2 id="checklist-title" className="text-sm font-semibold">Outlet checklist</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Open an item to upload, replace or remove its current document.</p></div><div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((row) => { const display = meta[row.record?.state ?? "missing"] ?? meta.missing; const canUpload = permissions["outlet_compliance.upload"]; return <details key={row.id} className="group overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)]"><summary className="flex min-h-32 cursor-pointer list-none flex-col justify-between gap-4 p-4 hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]"><span className="flex items-start justify-between gap-3"><strong className="text-sm leading-5">{row.type?.type_name ?? "Required document"}</strong><Badge variant={display.variant}>{display.label}</Badge></span><span><span className="block text-[11px] leading-4 text-muted-foreground">{row.record?.expires_on ? `Expires ${row.record.expires_on}` : row.waiver_reason ? `Waived: ${row.waiver_reason}` : "Expiry not recorded · Document required"}</span>{canUpload ? <span className="mt-3 inline-flex text-xs font-semibold text-[var(--sb-link)] group-open:hidden">{row.record ? "Replace document" : "Upload document"}</span> : null}<span className="mt-3 hidden text-xs font-semibold text-[var(--sb-link)] group-open:inline">Close details</span></span></summary>{canUpload ? <div className="border-t bg-[var(--sb-surface-muted)] p-3"><form action={createComplianceRecord} className="space-y-3"><input type="hidden" name="compliance_type_id" value={row.compliance_type_id}/><input type="hidden" name="subject_kind" value="outlet"/><input type="hidden" name="branch_id" value={branch.id}/><input type="hidden" name="staff_id" value=""/><input type="hidden" name="responsible_staff_id" value=""/><input type="hidden" name="subject_label" value={branch.branch_name}/><FormField label="Reference / certificate number"><input name="reference_no" defaultValue={row.record?.reference_no ?? ""} className={controlClass} placeholder="Document number"/></FormField><div className="grid gap-3"><FormField label="Issued / inspected on"><input name="issued_on" type="date" defaultValue={row.record?.issued_on ?? ""} required className={controlClass}/></FormField><FormField label="Expires / next inspection"><input name="expires_on" type="date" defaultValue={row.record?.expires_on ?? ""} required className={controlClass}/></FormField></div><FormField label="Notes"><input name="notes" defaultValue={row.record?.notes ?? ""} className={controlClass} placeholder="Issuer, coverage or renewal note"/></FormField><label className="block min-w-0 text-xs font-medium">Document file<span className="mt-1 block text-[11px] font-normal leading-4 text-muted-foreground">PDF, PNG, JPEG or WebP, up to 10 MB.</span><input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="mt-2 block w-full text-xs file:mr-2 file:min-h-9 file:rounded-[2px] file:border file:bg-white file:px-3"/></label><Button className="w-full" size="sm" type="submit">{row.record ? "Replace document" : "Upload document"}</Button></form></div> : null}</details>; })}</div>{!rows.length ? <EmptyState title="Checklist not initialised" description="Add the required outlet document types first."/> : null}</section>
  </WorkspaceGrid></>;
}

function Fact({ label, value }: { label: string; value: string | number }) { return <div className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>; }
const controlClass = "mt-1 h-[var(--sb-control-height)] w-full rounded-[var(--sb-radius-control)] border bg-white px-3 text-sm";
function FormField({ label, children }: { label: string; children: ReactNode }) { return <label className="min-w-0 text-xs font-medium">{label}{children}</label>; }
