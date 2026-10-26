import { compareStaffCodes } from "@/lib/staff-code-order";
import { todayInKualaLumpur } from "@/lib/business-date";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { hasPermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { getCurrentUserScope } from "@/server/queries/notifications";

type Membership = {branch_id:string;is_default:boolean;branches:{branch_name:string}|null};
type Person = {id:string;full_name:string;staff_code:string|null;status:string;employment_end_date:string|null;staff_branches:Membership[]};
export async function getRoManagement(filters:{search?:string;branch_id?:string;page?:string;sort?:string;dir?:string}) {
  if (!(await hasPermission("comp_time.read")) || !(await hasPermission("staffs.read"))) return {allowed:false,rows:[],page:1,hasNext:false,totalRows:0,sortUnavailable:false};
  const actor=await requireActiveTenantActor(),scope=await getCurrentUserScope();
  const page=Math.min(10000,Math.max(1,Number.parseInt(filters.page??"1",10)||1));
  if(!scope || (!scope.companyWideAccess&&!scope.branchIds.length))return {allowed:true,rows:[],page,hasNext:false,totalRows:0,sortUnavailable:false};
  const selected=filters.branch_id&&filters.branch_id!=="all"?filters.branch_id:null;
  if(selected&&!scope.companyWideAccess&&!scope.branchIds.includes(selected))return {allowed:true,rows:[],page,hasNext:false,totalRows:0,sortUnavailable:false};
  const db=looseSupabase(await createClient());
  const scoped=selected||!scope.companyWideAccess;
  const sort=["full_name","staff_code","balance","available"].includes(filters.sort??"")?filters.sort!:"full_name";
  const ascending=filters.dir!=="desc", numericSort=sort==="balance"||sort==="available", clientSort=numericSort||sort==="staff_code";
  let query=db.from("staffs").select(`id,full_name,staff_code,status,employment_end_date,staff_branches${scoped?"!inner":""}(branch_id,is_default,branches(branch_name))`,{count:"exact"}).eq("company_id",actor.companyId).is("deleted_at",null).in("status",["active","invited"]).or(`employment_end_date.is.null,employment_end_date.gte.${todayInKualaLumpur()}`);
  if(selected)query=query.eq("staff_branches.branch_id",selected);
  else if(!scope.companyWideAccess)query=query.in("staff_branches.branch_id",scope.branchIds);
  const search=filters.search?.trim().replace(/[,%()]/g," ");
  if(search)query=query.or(`staff_code.ilike.%${search}%,full_name.ilike.%${search}%`);
  const result=await query.order(clientSort?"full_name":sort,{ascending:clientSort?true:ascending}).order("id").range(clientSort?0:(page-1)*25,clientSort?500:page*25);
  if(result.error)throw result.error;
  const people=(result.data??[]) as Person[];
  if(result.count==null)throw Error("Employee count is unavailable.");
  const totalRows=result.count;
  if(clientSort&&(totalRows>500||people.length!==totalRows))return {allowed:true,rows:[],page:1,hasNext:false,totalRows,sortUnavailable:true};
  if(sort==="staff_code")people.sort((a,b)=>compareStaffCodes(a,b,ascending));
  const selectedPeople=numericSort?people:sort==="staff_code"?people.slice((page-1)*25,page*25):people.slice(0,25);
  const rows:Array<Person&{balance:number;available:number;branchId:string|null;branchName:string}> = [];
  // Keep the existing authoritative ledger/reservation RPCs, at most five people in flight.
  for(let offset=0;offset<selectedPeople.length;offset+=5){
    rows.push(...await Promise.all(selectedPeople.slice(offset,offset+5).map(async person=>{
      const [balance,available]=await Promise.all([db.rpc("get_comp_time_balance",{p_staff_id:person.id}),db.rpc("get_comp_time_available_balance",{p_staff_id:person.id})]);
      if(balance.error)throw balance.error;if(available.error)throw available.error;
      if(balance.data==null||available.data==null||!Number.isFinite(Number(balance.data))||!Number.isFinite(Number(available.data)))throw Error("RO balance is unavailable; no zero balance was assumed.");
      const memberships=person.staff_branches.filter(m=>scope.companyWideAccess||scope.branchIds.includes(m.branch_id));
      const branch=memberships.find(m=>m.branch_id===selected)??memberships.find(m=>m.is_default)??memberships[0];
      return {...person,balance:Number(balance.data),available:Number(available.data),branchId:branch?.branch_id??null,branchName:branch?.branches?.branch_name??"No assigned outlet"};
    })));
  }
  if(numericSort) rows.sort((a,b)=>(ascending?1:-1)*(a[sort]-b[sort])||a.full_name.localeCompare(b.full_name)||a.id.localeCompare(b.id));
  return {allowed:true,rows:numericSort?rows.slice((page-1)*25,page*25):rows,page,hasNext:clientSort?page*25<totalRows:people.length>25,totalRows,sortUnavailable:false};
}
