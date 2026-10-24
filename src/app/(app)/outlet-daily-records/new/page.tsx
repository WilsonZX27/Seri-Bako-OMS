import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { ActionErrorNotice } from "@/components/action-error-notice";
import { OutletDailyRecordForm } from "@/components/outlet-daily-record-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveOutletDailyRecord } from "@/server/actions/outlet-daily-records";
import { getPermissionMap } from "@/server/auth/permissions";
import { getOutletDailyFormOptions } from "@/server/queries/outlet-daily-records";
import { getToday } from "@/lib/utils";
import { CheckCircle2, Save, Send } from "lucide-react";
const dailySteps = [
  { key: "draft", label: "Qty Sent", description: "Central Kitchen records the quantity sent." },
  { key: "morning_recorded", label: "Outlet Entry", description: "Outlet Staff confirms received quantity and wastage." },
  { key: "evening_completed", label: "Ready to post", description: "Outlet values remain editable until an authorised company-wide role posts the record." },
  { key: "reviewed", label: "Posted", description: "Purchasing or a higher authorised role posted and locked the record." },
];

export default async function NewOutletDailyRecordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const today = getToday();
  const requestedDate = filters.date?.trim() ?? "";
  const recordDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && requestedDate <= today ? requestedDate : today;
  const [options, permissions] = await Promise.all([getOutletDailyFormOptions(recordDate), getPermissionMap(["outlet_daily_record.update", "outlet_daily_record.qty_sent"])]);
  const requestedBranchId = filters.branch_id?.trim() ?? "";
  const selectedBranchId = options.branches.some((branch) => branch.id === requestedBranchId)
    ? requestedBranchId
    : options.defaultBranchId;
  const formId = "outlet-daily-record-form";
  const disabled = !options.products.length || !options.branches.length;
  const canEnterOutlet = permissions["outlet_daily_record.update"];
  const canEditQtySent = permissions["outlet_daily_record.qty_sent"];
  const needsKitchenQtySent = canEnterOutlet && !canEditQtySent;
  const saveGuidance = disabled
    ? !options.branches.length
      ? "Saving is unavailable because no outlet is available for this account. Contact an administrator to check your outlet assignment, then reload this page."
      : "Saving is unavailable because no active products are available. Contact an administrator or an authorised product manager to configure sellable products, then reload this page."
    : needsKitchenQtySent
      ? "You can save Received and Wastage now while Kitchen confirms Qty Sent. Kitchen confirmation is required to complete the record, not to save your outlet entry."
      : canEnterOutlet
        ? "Finish the outlet values and mark the record Ready to post."
        : "Confirm the quantities sent to the outlet.";
  const primaryAction = canEnterOutlet
    ? needsKitchenQtySent
      ? <SubmitButton form={formId} name="target_status" value="draft" className="w-full gap-2" pendingLabel="Saving entry…" disabled={disabled} aria-describedby="outlet-save-guidance"><Save className="h-4 w-4" aria-hidden="true" />Save Outlet Entry</SubmitButton>
      : <SubmitButton form={formId} name="target_status" value="evening_completed" className="w-full gap-2" disabled={disabled} aria-describedby="outlet-save-guidance"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Mark Ready to Post</SubmitButton>
    : <SubmitButton form={formId} name="target_status" value="morning_recorded" className="w-full gap-2" disabled={disabled} aria-describedby="outlet-save-guidance"><Send className="h-4 w-4" aria-hidden="true" />Confirm Qty Sent</SubmitButton>;
  const secondaryActions = <SubmitButton form={formId} name="target_status" value="draft" variant="outline" className="w-full gap-2" disabled={disabled} aria-describedby="outlet-save-guidance"><Save className="h-4 w-4" aria-hidden="true" />Save Draft</SubmitButton>;
  const sidePanel = <>
    <DocumentActionSection description={saveGuidance} moreOptions={<div className="grid gap-3">{secondaryActions}</div>}>{primaryAction}</DocumentActionSection>
    <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{needsKitchenQtySent ? "Received and Wastage remain editable. Kitchen or an authorised company-wide user must confirm Qty Sent before the record can be completed." : "Any invalid line will be highlighted before completion. Qty Sent must be confirmed by Kitchen or an authorised company-wide user first."}</p></DocumentSideSection>
  </>;

  return <DocumentWorkspace
    breadcrumbs={[{ label: "Outlet Daily Records", href: "/outlet-daily-records" }, { label: "New" }]}
    documentNo="New Outlet Daily Record"
    title="Outlet Daily Record"
    status="draft"
    mobileStatusOnly
    branch={options.branches.find((branch) => branch.id === selectedBranchId)?.branch_name}
    workflowSteps={dailySteps}
    hideWorkflow
    hideMobileHeader
    currentStatus="draft"
    mobileContextDate={recordDate}
    sidePanel={sidePanel}
    mobilePrimaryAction={primaryAction}
    mobileActionHint={<span id="outlet-save-guidance" role="status">{saveGuidance}</span>}
    mobileMoreOptions={<DocumentMoreOptions><div className="grid gap-3">{secondaryActions}</div></DocumentMoreOptions>}
    tabletRailMode="split"
  >
    <ActionErrorNotice message={filters.error} />
    <OutletDailyRecordForm formId={formId} action={saveOutletDailyRecord} branches={options.branches} products={options.products} branchId={selectedBranchId} recordDate={recordDate} defaultsByBranch={options.defaultsByBranch} validationError={filters.error} canEditQtySent={canEditQtySent} canEditOutletValues={canEnterOutlet} />
  </DocumentWorkspace>;
}
