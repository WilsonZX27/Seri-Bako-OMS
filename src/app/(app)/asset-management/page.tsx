import { PaginationControls } from "@/components/sortable-table";
import { ConsoleActionLink } from "@/components/layout/console-action-link";
import { AssetRegisterRows, AssetMaintenanceQueue, AssetDailyCheckLocations } from "@/components/asset-workspace-lists";
import { AssetOperatingDayForm } from "@/components/asset-operating-day-form";
import { canAccessAssetManagement } from "@/lib/asset-access";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { redirect } from "next/navigation";
import { hasPermission } from "@/server/auth/permissions";
import { todayInKualaLumpur } from "@/lib/business-date";
import { AssetHistoryTrend } from "@/components/asset-history-trend";
import Link from "next/link";
import { Box, ChartNoAxesColumn, ClipboardCheck, Wrench, ArrowLeftRight } from "lucide-react";
import { InteractiveRankingChart } from "@/components/ui/interactive-ranking-chart";
import { PageHeader } from "@/components/ui/page-header";
import { AssetWorkspaceNavigation } from "@/components/asset-workspace-navigation";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { SelectNative } from "@/components/ui/select-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber, formatDateOnly } from "@/lib/utils";
import { getAssetWorkspace, type AssetView } from "@/server/queries/assets";

const tabs = [{ id: "overview", label: "Overview", icon: ChartNoAxesColumn }, { id: "assets", label: "Assets", icon: Box }, { id: "checklist", label: "Daily Checklist", icon: ClipboardCheck }, { id: "maintenance", label: "Maintenance", icon: Wrench }, { id: "transfers", label: "Transfers", icon: ArrowLeftRight }];

function SourceDetails({ data }: { data: Record<string, unknown> }) {
  return <details className="min-w-0"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium">Original details</summary><dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">{Object.entries(data).filter(([key, value]) => !key.startsWith("_") && value !== null && value !== "").map(([key, value]) => <div className="min-w-0" key={key}><dt className="text-muted-foreground">{key}</dt><dd className="break-words">{String(value)}</dd></div>)}</dl></details>;
}

