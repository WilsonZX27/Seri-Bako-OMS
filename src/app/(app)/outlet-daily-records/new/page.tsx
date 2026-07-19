import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getPermissionMap } from "@/server/auth/permissions";
import { getOutletDailyFormOptions } from "@/server/queries/outlet-daily-records";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default async function NewOutletDailyRecordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [options, permissions] = await Promise.all([getOutletDailyFormOptions(), getPermissionMap(["outlet_daily_record.update", "outlet_daily_record.qty_sent"])]);
  const formId = "outlet-daily-record-form";
  const disabled = !options.products.length || !options.branches.length;
  return <>
    <PageHeader title="New Outlet Daily Record" description="Confirm received quantities and record wastage for the outlet day." />
    <WorkspaceGrid rightRail={<>
      <ConsoleSection title="Workflow Actions"><div className="grid gap-2">{permissions["outlet_daily_record.update"] ? <><SubmitButton form={formId} name="target_status" value="morning_recorded" data-mobile-primary-action disabled={disabled}>Confirm Received</SubmitButton><SubmitButton form={formId} name="target_status" value="draft" variant="outline" disabled={disabled}>Save Draft</SubmitButton><SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline" disabled={disabled}>Complete Daily Record</SubmitButton></> : <SubmitButton form={formId} name="target_status" value="draft" data-mobile-primary-action disabled={disabled}>Save Qty Sent</SubmitButton>}</div></ConsoleSection>
      <ConsoleSection title="What to do next"><p className="text-xs text-muted-foreground">Central Kitchen records Qty Sent. Outlet Staff confirms Received and records Wastage.</p></ConsoleSection>
      <ConsoleSection title="Validation"><p className="text-xs text-muted-foreground">Wastage needs a reason. Quantity exceptions require a line remark.</p></ConsoleSection>
    </>}>
      {filters.error ? <Card><CardContent className="p-3 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
      <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={options.products} branchId={options.defaultBranchId} recordDate={today()} canEditQtySent={permissions["outlet_daily_record.qty_sent"]} canEditOutletValues={permissions["outlet_daily_record.update"]} />
    </WorkspaceGrid>
  </>;
}
