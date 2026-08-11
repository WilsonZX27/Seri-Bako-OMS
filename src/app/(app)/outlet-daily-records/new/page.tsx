import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getPermissionMap } from "@/server/auth/permissions";
import { getOutletDailyFormOptions } from "@/server/queries/outlet-daily-records";
import { getToday } from "@/lib/utils";
import { CheckCircle2, Save, Send } from "lucide-react";
const dailySteps = [
  { key: "draft", label: "Qty Sent", description: "Central Kitchen records the quantity sent." },
  { key: "morning_recorded", label: "Outlet Entry", description: "Outlet Staff confirms received quantity and wastage." },
  { key: "evening_completed", label: "Posted", description: "The completed daily record is posted and remains editable by authorised staff." },
];

export default async function NewOutletDailyRecordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const recordDate = getToday();
  const [options, permissions] = await Promise.all([getOutletDailyFormOptions(recordDate), getPermissionMap(["outlet_daily_record.update", "outlet_daily_record.qty_sent"])]);
  const formId = "outlet-daily-record-form";
  const disabled = !options.products.length || !options.branches.length;
  const canUpdate = permissions["outlet_daily_record.update"];
  const primaryAction = canUpdate
    ? <SubmitButton form={formId} name="target_status" value="morning_recorded" className="w-full gap-2" disabled={disabled}><Send className="h-4 w-4" aria-hidden="true" />Confirm Qty Sent</SubmitButton>
    : <SubmitButton form={formId} name="target_status" value="draft" className="w-full gap-2" disabled={disabled}><Save className="h-4 w-4" aria-hidden="true" />Save Qty Sent</SubmitButton>;
  const secondaryActions = canUpdate ? <><SubmitButton form={formId} name="target_status" value="draft" variant="outline" className="w-full gap-2" disabled={disabled}><Save className="h-4 w-4" aria-hidden="true" />Save Draft</SubmitButton><SubmitButton form={formId} name="target_status" value="evening_completed" variant="outline" className="w-full gap-2" disabled={disabled}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Post Daily Record</SubmitButton></> : null;
  const sidePanel = <>
    <DocumentActionSection moreOptions={secondaryActions ? <div className="grid gap-3">{secondaryActions}</div> : undefined}>{primaryAction}</DocumentActionSection>
    <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">Central Kitchen records Qty Sent. Outlet Staff confirms Received and records Wastage.</p><p className="text-xs text-muted-foreground">Wastage needs a reason. Quantity exceptions require a remark.</p></DocumentSideSection>
  </>;

  return <DocumentWorkspace
    breadcrumbs={[{ label: "Outlet Daily Records", href: "/outlet-daily-records" }, { label: "New" }]}
    documentNo="New Outlet Daily Record"
    title="Outlet Daily Record"
    status="draft"
    branch={options.branches.find((branch) => branch.id === options.defaultBranchId)?.branch_name}
    workflowSteps={dailySteps}
    currentStatus="draft"
    mobileContextDate={recordDate}
    sidePanel={sidePanel}
    mobilePrimaryAction={primaryAction}
    mobileMoreOptions={secondaryActions ? <DocumentMoreOptions><div className="grid gap-3">{secondaryActions}</div></DocumentMoreOptions> : undefined}
    tabletRailMode="split"
  >
    {filters.error ? <Card><CardContent className="p-3 text-sm text-destructive">{filters.error}</CardContent></Card> : null}
    <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={options.products} branchId={options.defaultBranchId} recordDate={recordDate} defaultsByBranch={options.defaultsByBranch} canEditQtySent={permissions["outlet_daily_record.qty_sent"]} canEditOutletValues={permissions["outlet_daily_record.update"]} />
  </DocumentWorkspace>;
}
