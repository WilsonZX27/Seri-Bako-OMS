import { OutstandingDailyRecords } from "@/components/outstanding-daily-records";
import { insightPeriod, insightRange, insightDelta } from "@/lib/outlet-insight-period";
import { addDays } from "@/lib/production-planning/forecast";
import { ChartNoAxesCombined, Package, Store, ClipboardCheck, Search } from "lucide-react";
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
import { getOutletDailyHistoricalContext, getOutletDailyDemandTrend, getOutletDailyCompletionMatrix, getOutletDailyFormOptions, getOutletDailyWastageCostSummary } from "@/server/queries/outlet-daily-records";
import { hasPermission } from "@/server/auth/permissions";
import { todayInKualaLumpur } from "@/lib/business-date";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { logServerError } from "@/server/observability/logger";

export default async function OutletDailyInsightsPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
 const filters=await searchParams;
 const report=["products","trend","completion"].includes(filters.report??"")?filters.report!:"outlets";
 const end=filters.history_date??addDays(todayInKualaLumpur(),-1);
 const period=insightPeriod(filters.period);
 const range=insightRange(period,end);
 const compare=filters.compare!=="none";
 const [options,canCreate,result,cost,previousResult,historyResult]=await Promise.all([
  getOutletDailyFormOptions(),hasPermission("outlet_daily_record.create"),
  Promise.allSettled([report==="completion"?getOutletDailyCompletionMatrix({period,branch:filters.branch,history_date:end}):getOutletDailyDemandTrend({period,branch:filters.branch,history_date:end})]),
  hasPermission("outlet_daily_record.view_all").then(async allowed => ({allowed, summary: allowed ? await getOutletDailyWastageCostSummary(end) : null})),
  compare&&report!=="completion"?Promise.allSettled([getOutletDailyDemandTrend({period,branch:filters.branch,history_date:range.previousEnd,history_start:range.previousStart})]):Promise.resolve([]),
  Promise.allSettled([getOutletDailyHistoricalContext()]),
 ]);
 const history=historyResult[0].status==="fulfilled"?historyResult[0].value:null;
 if(historyResult[0].status==="rejected")logServerError(historyResult[0].reason,{source:"page.outletDailyInsights.history"});
 const loaded=result[0];
 if(loaded.status==="rejected")logServerError(loaded.reason,{source:"page.outletDailyInsights"});
 const trend=report!=="completion"&&loaded.status==="fulfilled"?loaded.value as Awaited<ReturnType<typeof getOutletDailyDemandTrend>>:null;
 const completion=report==="completion"&&loaded.status==="fulfilled"?loaded.value as Awaited<ReturnType<typeof getOutletDailyCompletionMatrix>>:null;
 const previous=previousResult[0]?.status==="fulfilled"?previousResult[0].value:null;
 const canViewWastageCost=cost.allowed;
 const wastageCost=cost.summary;
 const params=new URLSearchParams({history_date:end,period,compare:compare?"previous":"none",...(filters.branch?{branch:filters.branch}:{})});
 const tabs=[{id:"outlets",label:"By outlet",icon:Store},{id:"products",label:"By product",icon:Package},{id:"trend",label:"Trend",icon:ChartNoAxesCombined},{id:"completion",label:"Completion",icon:ClipboardCheck}].map(t=>({...t,href:`/outlet-daily-records/insights?${params}&report=${t.id}`}));
 return <><PageHeader title="Outlet Daily Records" description="Food wastage and submission insights." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" rightRail={<><ConsoleSection title="Report coverage"><p className="text-xs">{formatDateOnly(range.start)} - {formatDateOnly(end)} · food only.</p>{trend?<><p className="mt-2 text-xs">{trend.coverage.completed} completed of {trend.coverage.expected} outlet-days.</p><p className="mt-2 text-xs text-muted-foreground">Completed food records only.</p>{previous?<p className="mt-2 text-xs">Previous period: {previous.coverage.completed}/{previous.coverage.expected} completed outlet-days.</p>:null}</>:null}</ConsoleSection>{canViewWastageCost&&wastageCost?<ConsoleSection title="Period end wastage value"><p className="flex min-w-0 items-start justify-between gap-3 text-xs"><span className="min-w-0 break-words">Costed amount</span><strong className="shrink-0 text-right tabular-nums">{wastageCost.amount===null?"Unavailable":`RM ${wastageCost.amount.toFixed(2)}`}</strong></p><p className="mt-2 text-xs text-muted-foreground">{wastageCost.amount===null&&wastageCost.state==="verified"?"No completed wastage recorded on this date":wastageCost.state==="verified"?`${wastageCost.priced_lines} costed lines`:wastageCost.state==="partial"?`${wastageCost.unavailable_lines} lines missing recipe cost`:"No active recipe cost snapshot"}</p></ConsoleSection>:null}{history?<OutstandingDailyRecords history={history}/>:<ConsoleSection title="Outstanding daily records"><p className="text-xs">Unavailable. Reload to retry.</p></ConsoleSection>}</>}>
  <OutletDailyWorkspaceNav current="insights"/>
  <FilterBar resultCount={!filters.branch || filters.branch === "all" ? options.branches.length : options.branches.some(branch => branch.id === filters.branch) ? 1 : 0} resultLabel="outlets" resetHref="/outlet-daily-records/insights" filtered={!!filters.branch||!!filters.history_date} phonePrimary="drawer" actions={<Button type="submit" variant="secondary"><Search aria-hidden="true"/>View</Button>}>
   <SelectControl name="period" value={period} ariaLabel="Report period" options={[{value:"1",label:"1 day"},{value:"7",label:"7 days"},{value:"30",label:"30 days"},{value:"month",label:"Month to date"}]}/><SelectControl name="compare" value={compare?"previous":"none"} ariaLabel="Compare period" options={[{value:"previous",label:"Previous equal period"},{value:"none",label:"No comparison"}]}/>
   <input type="hidden" name="report" value={report}/><Input name="history_date" type="date" aria-label="History end date" defaultValue={end}/>
   <SelectControl name="branch" value={filters.branch??"all"} ariaLabel="Outlet" options={[{value:"all",label:"All outlets"},...options.branches.map(b=>({value:b.id,label:b.branch_name}))]}/>
  </FilterBar>
  <WorkspaceTabs prefetchOnIntent label="Insight report" current={report} items={tabs}/>
  {trend?<><dl className="sb-work-surface grid grid-cols-3 divide-x divide-[var(--sb-border-soft)] text-xs">{[{label:"Received",current:trend.summary.received,prior:previous?.summary.received,rate:false},{label:"Wastage",current:trend.summary.wastage,prior:previous?.summary.wastage,rate:false},{label:"Wastage rate",current:trend.summary.received>0?trend.summary.wastage/trend.summary.received*100:null,prior:previous&&previous.summary.received>0?previous.summary.wastage/previous.summary.received*100:null,rate:true}].map(metric=>{const current=trend.coverage.reliable_lines?metric.current:null;const prior=previous?.coverage.reliable_lines?metric.prior??null:null;const delta=insightDelta(current,prior);return <div key={metric.label} className="p-3"><dt className="text-muted-foreground">{metric.label}</dt><dd className="mt-1 text-base font-semibold tabular-nums">{current===null?"—":`${formatNumber(current)}${metric.rate?"%":""}`}</dd>{compare?<><p className="mt-1 text-muted-foreground">Previous {prior===null?"—":`${formatNumber(prior)}${metric.rate?"%":""}`}</p><p className={`mt-1 tabular-nums ${metric.label!=="Received"&&delta?.absolute?delta.absolute>0?"text-[var(--sb-danger)]":"text-[var(--sb-success)]":"text-muted-foreground"}`}>{delta?`${delta.absolute>0?"+":""}${formatNumber(delta.absolute)}${metric.rate?" pp":delta.percent===null?" · no % baseline":` (${delta.percent>0?"+":""}${formatNumber(delta.percent)}%)`}`:"No comparable data"}</p></>:null}</div>;})}</dl>{compare?<p className="text-xs text-muted-foreground">{formatDateOnly(range.start)} - {formatDateOnly(end)} versus {formatDateOnly(range.previousStart)} - {formatDateOnly(range.previousEnd)}. {trend.coverage.completed<trend.coverage.expected||!previous||previous.coverage.completed<previous.coverage.expected?"Partial coverage: changes compare recorded totals, not a complete like-for-like period.":"Both periods have complete outlet-day coverage."}</p>:null}{compare&&previousResult[0]?.status==="rejected"?<Notice tone="warning" title="Comparison unavailable">The current period is shown. Reload to retry the previous period.</Notice>:null}</>:null}
  {loaded.status==="rejected"?<Notice tone="warning" title="Insight unavailable">Reload to retry.</Notice>:report==="completion"?<OutletDailyCompletionMatrix dates={completion?.dates??[]} rows={completion?.rows??[]} summary={completion?.summary??null} canCreate={canCreate}/>:report==="trend"?<OutletDailyWastageChart points={trend?.daily??[]} branch={filters.branch}/>:<OutletDailyWastageOverview previous={previous?{outlets:previous.outlets,top_wastage_products:previous.top_wastage_products}:null} trend={trend?{outlets:trend.outlets,top_wastage_products:trend.top_wastage_products}:null} view={report==="products"?"products":"outlets"}/>}
 </WorkspaceGrid></>;
}
