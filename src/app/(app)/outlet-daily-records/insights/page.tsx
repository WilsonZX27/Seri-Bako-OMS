import { ChartNoAxesCombined, Package, Store, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceTabs } from "@/components/ui/workspace-tabs";
import { OutletDailyWorkspaceNav } from "@/components/outlet-daily-workspace-nav";
import { OutletDailyWastageOverview } from "@/components/outlet-daily-wastage-overview";
import { OutletDailyWastageChart } from "@/components/outlet-daily-wastage-chart";
import { OutletDailyCompletionMatrix } from "@/components/outlet-daily-completion-matrix";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/system-states";
import { getOutletDailyDemandTrend, getOutletDailyCompletionMatrix, getOutletDailyFormOptions, getOutletDailyWastageCostSummary } from "@/server/queries/outlet-daily-records";
import { hasPermission } from "@/server/auth/permissions";
import { todayInKualaLumpur } from "@/lib/business-date";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { logServerError } from "@/server/observability/logger";

export default async function OutletDailyInsightsPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
 const filters=await searchParams;
 const report=["products","trend","completion"].includes(filters.report??"")?filters.report!:"outlets";
 const end=filters.history_date??todayInKualaLumpur();
 const [options,canCreate,result]=await Promise.all([
  getOutletDailyFormOptions(),hasPermission("outlet_daily_record.create"),
  Promise.allSettled([report==="completion"?getOutletDailyCompletionMatrix({branch:filters.branch,history_date:end}):getOutletDailyDemandTrend({period:"7",branch:filters.branch,history_date:end})]),
 ]);
 const loaded=result[0];
 if(loaded.status==="rejected")logServerError(loaded.reason,{source:"page.outletDailyInsights"});
 const trend=report!=="completion"&&loaded.status==="fulfilled"?loaded.value as Awaited<ReturnType<typeof getOutletDailyDemandTrend>>:null;
 const completion=report==="completion"&&loaded.status==="fulfilled"?loaded.value as Awaited<ReturnType<typeof getOutletDailyCompletionMatrix>>:null;
 const canViewWastageCost=await hasPermission("outlet_daily_record.view_all");
 const wastageCost=canViewWastageCost?await getOutletDailyWastageCostSummary():null;
 const params=new URLSearchParams({history_date:end,...(filters.branch?{branch:filters.branch}:{})});
 const tabs=[{id:"outlets",label:"By outlet",icon:Store},{id:"products",label:"By product",icon:Package},{id:"trend",label:"Trend",icon:ChartNoAxesCombined},{id:"completion",label:"Completion",icon:ClipboardCheck}].map(t=>({...t,href:`/outlet-daily-records/insights?${params}&report=${t.id}`}));
 return <><PageHeader title="Outlet Daily Records" description="Food wastage and submission insights." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" rightRail={<><ConsoleSection title="Report coverage"><p className="text-xs">Seven days ending {formatDateOnly(end)} · food only.</p>{trend?<><p className="mt-2 text-xs">{trend.coverage.completed} completed of {trend.coverage.expected} outlet-days.</p><p className="mt-2 text-xs text-muted-foreground">Completed food records only.</p></>:null}</ConsoleSection>{canViewWastageCost&&wastageCost?<ConsoleSection title="Today's wastage value"><p className="flex justify-between text-xs"><span>Costed amount</span><strong>{wastageCost.amount===null?"Unavailable":`RM ${wastageCost.amount.toFixed(2)}`}</strong></p><p className="mt-2 text-xs text-muted-foreground">{wastageCost.amount===null&&wastageCost.state==="verified"?"No completed wastage recorded today":wastageCost.state==="verified"?`${wastageCost.priced_lines} costed lines`:wastageCost.state==="partial"?`${wastageCost.unavailable_lines} lines missing recipe cost`:"No active recipe cost snapshot"}</p></ConsoleSection>:null}</>}>
  <OutletDailyWorkspaceNav current="insights"/>
  <FilterBar resultCount={options.branches.length} resultLabel="outlets" resetHref="/outlet-daily-records/insights" filtered={!!filters.branch||!!filters.history_date} phonePrimary="drawer">
   <input type="hidden" name="report" value={report}/><Input name="history_date" type="date" aria-label="History end date" defaultValue={end}/>
   <SelectControl name="branch" value={filters.branch??"all"} ariaLabel="Outlet" options={[{value:"all",label:"All outlets"},...options.branches.map(b=>({value:b.id,label:b.branch_name}))]}/><Button type="submit" variant="secondary">View</Button>
  </FilterBar>
  <WorkspaceTabs label="Insight report" current={report} items={tabs}/>
  {trend?<dl className="sb-work-surface grid grid-cols-3 divide-x divide-[var(--sb-border-soft)] text-xs">{[{label:"Received",value:formatNumber(trend.summary.received)},{label:"Wastage",value:formatNumber(trend.summary.wastage)},{label:"Wastage rate",value:trend.summary.received>0?`${new Intl.NumberFormat("en-MY",{maximumFractionDigits:1}).format(trend.summary.wastage/trend.summary.received*100)}%`:"—"}].map(m=><div key={m.label} className="p-3"><dt className="text-muted-foreground">{m.label}</dt><dd className="mt-1 text-base font-semibold tabular-nums">{trend.coverage.reliable_lines?m.value:"—"}</dd></div>)}</dl>:null}
  {loaded.status==="rejected"?<Notice tone="warning" title="Insight unavailable">Reload to retry.</Notice>:report==="completion"?<OutletDailyCompletionMatrix dates={completion?.dates??[]} rows={completion?.rows??[]} summary={completion?.summary??null} canCreate={canCreate}/>:report==="trend"?<OutletDailyWastageChart points={trend?.daily??[]} branch={filters.branch}/>:<OutletDailyWastageOverview trend={trend} view={report==="products"?"products":"outlets"}/>}
 </WorkspaceGrid></>;
}
