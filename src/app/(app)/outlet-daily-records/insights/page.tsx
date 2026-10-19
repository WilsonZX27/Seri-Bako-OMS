import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { SelectControl } from "@/components/ui/select-control";

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
 const range=insightRange(period,end,filters.history_start);
 const compare=filters.compare!=="none";
 const [options,canCreate,result,cost,previousResult,historyResult]=await Promise.all([
  getOutletDailyFormOptions(),hasPermission("outlet_daily_record.create"),
  Promise.allSettled([report==="completion"?getOutletDailyCompletionMatrix({period,branch:filters.branch,history_date:end,history_start:range.start}):getOutletDailyDemandTrend({period,branch:filters.branch,history_date:end,history_start:range.start})]),
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
 const params=new URLSearchParams({history_date:end,history_start:range.start,period,compare:compare?"previous":"none",...(filters.branch?{branch:filters.branch}:{})});
 const tabs=[{id:"outlets",label:"By outlet",icon:Store},{id:"products",label:"By product",icon:Package},{id:"trend",label:"Trend",icon:ChartNoAxesCombined},{id:"completion",label:"Completion",icon:ClipboardCheck}].map(t=>({...t,href:`/outlet-daily-records/insights?${params}&report=${t.id}`}));
 return <><PageHeader title="Outlet Daily Records" description="Food wastage and submission insights." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" rightRail={<><ConsoleSection title="Report coverage"><p className="text-xs">{formatDateOnly(range.start)} - {formatDateOnly(end)} · food only.</p>{trend?<dl className="mt-2 space-y-2 text-xs"><div className="flex justify-between gap-2"><dt>Completed</dt><dd className="font-semibold">{trend.coverage.completed}/{trend.coverage.expected}</dd></div>{previous?<div className="flex justify-between gap-2"><dt>Previous period</dt><dd>{previous.coverage.completed}/{previous.coverage.expected}</dd></div>:null}</dl>:null}</ConsoleSection>{canViewWastageCost&&wastageCost?<ConsoleSection title="Period end wastage value"><p className="flex min-w-0 items-start justify-between gap-3 text-xs"><span className="min-w-0 break-words">Costed amount</span><strong className="shrink-0 text-right tabular-nums">{wastageCost.amount===null?"Unavailable":`RM ${wastageCost.amount.toFixed(2)}`}</strong></p><p className="mt-2 text-xs text-muted-foreground">{wastageCost.amount===null&&wastageCost.state==="verified"?"No completed wastage recorded on this date":wastageCost.state==="verified"?`${wastageCost.priced_lines} costed lines`:wastageCost.state==="partial"?`${wastageCost.unavailable_lines} lines missing recipe cost`:"No active recipe cost snapshot"}</p></ConsoleSection>:null}{history?<OutstandingDailyRecords history={history}/>:<ConsoleSection title="Outstanding daily records"><p className="text-xs">Unavailable. Reload to retry.</p></ConsoleSection>}</>}>
  <OutletDailyWorkspaceNav current="insights"/>
  <FilterBar resultCount={!filters.branch || filters.branch === "all" ? options.branches.length : options.branches.some(branch => branch.id === filters.branch) ? 1 : 0} resultLabel="outlets" resetHref="/outlet-daily-records/insights" filtered={!!filters.branch||!!filters.history_date||!!filters.history_start} phonePrimary="drawer" >
   <DateRangePicker key={`${range.start}:${end}`} start={range.start} end={end} today={todayInKualaLumpur()}/><SelectControl name="compare" defaultValue={compare?"previous":"none"} ariaLabel="Compare period" options={[{value:"previous",label:"Previous equal period"},{value:"none",label:"No comparison"}]}/>
   <input type="hidden" name="report" value={report}/><Button type="submit" className="unified-list-search-submit" aria-label="Apply filters" title="Apply filters"><Search aria-hidden="true"/></Button>
   <SelectControl name="branch" value={filters.branch??"all"} ariaLabel="Outlet" options={[{value:"all",label:"All outlets"},...options.branches.map(b=>({value:b.id,label:b.branch_name}))]}/>
  </FilterBar>
  <nav aria-label="Report period" className="flex gap-2">{(["7","30"] as const).map(days=><Button key={days} asChild size="sm" variant={range.days===Number(days)?"secondary":"ghost"}><Link href={`/outlet-daily-records/insights?${new URLSearchParams({report,period:days,history_date:end,compare:compare?"previous":"none",...(filters.branch?{branch:filters.branch}:{})})}`}>{days} days</Link></Button>)}</nav>
  <WorkspaceTabs prefetchOnIntent label="Insight report" current={report} items={tabs}/>
  {trend?<><dl className="sb-work-surface grid grid-cols-3 divide-x divide-[var(--sb-border-soft)] text-xs">{[{label:"Received",current:trend.summary.received,prior:previous?.summary.received,rate:false},{label:"Wastage",current:trend.summary.wastage,prior:previous?.summary.wastage,rate:false},{label:"Wastage rate",current:trend.summary.received>0?trend.summary.wastage/trend.summary.received*100:null,prior:previous&&previous.summary.received>0?previous.summary.wastage/previous.summary.received*100:null,rate:true}].map(metric=>{const current=trend.coverage.reliable_lines?metric.current:null;const prior=previous?.coverage.reliable_lines?metric.prior??null:null;const delta=insightDelta(current,prior);return <div key={metric.label} className="p-3"><dt className="text-muted-foreground">{metric.label}</dt><dd className="mt-1 text-base font-semibold tabular-nums">{current===null?"—":`${formatNumber(current)}${metric.rate?"%":""}`}</dd>{compare?<><p className="mt-1 text-muted-foreground">Previous {prior===null?"—":`${formatNumber(prior)}${metric.rate?"%":""}`}</p><p className={`mt-1 tabular-nums ${metric.label!=="Received"&&delta?.absolute?delta.absolute>0?"text-[var(--sb-danger)]":"text-[var(--sb-success)]":"text-muted-foreground"}`}>{delta?`${delta.absolute>0?"+":""}${formatNumber(delta.absolute)}${metric.rate?" pp":delta.percent===null?" · no % baseline":` (${delta.percent>0?"+":""}${formatNumber(delta.percent)}%)`}`:"No comparable data"}</p></>:null}</div>;})}</dl>{compare?<p className="text-xs text-muted-foreground">{formatDateOnly(range.start)} - {formatDateOnly(end)} versus {formatDateOnly(range.previousStart)} - {formatDateOnly(range.previousEnd)}. {trend.coverage.completed<trend.coverage.expected||!previous||previous.coverage.completed<previous.coverage.expected?"Partial coverage: changes compare recorded totals, not a complete like-for-like period.":"Both periods have complete outlet-day coverage."}</p>:null}{compare&&previousResult[0]?.status==="rejected"?<Notice tone="warning" title="Comparison unavailable">The current period is shown. Reload to retry the previous period.</Notice>:null}</>:null}
  {loaded.status==="rejected"?<Notice tone="warning" title="Insight unavailable">Reload to retry.</Notice>:report==="completion"?<OutletDailyCompletionMatrix dates={completion?.dates??[]} rows={completion?.rows??[]} summary={completion?.summary??null} canCreate={canCreate}/>:report==="trend"?<OutletDailyWastageChart points={trend?.daily??[]} branch={filters.branch}/>:<OutletDailyWastageOverview previous={previous?{outlets:previous.outlets,top_wastage_products:previous.top_wastage_products}:null} trend={trend?{outlets:trend.outlets,top_wastage_products:trend.top_wastage_products}:null} view={report==="products"?"products":"outlets"}/>}
 </WorkspaceGrid></>;
}
