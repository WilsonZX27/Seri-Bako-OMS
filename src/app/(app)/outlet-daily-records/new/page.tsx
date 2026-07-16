import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getOutletDailyFormOptions } from "@/server/queries/outlet-daily-records";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default async function NewOutletDailyRecordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const options = await getOutletDailyFormOptions();
  const formId = "outlet-daily-record-form";
  return <>
    <PageHeader title="New Outlet Daily Record" description="Record morning receiving now and evening outcome after closing." />
    <WorkspaceGrid rightRail={<>
      <ConsoleSection title="Workflow Actions"><div className="grid gap-2"><SubmitButton form={formId} name="target_status" value="morning_recorded" disabled={!options.products.length || !options.branches.length}>Mark Morning Recorded</SubmitButton><SubmitButton form={formId} name="target_status" value="draft" variant="outline" disabled={!options.products.length || !options.branches.length}>Save Draft</SubmitButton><SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline" disabled={!options.products.length || !options.branches.length}>Complete Evening Record</SubmitButton></div></ConsoleSection>
      <ConsoleSection title="Validation"><p className="text-xs text-muted-foreground">Quantities cannot be negative. Wastage needs a reason. If leftover plus wastage exceeds morning receiving, add a line note.</p></ConsoleSection>
      <ConsoleSection title="Daily Guidance"><p className="text-xs text-muted-foreground">Save morning quantities first. Enter closing leftovers and wastage only after outlet operations end.</p></ConsoleSection>
    </>}>
      {filters.error ? <Card><CardContent className="p-3 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
      <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={options.products} recordDate={today()} />
    </WorkspaceGrid>
  </>;
}
