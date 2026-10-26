import {requestDeadline} from "@/lib/http/request-deadline";
import {requireActiveTenantActor} from "@/server/auth/tenant-actor";
import {createClient} from "@/lib/supabase/server";
import {looseSupabase} from "@/lib/supabase/loose";
export type PackagingStoreWorkspace={stores:{id:string;name:string}[];products:{id:string;product_name:string;selling_unit:string}[];balances:{store_id:string;product_id:string;quantity:number;version:number}[];movements:{id:string;store_id:string;product_id:string;kind:string;quantity:number;balance_after:number;reason:string;created_at:string}[]};
export async function getPackagingStoreWorkspace(){
 await requireActiveTenantActor({owner:true});const db=looseSupabase(await createClient());const result=await requestDeadline(async ()=>await db.rpc("get_packaging_store_workspace"),8000,"Store balances could not be verified. Try loading them again.");
 if(result.error){if(["PGRST202","42883"].includes((result.error as {code?:string}).code??""))return null;throw new Error("Store balances could not be verified.");}
 const value=result.data as PackagingStoreWorkspace|null;
 if(!value||![value.stores,value.products,value.balances,value.movements].every(Array.isArray))throw new Error("Store balances could not be verified.");return value;
}
