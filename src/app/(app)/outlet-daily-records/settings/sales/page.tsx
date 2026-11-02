import Link from "next/link";
import { requirePermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { getOutletSalesChannelSettings } from "@/server/queries/outlet-sales-channel-settings";
import { OutletSalesChannelSettingsForm } from "@/components/outlet-sales-channel-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function SalesChannelSettingsPage() {
  await requirePermission("outlet_daily_record.view");
  const [actor, settings] = await Promise.all([requireActiveTenantActor(), getOutletSalesChannelSettings()]);
  const canEdit = actor.roleCode === "super_admin";
  return <><PageHeader title="Sales channel settings" description="Outlet Daily Records" />
    <WorkspaceGrid rightRail={<ConsoleSection title="Settings actions" kind="action">{canEdit ? <SubmitButton data-mobile-primary-action form="outlet-sales-channel-settings" className="w-full">Save channel settings</SubmitButton> : null}<Button asChild variant="outline"><Link href="/outlet-daily-records/settings">Back to Settings</Link></Button></ConsoleSection>}>
      <OutletSalesChannelSettingsForm settings={settings} canEdit={canEdit} />
    </WorkspaceGrid>
  </>;
}
