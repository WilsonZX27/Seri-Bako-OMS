import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus } from "lucide-react";
import { AssetDestinationRow } from "@/components/asset-destination-row";
import Link from "next/link";
import { requireAssetDestinationManager } from "@/server/auth/asset-settings";
import { hasPermission } from "@/server/auth/permissions";
import { getAssetOtherLocations } from "@/server/queries/asset-settings";
import { AssetWorkspaceNavigation } from "@/components/asset-workspace-navigation";
import { AssetOtherLocationForm } from "@/components/asset-other-location-form";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/sortable-table";

export default async function AssetSettingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await requireAssetDestinationManager();
  const canCreate = actor.roleCode === "super_admin" && await hasPermission("assets.manage");
  const params = await searchParams;
  let data: Awaited<ReturnType<typeof getAssetOtherLocations>> | null = null;
  try { data = await getAssetOtherLocations(Number.parseInt(params.page ?? "1", 10)); } catch { /* Render unavailable, never a fabricated empty list. */ }
  return <><PageHeader title="Asset Management" description="Settings" />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Asset actions" kind="action"><div className="grid gap-2">{canCreate ? <Button asChild><Link href="/asset-management/import">Import assets from Excel</Link></Button> : null}<Button asChild variant="outline"><Link href="/asset-management?view=assets">Asset register</Link></Button><Button asChild variant="outline"><Link href="/asset-management?view=transfers">Transfers</Link></Button></div></ConsoleSection>
      <ConsoleSection title="Destination management"><p className="text-xs text-muted-foreground">Complete in-progress transfers and clear remaining assets before deactivating a destination.</p><p className="mt-2 text-xs text-muted-foreground">Existing records and history remain available.</p></ConsoleSection>
    </>}>
      <AssetWorkspaceNavigation current="settings" managementRole canSettings />
      <div className="min-w-0 space-y-4">{canCreate ? <section className="sb-work-surface flex flex-wrap items-center justify-between gap-3 bg-white p-4"><div><h2 className="text-sm font-semibold">Asset import</h2><p className="mt-1 text-xs text-muted-foreground">Download the workbook, prepare your assets and review before saving.</p></div><Button asChild variant="outline"><Link href="/asset-management/import">Open import</Link></Button></section> : null}
        <section className="sb-work-surface min-w-0 overflow-hidden bg-white px-4 sm:px-5" aria-labelledby="destinations-title">
          <div className="pb-3 pt-5"><h2 id="destinations-title" className="text-sm font-semibold">Asset destinations</h2><p className="mt-1 text-xs text-muted-foreground">Manage hostels and storage locations. Deactivating a destination keeps its assets and history.</p></div>
          {!data ? <p role="alert" className="p-3 text-sm">Destinations could not be loaded. <Link className="underline" href="/asset-management/settings">Try again</Link></p> : <>
            <ul className="divide-y">{data.rows.map(row => <AssetDestinationRow key={`${row.id}:${row.settings_revision}`} row={row}/>)}</ul>
            {!data.rows.length ? <p className="p-3 text-sm text-muted-foreground">{data.total ? "No destinations on this page." : "No other destinations yet. Add a hostel or storage location."}</p> : null}
            {data.total > 50 ? <PaginationControls page={data.page} totalPages={Math.ceil(data.total / 50)} totalRows={data.total} searchParams={{}} /> : null}
          </>}
        </section>
        {canCreate ? <details className="group sb-work-surface min-w-0 bg-white px-4 sm:px-5" open><summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden"><Plus className="size-4" aria-hidden="true"/>New destination<ChevronDown className="ml-auto size-4 group-open:rotate-180" aria-hidden="true"/></summary><div className="pb-5"><AssetOtherLocationForm horizontal /></div></details> : null}
      </div>
    </WorkspaceGrid>
  </>;
}
