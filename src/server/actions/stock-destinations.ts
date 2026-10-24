"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { branchSchema } from "@/lib/validations/foundation";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { canCreateStockDestination } from "@/server/queries/stock-destination-capability";
import { writeActivityLog } from "@/server/activity/log";
import { logServerError } from "@/server/observability/logger";
import { revalidatePath } from "next/cache";
type Destination={id:string;branch_code:string;branch_name:string;status:string};
type Result={ok:true;destination:Destination}|{ok:false;message:string};
export async function createManagedStockDestination(input:{name:string;code:string}):Promise<Result>{
 try{
  if(!(await canCreateStockDestination()))return {ok:false,message:"Creating a managed location requires existing location-creation and company-wide inventory access."};
  const actor=await requireActiveTenantActor();
  const parsed=branchSchema.safeParse({company_id:actor.companyId,branch_code:input.code,branch_name:input.name,branch_type:"other",status:"active"});
  if(!parsed.success)return {ok:false,message:"Enter a location name and code (up to 160 and 64 characters)."};
  const payload=parsed.data,admin=looseSupabase(createAdminClient());
  const find=async()=>{
   const [code,name]=await Promise.all([admin.from("branches").select("id,branch_code,branch_name,branch_type,status,deleted_at").eq("company_id",actor.companyId).eq("branch_code",payload.branch_code),admin.from("branches").select("id,branch_code,branch_name,branch_type,status,deleted_at").eq("company_id",actor.companyId).eq("branch_name",payload.branch_name)]);
   if(code.error)throw code.error;if(name.error)throw name.error;
   return [...new Map([...(code.data??[]),...(name.data??[])].map(row=>[String(row.id),row])).values()];
  };
  let matches=await find(),created=false;
  if(!matches.length){
   const result=await admin.from("branches").insert(payload).select("id,branch_code,branch_name,branch_type,status,deleted_at").single();
   if(result.error){if((result.error as {code?:string}).code!=="23505")throw result.error;matches=await find();}
   else{matches=[result.data];created=true;}
  }
  if(matches.length!==1)return {ok:false,message:"A location with this name or code already exists. Choose it or use a different code."};
  const destination=matches[0];
  if(destination.deleted_at||destination.status!=="active")return {ok:false,message:"This name or code belongs to an inactive or archived location. Restore it through location management."};
  if(destination.branch_type!=="other"||destination.branch_code!==payload.branch_code||destination.branch_name!==payload.branch_name)return {ok:false,message:"A different location already uses this name or code. Choose the existing location instead."};
  // Reuse is explicit and audited too, so a retry after an uncertain insert never creates another holder.
  await writeActivityLog({entityType:"branch",entityId:String(destination.id),activityType:created?"created":"updated",message:created?`Managed transfer location ${payload.branch_name} created`:`Managed transfer location ${payload.branch_name} selected (no location data changed)`});
  const db=looseSupabase(await createClient());
  const access=await db.rpc("can_access_inventory_branch",{target_company_id:actor.companyId,target_branch_id:destination.id});
  if(access.error||access.data!==true)return {ok:false,message:"The location exists, but destination access could not be verified. Do not create another copy; ask an administrator to review access."};
  const visible=await db.from("branches").select("id,branch_code,branch_name,status").eq("id",destination.id).eq("company_id",actor.companyId).is("deleted_at",null).single();
  if(visible.error||!visible.data)return {ok:false,message:"The location exists but could not be loaded. Refresh the destination list before trying again."};
  revalidatePath("/branches");revalidatePath("/stock-transfers/new");
  return {ok:true,destination:visible.data as Destination};
 }catch(error){logServerError(error,{source:"stock.destination.create"});return {ok:false,message:"Location creation could not be confirmed. Keep the same name and code when retrying; do not create another copy."};}
}
