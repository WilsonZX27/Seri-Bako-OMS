import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { hasPermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
/** New places inherit no memberships: only existing company-wide inventory access is sufficient. */
export async function canCreateStockDestination(){
 if(!(await hasPermission("branches.create"))||!(await hasPermission("stock_transfer.create")))return false;
 const actor=await requireActiveTenantActor(),db=looseSupabase(await createClient());
 const access=await db.rpc("can_access_inventory_branch",{target_company_id:actor.companyId,target_branch_id:null});
 return !access.error&&access.data===true;
}
