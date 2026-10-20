import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { ActionErrorNotice } from "@/components/action-error-notice";
import { OutletDailyDoSources } from "@/components/outlet-daily-do-sources";
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
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { postOutletDailyRecord, saveOutletDailyRecord, voidOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getPermissionMap } from "@/server/auth/permissions";
import { getOutletDailyActivity, getOutletDailyFormOptions, getOutletDailyRecord } from "@/server/queries/outlet-daily-records";
import { logServerError } from "@/server/observability/logger";
import { CheckCircle2, Save, Send } from "lucide-react";
import { detailOrNotFound } from "@/server/queries/detail";
import { TimelineEventList } from "@/components/documents/document-panels";

const dailySteps = [
  { key: "draft", label: "Qty Sent", description: "Central Kitchen records the quantity sent." },
  { key: "morning_recorded", label: "Outlet Entry", description: "Outlet Staff confirms received quantity and wastage." },
  { key: "evening_completed", label: "Ready to post", description: "Outlet values remain editable until an authorised company-wide role posts the record." },
  { key: "reviewed", label: "Posted", description: "Purchasing or a higher authorised role posted and locked the record." },
];

export default async function OutletDailyRecordDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const detail = await detailOrNotFound(getOutletDailyRecord(id));
  const source = await Promise.all([
    Promise.resolve(detail),
    getOutletDailyFormOptions(),
    getPermissionMap(["outlet_daily_record.update", "outlet_daily_record.qty_sent", "outlet_daily_record.post", "outlet_daily_record.void"]),
    getOutletDailyActivity(id),
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
  const [{ record, lines, sales }, options, permissions, activities] = source;
  const productMap = new Map(options.products.map((product) => [product.id, product]));
  for (const line of lines) if (line.product) productMap.set(line.product.id, { ...line.product, is_seasonal: false, available_from: null, available_until: null });
  const products = [...productMap.values()].sort((a, b) => a.product_code.localeCompare(b.product_code));
  const activityItems = activities.some((activity) => activity.activity_type === "created") ? activities : [
    ...activities,
    {
      id: `created-${record.id}`,
      activity_type: "created",
      message: "Outlet daily record created",
      display_message: "Outlet daily record created",
      metadata: null,
      created_at: record.created_at,
      created_by: record.created_by,
      actor_name: record.created_by_name ?? "Staff",
    },
  ].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  const statusLocked = ["reviewed", "void"].includes(record.status);
  const canEditOutletValues = !statusLocked && permissions["outlet_daily_record.update"];
  const canEditQtySent = !statusLocked && permissions["outlet_daily_record.qty_sent"];
  const canPost = !statusLocked && permissions["outlet_daily_record.post"];
  const qtySentConfirmed = record.qty_sent_state === "confirmed";
  const outletCanComplete = canEditOutletValues && qtySentConfirmed;
  const locked = !canEditOutletValues && !canEditQtySent;
  const formId = "outlet-daily-record-form";
  const canVoid = record.status !== "void" && permissions["outlet_daily_record.void"];
  const nextStep = record.status === "draft" && canEditOutletValues && !canEditQtySent && !qtySentConfirmed
    ? "Enter Received and Wastage now, then save this entry as draft. Kitchen or an authorised company-wide user must confirm Qty Sent before completion."
    : record.status === "draft"
    ? "Save receiving progress during the day, then complete the quantities required by each product category."
    : record.status === "morning_recorded"
      ? "Confirm received quantities and complete each category’s daily values."
      : record.status === "evening_completed"
        ? canPost
          ? "This record is ready to post. Review the values, save any correction, then post to lock Outlet editing."
          : "This record is ready to post. Outlet can continue correcting and saving it until Purchasing or another authorised role posts it."
        : record.status === "reviewed"
          ? "This record is posted and locked. Use the audit trail for follow-up instead of silently changing operational history."
          : "This record is void and locked.";
  const voidAction = voidOutletDailyRecord.bind(null, record.id);
  const postAction = postOutletDailyRecord.bind(null, record.id);

  const editPrimary = record.status === "draft" && canEditQtySent && !qtySentConfirmed
    ? <SubmitButton form={formId} name="target_status" value="morning_recorded" className="gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Confirm Qty Sent</SubmitButton>
    : canEditOutletValues && record.status === "draft"
      ? outletCanComplete
        ? <SubmitButton form={formId} name="target_status" value="evening_completed" className="gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Mark Ready to Post</SubmitButton>
        : <SubmitButton form={formId} name="target_status" value="draft" className="gap-2"><Save className="h-4 w-4" aria-hidden="true" />Save Draft</SubmitButton>
    : outletCanComplete && record.status === "morning_recorded"
      ? <SubmitButton form={formId} name="target_status" value="evening_completed" className="gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Mark Ready to Post</SubmitButton>
      : canPost && record.status === "evening_completed"
        ? <form action={postAction}><SubmitButton className="w-full gap-2" pendingLabel="Posting…"><Send className="h-4 w-4" aria-hidden="true" />Post Daily Record</SubmitButton></form>
        : canEditOutletValues && record.status === "evening_completed"
        ? <SubmitButton form={formId} name="target_status" value="evening_completed" className="gap-2"><Save className="h-4 w-4" aria-hidden="true" />Save Changes</SubmitButton>
        : !canEditOutletValues && canEditQtySent
          ? <SubmitButton form={formId} name="target_status" value={record.status}>Save Qty Sent</SubmitButton>
          : null;
  const primaryAction = editPrimary;
  const secondaryActions = <>
    {canEditOutletValues && record.status === "draft" && (canEditQtySent || outletCanComplete) ? <SubmitButton form={formId} name="target_status" value="draft" variant="outline"><Save className="h-4 w-4" aria-hidden="true" />Save progress</SubmitButton> : null}
    {outletCanComplete && canEditOutletValues && record.status === "morning_recorded" ? <SubmitButton form={formId} name="target_status" value="morning_recorded" variant="outline">Save Changes</SubmitButton> : null}
    {canPost && canEditOutletValues && record.status === "evening_completed" ? <SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline"><Save className="h-4 w-4" aria-hidden="true" />Save Changes</SubmitButton> : null}
    {canVoid ? <DestructiveActionDialog action={voidAction} label="Void Record" title="Void this outlet daily record?" description="The record will leave active operational totals but remain in the audit trail." pendingLabel="Voiding…"><Field label="Void reason" required><Input name="reason" required placeholder="Explain why this record is being voided" /></Field></DestructiveActionDialog> : null}
  </>;
  const hasSecondaryActions = Boolean(canVoid || canPost && canEditOutletValues && record.status === "evening_completed" || canEditOutletValues && record.status === "morning_recorded" || canEditOutletValues && record.status === "draft" && (canEditQtySent || outletCanComplete));

  const sidePanel = <>
    {primaryAction || hasSecondaryActions ? <DocumentActionSection moreOptions={hasSecondaryActions ? <div className="grid gap-2">{secondaryActions}</div> : undefined}>{primaryAction ?? <p className="text-xs text-muted-foreground">No primary action is available for this status.</p>}</DocumentActionSection> : null}
    <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{nextStep}</p><p className="text-xs text-muted-foreground">Daily food wastage needs a reason. Usage and Qty Sold are recorded separately.</p></DocumentSideSection>
    <DocumentSideSection title="Activity"><TimelineEventList events={activityItems.map((activity) => ({ id: activity.id, activity_type: activity.activity_type, message: activity.display_message, created_at: activity.created_at, created_by_name: activity.actor_name }))} /></DocumentSideSection>
  </>;

  return <DocumentWorkspace
    breadcrumbs={[{ label: "Outlet Daily Records", href: "/outlet-daily-records" }, { label: formatDateOnly(record.record_date) }]}
    documentNo={`${record.branch_name} · ${formatDateOnly(record.record_date)}`}
    documentIdentity={<p className="min-w-0 font-mono text-[14px] font-semibold leading-5 text-[var(--sb-text)] sm:whitespace-nowrap sm:text-[16px]"><span className="block truncate sm:inline">{record.branch_name}</span><span className="block whitespace-nowrap sm:inline"> · {formatDateOnly(record.record_date)}</span></p>}
    title="Outlet Daily Record"
    status={record.status === "evening_completed" ? "ready_to_post" : record.status === "reviewed" ? "posted" : record.status}
    workflowSteps={dailySteps}
    currentStatus={record.status === "void" ? "reviewed" : record.status}
    sidePanel={sidePanel}
    mobilePrimaryAction={primaryAction}
    mobileMoreOptions={hasSecondaryActions ? <DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions> : undefined}
  >
    <ActionErrorNotice message={messages.error} />
    {canEditOutletValues && !canEditQtySent && !qtySentConfirmed && record.status === "draft" ? <Card className="border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)]"><CardContent className="p-3 text-sm"><p className="font-medium">Waiting for Kitchen Qty Sent.</p><p className="mt-1 text-muted-foreground">After Qty Sent is confirmed, Outlet can finish the entry and mark it Ready to post.</p></CardContent></Card> : null}
    {record.received_state === "unavailable" ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm"><p className="font-medium text-warning">Received entry still in progress</p><p className="mt-1 text-muted-foreground">Enter received quantities or an explicit 0 for the listed products. Save progress, then complete Wastage, Usage or Qty Sold for each category.</p></CardContent></Card> : null}
    {record.received_zero_with_sent ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm"><p className="font-medium text-warning">Receipt check needed</p><p className="mt-1 text-muted-foreground">Qty Sent is recorded, but Received is 0. Confirm whether the outlet received nothing or the receipt entry is incomplete.</p></CardContent></Card> : null}
    {record.sales_review_status === "needs_review" ? <Card className="border-amber-300 bg-amber-50"><CardContent className="p-3 text-sm"><p className="font-medium text-amber-950">Sales reconciliation note</p><p className="mt-1 text-amber-900/80">POS total and channel total do not tally. Finance or an authorised manager can review the difference; it does not block wastage completion or posting.</p></CardContent></Card> : null}
    {statusLocked ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm font-medium">{record.status === "reviewed" ? "Posted and locked — Outlet editing is unavailable." : "Void and locked — normal editing is unavailable."}</CardContent></Card> : null}
    <Card><CardContent className="sb-label-value-summary grid gap-3 p-3 xl:grid-cols-4"><div><p className="text-xs text-muted-foreground">Qty Sent</p><div className="text-right xl:text-left"><strong className={`tabular-nums ${record.total_sent === null ? "text-warning" : ""}`}>{record.total_sent === null ? "Pending" : formatNumber(record.total_sent)}</strong>{record.total_sent === null ? <p className="text-[11px] text-warning">Needs confirmation</p> : null}</div></div><div><p className="text-xs text-muted-foreground">Received</p><strong className={`tabular-nums ${record.total_received === null || record.received_zero_with_sent ? "text-warning" : ""}`}>{record.total_received === null ? `${record.received_pending_lines} line${record.received_pending_lines === 1 ? "" : "s"} pending` : record.received_zero_with_sent ? "0 · verify" : formatNumber(record.total_received)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage</p><strong className="tabular-nums">{formatNumber(record.total_wastage)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage %</p><strong className="tabular-nums">{record.wastage_percent === null ? record.received_pending_lines > 0 ? "Pending receipt" : "—" : `${formatNumber(record.wastage_percent)}%`}</strong></div>{record.void_reason ? <p className="col-span-full text-xs text-destructive">Void reason: {record.void_reason}</p> : null}</CardContent></Card>
    <OutletDailyDoSources recordId={record.id} companyId={record.company_id} managed={lines.some((line) => line.do_managed)} />
    <input form={formId} type="hidden" name="record_id" value={record.id} />
    <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={products} lines={lines} branchId={record.branch_id} recordDate={record.record_date} notes={record.notes} sales={{ pos_total_sales: record.pos_total_sales, sales_variance_reason: record.sales_variance_reason, breakdown: sales }} validationError={messages.error} locked={locked} canEditHeader={canEditOutletValues} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} />
  </DocumentWorkspace>;
}