export default async function AssetManagementPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string; q?: string; date?: string; status?: string; location?: string; sort?: string; category?: string }> }) {
  const params = await searchParams;
  const actor = await requireActiveTenantActor();
  const managementRole = canAccessAssetManagement(actor.roleCode);
  const availableTabs = tabs.filter(tab => managementRole || !["overview", "maintenance"].includes(tab.id));
  if (!managementRole && ["overview", "maintenance"].includes(params.view ?? "")) redirect("/asset-management?view=checklist");
  const view = (availableTabs.some(t => t.id === params.view) ? params.view : managementRole ? "overview" : "checklist") as AssetView;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const query = (params.q ?? "").slice(0, 120);
  const status = (params.status ?? "").slice(0, 40);
  const locationId = (params.location ?? "").slice(0, 36);
  const sort = params.sort === "name" ? "name" : "code";
  const data = await getAssetWorkspace(view, page, query, params.date, status, locationId, sort, (params.category ?? "").slice(0,80));
  const canManage = await hasPermission("assets.manage");
  const canTransfer = await hasPermission("assets.transfer");
  const locations = new Map(data.locations.map(l => [l.id, l.source_name]));
  const assets = new Map(data.assets.map(a => [a.id, a]));
  const checkLocations = data.overview?.checklist.filter(location => !locationId || location.id === locationId) ?? [];
  const recordContent = <>
      <section className="sb-work-surface divide-y" aria-label={tabs.find(t => t.id === view)?.label}>
        {view === "assets" ? <AssetRegisterRows assets={data.assets} holdings={data.holdings} locations={locations}/> : view === "maintenance" ? <AssetMaintenanceQueue records={data.records} assets={assets} locations={locations}/> : data.records.map(record => <article className="min-w-0 p-3" key={record.id}><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><Link className="font-medium underline" href={view === "transfers" ? `/asset-management/transfers/${record.id}` : `/asset-management/assets/${record.asset_id}`}>{assets.get(record.asset_id)?.item_name ?? "Unavailable asset"}</Link><p className="text-xs text-muted-foreground">{assets.get(record.asset_id)?.asset_code} · {record.location_id ? locations.get(record.location_id) : `${locations.get(record.from_location_id ?? "") ?? "Restricted location"} → ${locations.get(record.to_location_id ?? "") ?? "Restricted location"}`}</p></div><span className="text-sm font-medium">{record.result ?? record.status}</span></div><p className="mt-2 text-sm">{record.description ?? record.reason}</p><p className="mt-1 text-xs text-muted-foreground">{record.check_date ? formatDateOnly(record.check_date) : String(record.source_data["Created Date"] ?? record.created_at ?? "").slice(0, 10)} · {record.author_name}{record.quantity !== undefined ? ` · Qty ${record.quantity === null ? "Unknown" : formatNumber(record.quantity)}` : ""}</p><SourceDetails data={record.source_data} /></article>)}
        {data.total === 0 ? view === "checklist" ? <p className="p-3 text-sm text-muted-foreground">No recorded inspections for this date and location.</p> : <EmptyState title="No records" description="Imported and confirmed asset records will appear here." /> : null}
        {data.total > 50 ? <PaginationControls page={page} totalPages={Math.ceil(data.total / 50)} totalRows={data.total} searchParams={{...params,view,sort}} resetScrollOnPageChange /> : null}
      </section>
  </>;
  return <><PageHeader title="Asset Management" description="Assets, checks, maintenance and transfers." /><WorkspaceGrid rightRail={<>
    <ConsoleSection title={availableTabs.find(tab=>tab.id===view)?.label ?? "Assets"} kind="action">
      {view === "overview" ? <><p>Check today’s outstanding locations and open requests in the main workspace.</p><Button asChild><Link href="/asset-management?view=checklist">Inspect a location</Link></Button></> : null}
      {view === "assets" && canManage ? <ConsoleActionLink href="/asset-management/assets/new" kind="create" primary>New asset</ConsoleActionLink> : null}
      {view === "transfers" && canTransfer ? <><p>Choose an asset and its source holding to request a transfer.</p><ConsoleActionLink href="/asset-management/transfers/new" kind="create" primary>Create transfer</ConsoleActionLink></> : null}
      {view === "checklist" ? <p>Choose a location to inspect. Existing exceptions are preserved when selecting all assets.</p> : null}
      {view === "maintenance" ? <p>Open a request to review the problem, add an update or change its status.</p> : null}
    </ConsoleSection><ConsoleSection title="Current scope"><p>{data.locations.length} accessible locations</p><p>Unknown quantities are shown separately from recorded zero.</p></ConsoleSection>
  </>} tabletRailMode="context">
    <AssetWorkspaceNavigation current={view} managementRole={managementRole}/>
    {!data.active ? <EmptyState title="Asset migration pending" description="Reconcile the source and attachments before enabling the asset workspace."/> : view === "overview" && data.overview ? <><FilterBar className="sb-asset-query" phoneMode="inline" resetHref="/asset-management?view=overview"><input type="hidden" name="view" value="overview"/><Input name="date" type="date" defaultValue={data.overview.checkDate} max={todayInKualaLumpur()} className="max-w-48" aria-label="Overview date"/></FilterBar>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-y px-1 py-3 sm:grid-cols-3 lg:grid-cols-6">{[["Asset IDs", data.overview.assetCount], ["Known quantity", data.overview.knownQuantity], ["Unknown quantities", data.overview.unknownHoldings], ["Needs attention", data.overview.attentionAssets], ["Open maintenance", data.overview.openMaintenance], ["Quantity in transit", data.overview.inTransitQuantity]].map(([label, count]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(Number(count))}</dd></div>)}</dl>
      <section className="sb-work-surface"><div className="flex flex-wrap items-center justify-between gap-2 border-b p-3"><h2 className="text-sm font-semibold">Location checks</h2><span className="text-xs text-muted-foreground">{formatDateOnly(data.overview.checkDate)} · {data.overview.checklist.filter(location => location.open && location.checked < location.expected).length} outstanding</span></div><AssetDailyCheckLocations locations={data.overview.checklist} date={data.overview.checkDate}/></section>
      <section className="sb-work-surface"><h2 className="p-4 text-sm font-semibold">Open maintenance requests · {data.records.length}</h2><AssetMaintenanceQueue records={data.records} assets={assets} locations={locations}/>{!data.records.length ? <p className="p-4 text-sm text-muted-foreground">No open maintenance requests.</p> : null}</section>
      <section aria-label="Asset distribution and trends" className="space-y-3"><h2 className="text-sm font-semibold">Asset distribution &amp; trends</h2><div className="grid gap-3"><section className="sb-work-surface min-w-0 p-3"><h2 className="mb-3 text-sm font-semibold">Assets by location</h2>{data.overview.locations.length ? <InteractiveRankingChart ariaLabel="Asset IDs by location" idlePrompt="Select a location to inspect its holdings." items={[...data.overview.locations].sort((a,b)=>b.assetCount-a.assetCount || a.name.localeCompare(b.name)).map(l=>({id:l.id,label:l.name,value:l.assetCount,formattedValue:formatNumber(l.assetCount),details:[`${l.quantity===null?"Unknown":formatNumber(l.quantity)} known units`],href:`/asset-management/locations/${l.id}`}))} /> : <EmptyState title="No assets imported" description="Complete source reconciliation before enabling asset operations." />}{data.overview.locations.length > 5 ? <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center text-xs font-medium">All {data.overview.locations.length} locations</summary><ul className="divide-y">{data.overview.locations.map(location => <li key={location.id}><Link className="flex min-h-11 items-center justify-between gap-3 text-xs" href={`/asset-management/locations/${location.id}`}><span>{location.name}</span><strong>{location.assetCount}</strong></Link></li>)}</ul></details> : null}</section>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2"><section className="sb-work-surface min-w-0 p-4"><h2 className="mb-3 text-sm font-semibold">Maintenance requests · 14 days</h2><AssetHistoryTrend points={data.overview.maintenanceTrend} kind="maintenance"/></section><section className="sb-work-surface min-w-0 p-4"><h2 className="mb-3 text-sm font-semibold">Asset exceptions · 14 days</h2><AssetHistoryTrend points={data.overview.issueTrend} kind="checklist"/><p className="mt-2 text-xs text-muted-foreground">Gaps mean no checks recorded.</p></section></div></div></section>
    </> : <>
      <FilterBar className="sb-asset-query" resultCount={view === "checklist" ? checkLocations.length : data.total} resultLabel={view === "checklist" ? "locations" : undefined} resetHref={`/asset-management?view=${view}`} filtered={Boolean(query || params.date || status || locationId || params.category || sort !== "code")} activeCount={[query, params.date, status, locationId, params.category, sort !== "code" ? sort : ""].filter(Boolean).length}><input type="hidden" name="view" value={view}/>{view === "assets" ? <Input type="search" name="q" defaultValue={query} placeholder="Find asset" aria-label="Find asset"/> : null}{view !== "transfers" ? data.locations.length > 1 ? <SelectNative name="location" defaultValue={locationId} aria-label="Asset location"><option value="">All locations</option>{data.locations.map(location => <option key={location.id} value={location.id}>{location.source_name}</option>)}</SelectNative> : <span className="flex min-h-11 items-center text-xs font-medium">{data.locations[0]?.source_name ?? "No accessible location"}</span> : null}{params.date || view === "checklist" ? <Input type="date" name="date" defaultValue={params.date ?? todayInKualaLumpur()} aria-label="Record date" className="max-w-48"/> : null}{view === "assets" ? <><SelectNative name="status" defaultValue={status} aria-label="Asset status"><option value="">All statuses</option>{data.filterOptions.statuses.map(value=><option key={value}>{value}</option>)}</SelectNative><FilterBarMore resetHref="/asset-management?view=assets" activeCount={[params.category,sort !== "code" ? sort : ""].filter(Boolean).length}><SelectNative name="category" defaultValue={params.category ?? ""} aria-label="Asset category"><option value="">All categories</option>{data.filterOptions.categories.map(value=><option key={value}>{value}</option>)}</SelectNative><SelectNative name="sort" defaultValue={sort} aria-label="Sort assets"><option value="code">Asset ID</option><option value="name">Asset name</option></SelectNative></FilterBarMore></> : null}{view === "maintenance" || view === "transfers" ? <SelectNative name="status" defaultValue={status} aria-label="Record status"><option value="">All statuses</option>{[...new Set([...(view === "maintenance" ? ["Open", "Assigned", "Closed", "Resolved", "Cancelled"] : ["requested", "approved", "rejected", "dispatched", "received"]), ...(status ? [status] : [])])].map(value => <option key={value} value={value}>{value}</option>)}</SelectNative> : null}</FilterBar>
      {view === "checklist" && data.overview ? <><section className="sb-work-surface"><h2 className="p-3 text-sm font-semibold">Daily checks · {formatDateOnly(data.overview.checkDate)}</h2><AssetDailyCheckLocations locations={checkLocations} date={data.overview.checkDate}/></section>{canManage ? <AssetOperatingDayForm key={data.overview.checkDate} locations={data.locations} today={todayInKualaLumpur()}/> : null}</> : null}
      {view === "checklist" ? <details className="sb-work-surface p-3" open={page > 1}><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Recorded inspections · {data.total}</summary>{recordContent}</details> : recordContent}
    </>}
  </WorkspaceGrid></>;
}
