import Link from "next/link";
import { getRoManagement } from "@/server/queries/ro-management";
import { getBranchesForSelect } from "@/server/queries/common";
import { hasPermission } from "@/server/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectControl } from "@/components/ui/select-control";
import { PermissionDeniedState } from "@/components/ui/system-states";
import { CompTimeCorrectionForm } from "@/components/attendance/comp-time-correction-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { staffEmploymentStatus } from "@/lib/staff-employment-status";
import { todayInKualaLumpur } from "@/lib/business-date";
const duration=(minutes:number)=>`${minutes} min`;
export default async function RoManagementPage({searchParams}:{searchParams:Promise<{search?:string;branch_id?:string;page?:string}>}){
 const filters=await searchParams,result=await getRoManagement(filters);
 if(!result.allowed)return <PermissionDeniedState/>;
 const [branches,canSubmit,canReview]=await Promise.all([getBranchesForSelect({restrictToActorScope:true}),hasPermission("comp_time.submit"),hasPermission("attendance.read")]);
 const href=(page:number)=>`/people/ro?${new URLSearchParams({search:filters.search??"",branch_id:filters.branch_id??"all",page:String(page)})}`;
 return <><PageHeader title="RO management" description="OT converted to time off. Approved balance and remaining availability." contentWidth="wide"/><WorkspaceGrid hideDesktopConsole hideMobileConsole>
 <form className="sb-list-query-card flex flex-wrap items-center gap-2" action="/people/ro"><Input name="search" defaultValue={filters.search} placeholder="Find employee or staff code" aria-label="Find RO employee" className="min-w-40 flex-1"/><SelectControl name="branch_id" defaultValue={filters.branch_id??"all"} ariaLabel="RO outlet" options={[{value:"all",label:"All authorised outlets"},...branches.map(b=>({value:b.id,label:b.branch_name}))]}/><Button type="submit">Search</Button></form>
 <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" aria-label="RO balances"><div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_auto] gap-3 border-b bg-muted/30 px-4 py-3 text-xs font-medium md:grid"><span>Employee</span><span>Approved</span><span>Available</span><span>Manage</span></div>{result.rows.map(row=><article key={row.id} className="grid items-center gap-3 border-b px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"><div className="min-w-0"><Link href={`/people/${row.id}#time-off`} className="font-medium hover:underline">{row.full_name}</Link><p className="text-xs text-muted-foreground">{row.staff_code??"—"} · {row.branchName}</p><StatusBadge status={staffEmploymentStatus(row,todayInKualaLumpur())}/></div><div><span className="mr-2 text-xs text-muted-foreground md:hidden">Approved</span>{duration(row.balance)}</div><div className="font-medium"><span className="mr-2 text-xs font-normal text-muted-foreground md:hidden">Available</span>{duration(row.available)}</div><div>{canSubmit&&row.branchId?<CompTimeCorrectionForm staffId={row.id} branchId={row.branchId} staffName={row.full_name}/>:<Link className="text-xs underline" href={`/people/${row.id}#time-off`}>History</Link>}</div></article>)}{!result.rows.length?<p className="p-4 text-sm text-muted-foreground">No employees match these filters.</p>:null}</section>
 <footer className="flex flex-wrap items-center justify-between gap-3 text-xs"><span>Availability includes existing RO reservations.</span><div className="flex gap-3">{canReview?<Link className="underline" href="/attendance/review">Review corrections & RO usage</Link>:null}{result.page>1?<Link href={href(result.page-1)}>Previous</Link>:null}{result.hasNext?<Link href={href(result.page+1)}>Next</Link>:null}</div></footer>
 </WorkspaceGrid></>;
}
