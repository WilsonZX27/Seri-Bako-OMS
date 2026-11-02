import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Button } from "@/components/ui/button";
import { OutletDailyWorkspaceNav } from "@/components/outlet-daily-workspace-nav";
import { getPermissionMap, requirePermission } from "@/server/auth/permissions";
import { salesChannelLabels, cardChannels, otherChannels } from "@/lib/outlet-sales-channels";

export default async function OutletDailySettingsPage() {
  await requirePermission("outlet_daily_record.view");
  const permissions = await getPermissionMap(["production.view", "production.create", "outlet_daily_record.qty_sent"]);
  return <><PageHeader title="Outlet Daily Records" description="Settings" />
    <WorkspaceGrid rightRail={<ConsoleSection title="Daily record actions"><Button asChild variant="outline"><Link href="/outlet-daily-records">Daily Records</Link></Button></ConsoleSection>}>
      <OutletDailyWorkspaceNav current="settings" />
      <div className="min-w-0 space-y-4">
        <section className="erp-surface divide-y" aria-labelledby="daily-product-settings"><div className="p-4"><h2 id="daily-product-settings" className="text-sm font-semibold">Products and availability</h2><p className="mt-2 text-xs text-muted-foreground">Products use the menu’s daily tracking type and seasonal dates, including both start and end dates. Existing record lines remain in history when a season ends.</p></div><div className="p-4">{permissions["production.view"] ? <Button asChild variant="outline"><Link href="/products">{permissions["production.create"] ? "Manage products" : "View products"}</Link></Button> : <p className="text-xs text-muted-foreground">Ask an authorised product manager to change product tracking or seasonal dates.</p>}</div></section>
        <section className="erp-surface p-4" aria-labelledby="sent-settings"><h2 id="sent-settings" className="text-sm font-semibold">Qty Sent review</h2><p className="mt-2 text-xs text-muted-foreground">Verified Received can prefill missing Qty Sent as a draft. Check each row or correct the quantity before confirming. Existing dispatch entries and Delivery Order quantities are preserved.</p><p className="mt-2 text-xs">{permissions["outlet_daily_record.qty_sent"] ? "Your account can enter and confirm Qty Sent." : "Your account cannot enter Qty Sent. Ask an authorised Manager, Finance or Kitchen user."}</p></section>
        <section className="erp-surface p-4" aria-labelledby="sales-settings"><h2 id="sales-settings" className="text-sm font-semibold">Sales reconciliation channels</h2><Button asChild variant="outline" className="mt-3"><Link href="/outlet-daily-records/settings/sales">Manage sales channels</Link></Button><p className="mt-2 text-xs text-muted-foreground">Cards: {cardChannels.map(channel => salesChannelLabels[channel]).join(", ")}</p><p className="mt-2 text-xs text-muted-foreground">Other: {otherChannels.map(channel => salesChannelLabels[channel]).join(", ")}</p></section>
      </div>
    </WorkspaceGrid>
  </>;
}
