import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { ActionErrorNotice } from "@/components/action-error-notice";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { DestructiveActionDialog } from "@/components/ui/destructive-action-dialog";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { sortProductsForDisplay } from "@/lib/product-order";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { saveOutletDailyRecord, voidOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getPermissionMap } from "@/server/auth/permissions";
import { getOutletDailyFormOptions, getOutletDailyRecord } from "@/server/queries/outlet-daily-records";
import { logServerError } from "@/server/observability/logger";
import { CheckCircle2, Save } from "lucide-react";

const dailySteps = [
  { key: "draft", label: "Qty Sent", description: "Central Kitchen records the quantity sent." },
  { key: "morning_recorded", label: "Outlet Entry", description: "Outlet Staff confirms received quantity and wastage." },
  { key: "evening_completed", label: "Posted", description: "The completed daily record is posted and remains editable by authorised staff." },
];

export default async function OutletDailyRecordDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const source = await Promise.all([
    getOutletDailyRecord(id),
    getOutletDailyFormOptions(),
    getPermissionMap(["outlet_daily_record.update", "outlet_daily_record.qty_sent", "outlet_daily_record.void"]),
  ]).catch((error) => {
    logServerError(error, { source: "page.outletDailyRecords.detail" });
    return null;
  });
  if (!source) return <>
    <PageHeader title="Outlet Daily Record" description="Morning receiving and evening wastage capture by outlet." />
    <WorkspaceGrid hideMobileConsole rightRail={<ConsoleSection title="Record status"><p className="text-xs text-muted-foreground">The record source could not be verified. No receipt or wastage totals are shown as zero.</p></ConsoleSection>}>
      <Card role="status"><CardContent className="p-5"><EmptyState title="Outlet daily record unavailable" description="The record could not be verified right now. Retry before editing or interpreting any quantity." action={{ href: `/outlet-daily-records/${encodeURIComponent(id)}`, label: "Retry record" }} /></CardContent></Card>
    </WorkspaceGrid>
  </>;
  const [{ record, lines }, options, permissions] = source;
  const productMap = new Map(options.products.map((product) => [product.id, product]));
  for (const line of lines) if (line.product) productMap.set(line.product.id, line.product);
  const products = sortProductsForDisplay([...productMap.values()]);
  const statusLocked = ["reviewed", "void"].includes(record.status);
  const canEditOutletValues = !statusLocked && permissions["outlet_daily_record.update"];
  const canEditQtySent = !statusLocked && permissions["outlet_daily_record.qty_sent"];
  const qtySentConfirmed = record.qty_sent_state === "confirmed";
  const outletCanComplete = canEditOutletValues && qtySentConfirmed;
  const locked = !canEditOutletValues && !canEditQtySent;
  const formId = "outlet-daily-record-form";
  const canVoid = record.status !== "void" && permissions["outlet_daily_record.void"];
  const nextStep = record.status === "draft" && canEditOutletValues && !canEditQtySent && !qtySentConfirmed
    ? "Enter Received and Wastage now, then save this entry as draft. Kitchen or an authorised company-wide user must confirm Qty Sent before completion."
    : record.status === "draft"
    ? "Received can be saved during the day. Keep this record as a draft, then return later to enter Wastage before posting."
    : record.status === "morning_recorded"
      ? "Confirm Received and record Wastage, then complete the daily record."
      : record.status === "evening_completed"
        ? "This record is posted. Authorised staff can still correct and save it."
        : record.status === "reviewed"
          ? "This record has been reviewed and is locked."
          : "This record is void and locked.";
  const voidAction = voidOutletDailyRecord.bind(null, record.id);

  const editPrimary = record.status === "draft" && canEditQtySent && !qtySentConfirmed
    ? <SubmitButton form={formId} name="target_status" value="morning_recorded" className="gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Confirm Qty Sent</SubmitButton>
    : canEditOutletValues && record.status === "draft"
      ? outletCanComplete
        ? <SubmitButton form={formId} name="target_status" value="evening_completed" className="gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Post Daily Record</SubmitButton>
        : <SubmitButton form={formId} name="target_status" value="draft" className="gap-2"><Save className="h-4 w-4" aria-hidden="true" />Save Draft</SubmitButton>
    : outletCanComplete && record.status === "morning_recorded"
      ? <SubmitButton form={formId} name="target_status" value="evening_completed" className="gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Post Daily Record</SubmitButton>
      : canEditOutletValues && record.status === "evening_completed"
        ? <SubmitButton form={formId} name="target_status" value="evening_completed" className="gap-2"><Save className="h-4 w-4" aria-hidden="true" />Save Changes</SubmitButton>
        : !canEditOutletValues && canEditQtySent
          ? <SubmitButton form={formId} name="target_status" value={record.status}>Save Qty Sent</SubmitButton>
          : null;
  const primaryAction = editPrimary;
  const secondaryActions = <>
    {canEditOutletValues && record.status === "draft" && (canEditQtySent || outletCanComplete) ? <SubmitButton form={formId} name="target_status" value="draft" variant="outline"><Save className="h-4 w-4" aria-hidden="true" />Save progress</SubmitButton> : null}
    {outletCanComplete && canEditOutletValues && record.status === "morning_recorded" ? <SubmitButton form={formId} name="target_status" value="morning_recorded" variant="outline">Save Changes</SubmitButton> : null}
    {canVoid ? <DestructiveActionDialog action={voidAction} label="Void Record" title="Void this outlet daily record?" description="The record will leave active operational totals but remain in the audit trail." pendingLabel="Voiding…"><Field label="Void reason" required><Input name="reason" required placeholder="Explain why this record is being voided" /></Field></DestructiveActionDialog> : null}
  </>;
  const hasSecondaryActions = Boolean(canVoid || canEditOutletValues && record.status === "morning_recorded" || canEditOutletValues && record.status === "draft" && (canEditQtySent || outletCanComplete));

  const sidePanel = <>
    {primaryAction || hasSecondaryActions ? <DocumentActionSection moreOptions={hasSecondaryActions ? <div className="grid gap-2">{secondaryActions}</div> : undefined}>{primaryAction ?? <p className="text-xs text-muted-foreground">No primary action is available for this status.</p>}</DocumentActionSection> : null}
    <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{nextStep}</p><p className="text-xs text-muted-foreground">Wastage needs a reason. Quantity exceptions require a remark.</p></DocumentSideSection>
  </>;

  return <DocumentWorkspace
    breadcrumbs={[{ label: "Outlet Daily Records", href: "/outlet-daily-records" }, { label: formatDateOnly(record.record_date) }]}
    documentNo={`${record.branch_name} · ${formatDateOnly(record.record_date)}`}
    documentIdentity={<p className="min-w-0 font-mono text-[14px] font-semibold leading-5 text-[var(--sb-text)] sm:whitespace-nowrap sm:text-[16px]"><span className="block truncate sm:inline">{record.branch_name}</span><span className="block whitespace-nowrap sm:inline"> · {formatDateOnly(record.record_date)}</span></p>}
    title="Outlet Daily Record"
    status={record.status}
    workflowSteps={dailySteps}
    currentStatus={["reviewed", "void"].includes(record.status) ? "evening_completed" : record.status}
    sidePanel={sidePanel}
    mobilePrimaryAction={primaryAction}
    mobileMoreOptions={hasSecondaryActions ? <DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions> : undefined}
  >
    {messages.success ? <Card><CardContent className="p-3 text-sm text-success">{messages.success}</CardContent></Card> : null}
    <ActionErrorNotice message={messages.error} />
    {canEditOutletValues && !canEditQtySent && !qtySentConfirmed && record.status === "draft" ? <Card className="border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)]"><CardContent className="p-3 text-sm"><p className="font-medium">Waiting for Kitchen Qty Sent.</p><p className="mt-1 text-muted-foreground">This record can be posted in one step after all Qty Sent values are confirmed.</p></CardContent></Card> : null}
    {record.received_state === "unavailable" ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm"><p className="font-medium text-warning">Received entry still in progress</p><p className="mt-1 text-muted-foreground">{record.received_pending_lines} food line{record.received_pending_lines === 1 ? " still needs" : "s still need"} a Received value. Enter an amount or an explicit 0, save progress, and return later to complete Wastage.</p></CardContent></Card> : null}
    {record.received_zero_with_sent ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm"><p className="font-medium text-warning">Receipt check needed</p><p className="mt-1 text-muted-foreground">Qty Sent is recorded, but Received is 0. Confirm whether the outlet received nothing or the receipt entry is incomplete.</p></CardContent></Card> : null}
    {statusLocked ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm font-medium">{record.status === "reviewed" ? "Reviewed and locked" : "Void and locked"} — normal editing is unavailable.</CardContent></Card> : null}
    <Card><CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Qty Sent</p><strong className={`tabular-nums ${record.total_sent === null ? "text-warning" : ""}`}>{record.total_sent === null ? "Pending" : formatNumber(record.total_sent)}</strong>{record.total_sent === null ? <p className="text-[11px] text-warning">Needs confirmation</p> : null}</div><div><p className="text-xs text-muted-foreground">Received</p><strong className={`tabular-nums ${record.total_received === null || record.received_zero_with_sent ? "text-warning" : ""}`}>{record.total_received === null ? `${record.received_pending_lines} line${record.received_pending_lines === 1 ? "" : "s"} pending` : record.received_zero_with_sent ? "0 · verify" : formatNumber(record.total_received)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage</p><strong className="tabular-nums">{formatNumber(record.total_wastage)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage %</p><strong className="tabular-nums">{record.wastage_percent === null ? record.received_pending_lines > 0 ? "Pending receipt" : "—" : `${formatNumber(record.wastage_percent)}%`}</strong></div>{record.void_reason ? <p className="col-span-full text-xs text-destructive">Void reason: {record.void_reason}</p> : null}</CardContent></Card>
    <input form={formId} type="hidden" name="record_id" value={record.id} />
    <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={products} lines={lines} branchId={record.branch_id} recordDate={record.record_date} notes={record.notes} validationError={messages.error} locked={locked} canEditHeader={canEditOutletValues} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} />
  </DocumentWorkspace>;
}
