import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { sortProductsForDisplay } from "@/lib/product-order";
import { formatNumber } from "@/lib/utils";
import { reviewOutletDailyRecord, saveOutletDailyRecord, voidOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getPermissionMap } from "@/server/auth/permissions";
import { getOutletDailyFormOptions, getOutletDailyRecord } from "@/server/queries/outlet-daily-records";

export default async function OutletDailyRecordDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const [{ record, lines }, options, permissions] = await Promise.all([
    getOutletDailyRecord(id),
    getOutletDailyFormOptions(),
    getPermissionMap(["outlet_daily_record.update", "outlet_daily_record.qty_sent", "outlet_daily_record.review", "outlet_daily_record.void"]),
  ]);
  const productMap = new Map(options.products.map((product) => [product.id, product]));
  for (const line of lines) if (line.product) productMap.set(line.product.id, line.product);
  const products = sortProductsForDisplay([...productMap.values()]);
  const statusLocked = ["reviewed", "void"].includes(record.status);
  const canEditOutletValues = !statusLocked && permissions["outlet_daily_record.update"];
  const canEditQtySent = !statusLocked && permissions["outlet_daily_record.qty_sent"];
  const locked = !canEditOutletValues && !canEditQtySent;
  const formId = "outlet-daily-record-form";
  const canReview = record.status === "evening_completed" && permissions["outlet_daily_record.review"];
  const canVoid = record.status !== "void" && permissions["outlet_daily_record.void"];
  const nextStep = record.status === "draft"
    ? "Central Kitchen records Qty Sent. Outlet Staff confirms Received and Wastage."
    : record.status === "morning_recorded"
      ? "Confirm Received and record Wastage, then complete the daily record."
      : record.status === "evening_completed"
        ? "The daily entry is complete and needs review."
        : record.status === "reviewed"
          ? "This record has been reviewed and is locked."
          : "This record is void and locked.";
  const reviewAction = reviewOutletDailyRecord.bind(null, record.id);
  const voidAction = voidOutletDailyRecord.bind(null, record.id);
  const hasPrimaryAction = canEditOutletValues || canEditQtySent || canReview;
  return <>
    <PageHeader title={<span data-document-breadcrumb={`${record.branch_name} ${record.record_date}`}>{record.branch_name} · {record.record_date}</span>} description={`Outlet daily record · ${record.status.replaceAll("_", " ")}`} />
    <WorkspaceGrid hideMobileConsole={!hasPrimaryAction} rightRail={<>
      <ConsoleSection title="Workflow Actions"><div className="grid gap-2">
        {canEditOutletValues && record.status === "draft" ? <><SubmitButton form={formId} name="target_status" value="morning_recorded" data-mobile-primary-action>Confirm Received</SubmitButton><SubmitButton form={formId} name="target_status" value="draft" variant="outline">Save Draft</SubmitButton><SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline">Complete Daily Record</SubmitButton></> : null}
        {canEditOutletValues && record.status === "morning_recorded" ? <><SubmitButton form={formId} name="target_status" value="evening_completed" data-mobile-primary-action>Complete Daily Record</SubmitButton><SubmitButton form={formId} name="target_status" value="morning_recorded" variant="outline">Save Changes</SubmitButton></> : null}
        {canEditOutletValues && record.status === "evening_completed" ? <SubmitButton form={formId} name="target_status" value="evening_completed" data-mobile-primary-action>Save Daily Record</SubmitButton> : null}
        {!canEditOutletValues && canEditQtySent ? <SubmitButton form={formId} name="target_status" value={record.status} data-mobile-primary-action>Save Qty Sent</SubmitButton> : null}
        {canReview ? <form action={reviewAction}><SubmitButton className="w-full" pendingLabel="Reviewing…" data-mobile-primary-action>Review Record</SubmitButton></form> : null}
        {locked && !canVoid ? <p className="text-xs text-muted-foreground">This record is locked for normal editing.</p> : null}
      </div></ConsoleSection>
      <ConsoleSection title="What to do next"><p className="text-xs text-muted-foreground">{nextStep}</p></ConsoleSection>
      {canVoid ? <ConsoleSection title="Void Record"><form action={voidAction} className="grid gap-2"><Field label="Void reason"><Input name="reason" required placeholder="Required reason" /></Field><SubmitButton variant="outline" className="text-destructive hover:text-destructive" pendingLabel="Voiding…">Void</SubmitButton></form></ConsoleSection> : null}
      <ConsoleSection title="Validation"><p className="text-xs text-muted-foreground">Wastage needs a reason. Quantity exceptions require a line remark. Reviewed records are locked.</p></ConsoleSection>
    </>}>
      {messages.success ? <Card><CardContent className="p-3 text-sm text-success">{messages.success}</CardContent></Card> : null}
      {messages.error ? <Card><CardContent className="p-3 text-sm text-destructive">{messages.error}</CardContent></Card> : null}
      {statusLocked ? <Card className="border-warning/40 bg-warning/10"><CardContent className="p-3 text-sm font-medium">{record.status === "reviewed" ? "Reviewed and locked" : "Void and locked"} — normal editing is unavailable.</CardContent></Card> : null}
      <Card><CardContent className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={record.status} /></div><div><p className="text-xs text-muted-foreground">Qty Sent</p><strong>{formatNumber(record.total_sent)}</strong></div><div><p className="text-xs text-muted-foreground">Received</p><strong>{formatNumber(record.total_received)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage</p><strong>{formatNumber(record.total_wastage)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage %</p><strong>{formatNumber(record.wastage_percent)}%</strong></div>{record.void_reason ? <p className="sm:col-span-2 lg:col-span-5 text-xs text-destructive">Void reason: {record.void_reason}</p> : null}</CardContent></Card>
      <input form={formId} type="hidden" name="record_id" value={record.id} />
      <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={products} lines={lines} branchId={record.branch_id} recordDate={record.record_date} notes={record.notes} locked={locked} canEditHeader={canEditOutletValues} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} />
    </WorkspaceGrid>
  </>;
}
