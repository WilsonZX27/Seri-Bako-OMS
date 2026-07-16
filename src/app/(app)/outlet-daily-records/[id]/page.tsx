import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatNumber } from "@/lib/utils";
import { reviewOutletDailyRecord, saveOutletDailyRecord, voidOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getPermissionMap } from "@/server/auth/permissions";
import { getOutletDailyFormOptions, getOutletDailyRecord } from "@/server/queries/outlet-daily-records";

export default async function OutletDailyRecordDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const [{ record, lines }, options, permissions] = await Promise.all([
    getOutletDailyRecord(id),
    getOutletDailyFormOptions(),
    getPermissionMap(["outlet_daily_record.update", "outlet_daily_record.review", "outlet_daily_record.void"]),
  ]);
  const productMap = new Map(options.products.map((product) => [product.id, product]));
  for (const line of lines) if (line.product) productMap.set(line.product.id, line.product);
  const products = [...productMap.values()].sort((a, b) => a.product_name.localeCompare(b.product_name));
  const locked = ["reviewed", "void"].includes(record.status) || !permissions["outlet_daily_record.update"];
  const formId = "outlet-daily-record-form";
  const canReview = record.status === "evening_completed" && permissions["outlet_daily_record.review"];
  const canVoid = record.status !== "void" && permissions["outlet_daily_record.void"];
  const reviewAction = reviewOutletDailyRecord.bind(null, record.id);
  const voidAction = voidOutletDailyRecord.bind(null, record.id);
  return <>
    <PageHeader title={<span data-document-breadcrumb={`${record.branch_name} ${record.record_date}`}>{record.branch_name} · {record.record_date}</span>} description={`Outlet daily record · ${record.status.replaceAll("_", " ")}`} />
    <WorkspaceGrid rightRail={<>
      <ConsoleSection title="Workflow Actions"><div className="grid gap-2">
        {!locked && record.status === "draft" ? <><SubmitButton form={formId} name="target_status" value="morning_recorded">Mark Morning Recorded</SubmitButton><SubmitButton form={formId} name="target_status" value="draft" variant="outline">Save Draft</SubmitButton><SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline">Complete Evening Record</SubmitButton></> : null}
        {!locked && record.status === "morning_recorded" ? <><SubmitButton form={formId} name="target_status" value="evening_completed">Complete Evening Record</SubmitButton><SubmitButton form={formId} name="target_status" value="morning_recorded" variant="outline">Save Morning Changes</SubmitButton></> : null}
        {!locked && record.status === "evening_completed" ? <SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline">Save Evening Changes</SubmitButton> : null}
        {canReview ? <form action={reviewAction}><SubmitButton className="w-full" pendingLabel="Reviewing…">Review Record</SubmitButton></form> : null}
        {locked && !canVoid ? <p className="text-xs text-muted-foreground">This record is locked for normal editing.</p> : null}
      </div></ConsoleSection>
      {canVoid ? <ConsoleSection title="Void Record"><form action={voidAction} className="grid gap-2"><Field label="Void reason"><Input name="reason" required placeholder="Required reason" /></Field><SubmitButton variant="destructive" pendingLabel="Voiding…">Void</SubmitButton></form></ConsoleSection> : null}
      <ConsoleSection title="Validation"><p className="text-xs text-muted-foreground">Wastage needs a reason. Quantity exceptions require a line note. Reviewed records are locked.</p></ConsoleSection>
    </>}>
      {messages.success ? <Card><CardContent className="p-3 text-sm text-success">{messages.success}</CardContent></Card> : null}
      {messages.error ? <Card><CardContent className="p-3 text-sm text-destructive">{messages.error}</CardContent></Card> : null}
      <Card><CardContent className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={record.status} /></div><div><p className="text-xs text-muted-foreground">Received</p><strong>{formatNumber(record.total_received)}</strong></div><div><p className="text-xs text-muted-foreground">Leftover</p><strong>{formatNumber(record.total_leftover)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage</p><strong>{formatNumber(record.total_wastage)}</strong></div><div><p className="text-xs text-muted-foreground">Wastage %</p><strong>{formatNumber(record.wastage_percent)}%</strong></div>{record.void_reason ? <p className="sm:col-span-2 lg:col-span-5 text-xs text-destructive">Void reason: {record.void_reason}</p> : null}</CardContent></Card>
      <input form={formId} type="hidden" name="record_id" value={record.id} />
      <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={products} lines={lines} branchId={record.branch_id} recordDate={record.record_date} notes={record.notes} locked={locked} />
    </WorkspaceGrid>
  </>;
}
