"use server";
import {requestDeadline} from "@/lib/http/request-deadline";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {requireActiveTenantActor} from "@/server/auth/tenant-actor";
import {createClient} from "@/lib/supabase/server";
import {looseSupabase} from "@/lib/supabase/loose";
export type StoreActionState={ok:boolean;message:string};
export async function savePackagingStore(_state:StoreActionState,form:FormData):Promise<StoreActionState>{
 try{await requireActiveTenantActor({owner:true});const db=looseSupabase(await createClient());const movement=z.enum(["movement","create"]).parse(form.get("action"))==="movement";
 const payload=movement?z.object({store:z.string().uuid(),product:z.string().uuid(),kind:z.enum(["receipt","issue","count"]),quantity:z.string().regex(/^\d+(\.\d{1,2})?$/),reason:z.string().trim().min(1).max(1000),version:z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),key:z.string().uuid()}).parse(Object.fromEntries(form)):z.object({name:z.string().trim().min(1).max(120)}).parse(Object.fromEntries(form));
 const result=await requestDeadline(async ()=>await ("store" in payload?db.rpc("post_packaging_store_movement",{p_store:payload.store,p_product:payload.product,p_kind:payload.kind,p_quantity:payload.quantity,p_reason:payload.reason,p_expected_version:payload.version,p_client_key:payload.key}):db.rpc("create_packaging_store",{p_name:payload.name})),30000,"The result is unconfirmed. Check balances and movement history before retrying; changes may already be saved.");
 if(result.error)throw new Error(result.error.message);if(typeof result.data!=="string")throw new Error("Store update could not be confirmed.");revalidatePath("/outlet-packaging");revalidatePath("/outlet-packaging/stores");return {ok:true,message:movement?"Store movement recorded.":"Store created."};
 }catch(error){return {ok:false,message:error instanceof z.ZodError?"Check all fields and enter a nonnegative quantity with at most two decimals.":error instanceof Error?error.message:"The result is unconfirmed. Check the balance and movement history before retrying."};}
}
