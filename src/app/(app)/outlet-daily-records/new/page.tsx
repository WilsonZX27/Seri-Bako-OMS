import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getPermissionMap } from "@/server/auth/permissions";
import { getOutletDailyFormOptions } from "@/server/queries/outlet-daily-records";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dailySteps = [
  { key: "draft", label: "Qty Sent", description: "Central Kitchen records the quantity sent." },
  { key: "morning_recorded", label: "Outlet Entry", description: "Outlet Staff confirms received quantity and wastage." },
  { key: "evening_completed", label: "Review", description: "The completed record awaits Manager review." },
  { key: "reviewed", label: "Reviewed", description: "The record is reviewed and locked." },
];

export default async function NewOutletDailyRecordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [options, permissions] = await Promise.all([getOutletDailyFormOptions(), getPermissionMap(["outlet_daily_record.update", "outlet_daily_record.qty_sent"])]);
  const formId = "outlet-daily-record-form";
  const disabled = !options.products.length || !options.branches.length;
  const canUpdate = permissions["outlet_daily_record.update"];
  const primaryAction = canUpdate
    ? <SubmitButton form={formId} name="target_status" value="morning_recorded" className="w-full" disabled={disabled}>Confirm Qty Sent</SubmitButton>
    : <SubmitButton form={formId} name="target_status" value="draft" className="w-full" disabled={disabled}>Save Qty Sent</SubmitButton>;
  const secondaryActions = canUpdate ? <><SubmitButton form={formId} name="target_status" value="draft" variant="outline" className="w-full" disabled={disabled}>Save Draft</SubmitButton><SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline" className="w-full" disabled={disabled}>Complete Daily Record</SubmitButton></> : null;
  const sidePanel = <>
    <DocumentActionSection moreOptions={secondaryActions ? <div className="grid gap-2">{secondaryActions}</div> : undefined}>{primaryAction}</DocumentActionSection>
    <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Central Kitchen records Qty Sent. Outlet Staff confirms Received and records Wastage.</p><p className="text-xs text-muted-foreground">Wastage needs a reason. Quantity exceptions require a remark.</p></DocumentSideSection>
  </>;

  return <DocumentWorkspace
    breadcrumbs={[{ label: "Outlet Daily Records", href: "/outlet-daily-records" }, { label: "New" }]}
    documentNo="New Daily Record"
    title="Outlet Daily Record"
    status="draft"
    branch={options.branches.find((branch) => branch.id === options.defaultBranchId)?.branch_name}
    workflowSteps={dailySteps}
    currentStatus="draft"
    sidePanel={sidePanel}
    mobilePrimaryAction={primaryAction}
    mobileMoreOptions={secondaryActions ? <DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions> : undefined}
    tabletRailMode="split"
  >
    {filters.error ? <Card><CardContent className="p-3 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
    <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={options.products} branchId={options.defaultBranchId} recordDate={today()} canEditQtySent={permissions["outlet_daily_record.qty_sent"]} canEditOutletValues={permissions["outlet_daily_record.update"]} />
  </DocumentWorkspace>;
}
