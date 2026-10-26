import Link from "next/link";
import {redirect} from "next/navigation";
import { getRoManagement } from "@/server/queries/ro-management";
import { getBranchesForSelect } from "@/server/queries/common";
import { hasPermission } from "@/server/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { Notice, PermissionDeniedState } from "@/components/ui/system-states";
import { CompTimeCorrectionForm } from "@/components/attendance/comp-time-correction-form";
import { Table,TableHeader,TableBody,TableRow,TableHead,TableCell } from "@/components/ui/table";
import { SortableHead,PaginationControls } from "@/components/sortable-table";
const duration=(minutes:number)=>`${minutes} min`;
export default async function RoManagementPage({searchParams}:{searchParams:Promise<{search?:string;branch_id?:string;page?:string;sort?:string;dir?:string}>}){
 const filters=await searchParams,result=await getRoManagement(filters);
 if(!result.allowed)return <PermissionDeniedState/>;
 if(result.page>Math.max(1,Math.ceil(result.totalRows/25))){const params=new URLSearchParams(Object.fromEntries(Object.entries(filters).filter((entry):entry is [string,string]=>typeof entry[1]==="string")));params.set("page",String(Math.max(1,Math.ceil(result.totalRows/25))));redirect(`/people/ro?${params}`);}
 const [branches,canSubmit,canReview]=await Promise.all([getBranchesForSelect({restrictToActorScope:true}),hasPermission("comp_time.submit"),hasPermission("attendance.read")]);
 const sort=["full_name","staff_code","balance","available"].includes(filters.sort??"")?filters.sort:"full_name";
 const rail=<><ConsoleSection title="RO actions">{canReview?<Link className="inline-flex min-h-11 items-center underline" href="/attendance/review">Review corrections &amp; RO usage</Link>:<p className="text-xs text-muted-foreground">Open an employee to view their history.</p>}</ConsoleSection><ConsoleSection title="Balance"><p className="text-xs text-muted-foreground">Available excludes existing RO reservations.</p></ConsoleSection></>;
 return <><PageHeader title="RO Management" contentWidth="wide"/><WorkspaceGrid rightRail={rail} tabletRailMode="split">
 <UnifiedListHeader resetHref="/people/ro" resultCount={result.totalRows}><Input name="search" defaultValue={filters.search} placeholder="Find employee or staff code" aria-label="Find RO employee"/><SelectControl name="branch_id" defaultValue={filters.branch_id??"all"} ariaLabel="RO outlet" options={[{value:"all",label:"All authorised outlets"},...branches.map(b=>({value:b.id,label:b.branch_name}))]}/><input type="hidden" name="sort" value={sort}/><input type="hidden" name="dir" value={filters.dir??"asc"}/></UnifiedListHeader>
 {result.sortUnavailable?<Notice tone="warning">Choose an outlet before sorting this many employees.</Notice>:<section className="sb-work-surface overflow-hidden" aria-label="RO balances"><Table stickyColumn="first" scrollbar="auto" aria-label="RO employee balances"><TableHeader><TableRow><SortableHead label="Staff code" column="staff_code" currentSort={sort} currentDir={filters.dir} searchParams={filters}/><SortableHead label="Employee" column="full_name" currentSort={sort} currentDir={filters.dir} searchParams={filters}/><TableHead>Outlet</TableHead><SortableHead label="Approved" column="balance" currentSort={sort} currentDir={filters.dir} searchParams={filters}/><SortableHead label="Available" column="available" currentSort={sort} currentDir={filters.dir} searchParams={filters}/><TableHead>Manage</TableHead></TableRow></TableHeader><TableBody>{result.rows.map(row=><TableRow key={row.id}><TableCell>{row.staff_code??"—"}</TableCell><TableCell><Link href={`/people/${row.id}#time-off`} className="font-medium hover:underline">{row.full_name}</Link></TableCell><TableCell>{row.branchName}</TableCell><TableCell className="tabular-nums">{duration(row.balance)}</TableCell><TableCell className="tabular-nums">{duration(row.available)}</TableCell><TableCell>{canSubmit&&row.branchId?<CompTimeCorrectionForm staffId={row.id} branchId={row.branchId} staffName={row.full_name}/>:<Link className="text-xs underline" href={`/people/${row.id}#time-off`}>History</Link>}</TableCell></TableRow>)}{!result.rows.length?<TableRow><TableCell colSpan={6}>No employees match these filters.</TableCell></TableRow>:null}</TableBody></Table><PaginationControls page={result.page} totalPages={Math.max(1,Math.ceil(result.totalRows/25))} totalRows={result.totalRows} searchParams={filters} resetScrollOnPageChange/></section>}
 </WorkspaceGrid></>;
}
