import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
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
  const locked = !canEditOutletValues && !canEditQtySent;
  const formId = "outlet-daily-record-form";
  const canVoid = record.status !== "void" && permissions["outlet_daily_record.void"];
  const nextStep = record.status === "draft"
    ? "Central Kitchen records Qty Sent. Outlet Staff then confirms Received and Wastage."
    : record.status === "morning_recorded"
      ? "Confirm Received and record Wastage, then complete the daily record."
      : record.status === "evening_completed"
        ? "This record is posted. Authorised staff can still correct and save it."
        : record.status === "reviewed"
          ? "This record has been reviewed and is locked."
          : "This record is void and locked.";
  const voidAction = voidOutletDailyRecord.bind(null, record.id);

  const editPrimary = canEditOutletValues && record.status === "draft"
    ? <SubmitButton form={formId} name="target_status" value="morning_recorded">Confirm Received</SubmitButton>
    : canEditOutletValues && record.status === "morning_recorded"
      ? <SubmitButton form={formId} name="target_status" value="evening_completed" className="gap-2"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Post Daily Record</SubmitButton>
      : canEditOutletValues && record.status === "evening_completed"
        ? <SubmitButton form={formId} name="target_status" value="evening_completed" className="gap-2"><Save className="h-4 w-4" aria-hidden="true" />Save Changes</SubmitButton>
        : !canEditOutletValues && canEditQtySent
          ? <SubmitButton form={formId} name="target_status" value={record.status}>Save Qty Sent</SubmitButton>
          : null;
  const primaryAction = editPrimary;
  const secondaryActions = <>
    {canEditOutletValues && record.status === "draft" ? <><SubmitButton form={formId} name="target_status" value="draft" variant="outline">Save Draft</SubmitButton><SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline">Post Daily Record</SubmitButton></> : null}
    {canEditOutletValues && record.status === "morning_recorded" ? <SubmitButton form={formId} name="target_status" value="morning_recorded" variant="outline">Save Changes</SubmitButton> : null}
    {canVoid ? <form action={voidAction} className="grid gap-2"><Field label="Void reason"><Input name="reason" required placeholder="Required reason" /></Field><SubmitButton variant="outline" className="text-destructive hover:text-destructive" pendingLabel="Voiding…">Void Record</SubmitButton></form> : null}
  </>;
  const hasSecondaryActions = Boolean(canVoid || canEditOutletValues && ["draft", "morning_recorded"].includes(record.status));

  const sidePanel = <>
    {primaryAction || hasSecondaryActions ? <DocumentActionSection moreOptions={hasSecondaryActions ? <div className="grid gap-2">{secondaryActions}</div> : undefined}>{primaryAction ?? <p className="text-xs text-muted-foreground">No primary action is available for this status.</p>}</DocumentActionSection> : null}
    <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{nextStep}</p><p className="text-xs text-muted-foreground">Wastage needs a reason. Quantity exceptions require a remark.</p></DocumentSideSection>
  </>;

  return <DocumentWorkspace
    breadcrumbs={[{ label: "Outlet Daily Records", href: "/outlet-daily-records" }, { label: formatDateOnly(record.record_date) }]}
    documentNo={`${record.branch_name} · ${formatDateOnly(record.record_date)}`}
    title="Outlet Daily Record"
    status={record.status}
    branch={record.branch_name}
    workflowSteps={dailySteps}
    currentStatus={["reviewed", "void"].includes(record.status) ? "evening_completed" : record.status}
    sidePanel={sidePanel}
    mobilePrimaryAction={primaryAction}
    mobileMoreOptions={hasSecondaryActions ? <DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions> : undefined}
  >
    {messages.success ? <Card><CardContent className="p-3 text-sm text-success">{messages.success}</CardContent></Card> : null}
    {messages.error ? <Card><CardContent className="p-3 text-sm text-destructive">{messages.error}</CardContent></Card> : null}
    {record.received_state === "unavailable" ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm"><p className="font-medium text-warning">Received quantity unavailable</p><p className="mt-1 text-muted-foreground">The record loaded, but one or more receiving values are not verified. No zero has been substituted.</p></CardContent></Card> : null}
    {record.received_zero_with_sent ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm"><p className="font-medium text-warning">Receipt check needed</p><p className="mt-1 text-muted-foreground">Qty Sent is recorded, but Received is 0. Confirm whether the outlet received nothing or the receipt entry is incomplete.</p></CardContent></Card> : null}
    {statusLocked ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm font-medium">{record.status === "reviewed" ? "Reviewed and locked" : "Void and locked"} — normal editing is unavailable.</CardContent></Card> : null}
    <Card><CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Qty Sent</p><strong className="tabular-nums">{formatNumber(record.total_sent)}</strong></div><div><p className="text-xs text-muted-foreground">Received</p><strong className={`tabular-nums ${record.total_received === null || record.received_zero_with_sent ? "text-warning" : ""}`}>{record.total_received === null ? "Unavailable" : record.received_zero_with_sent ? "0 · verify" : formatNumber(record.total_received)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage</p><strong className="tabular-nums">{formatNumber(record.total_wastage)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage %</p><strong className="tabular-nums">{record.wastage_percent === null ? "Unavailable" : `${formatNumber(record.wastage_percent)}%`}</strong></div>{record.void_reason ? <p className="col-span-full text-xs text-destructive">Void reason: {record.void_reason}</p> : null}</CardContent></Card>
    <input form={formId} type="hidden" name="record_id" value={record.id} />
    <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={products} lines={lines} branchId={record.branch_id} recordDate={record.record_date} notes={record.notes} validationError={messages.error} locked={locked} canEditHeader={canEditOutletValues} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} />
  </DocumentWorkspace>;
}
