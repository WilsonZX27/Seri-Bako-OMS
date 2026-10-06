"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentProfile } from "@/server/queries/common";
import { complete, buildPlanPayload } from "@/server/production-planning/data";
import { addDays } from "@/lib/production-planning/forecast";
import { formatActionError } from "@/server/actions/error-handling";

export type PlanningActionResult = { ok: boolean; message: string; id?: string };
const quantity = z.number().finite().nonnegative().max(1_000_000);
const uuid = z.uuid();
const reason = z.string().trim().max(1000);
const date = z.string().refine((s) => { try { addDays(s,0); return true; } catch { return false; } }, "Invalid date");
const destination = z.object({ branch_id: uuid.nullable(), event_id: uuid.nullable(), prepared_by: z.string().trim().min(1).max(120), driver: z.string().max(120), vehicle: z.string().max(60), yellow_trays: quantity.int(), silver_trays: quantity.int(), reason: reason, lines: z.array(z.object({ product_id: uuid, qty: quantity })).min(1).max(500) });
async function run(operation: () => Promise<{ id?: string; message?: string }>): Promise<PlanningActionResult> {
  try {
    const result = await operation();
    revalidatePath("/production/planning"); revalidatePath("/outlet-daily-records"); revalidatePath("/outlet-daily-records/insights"); revalidatePath("/outlet-packaging"); revalidatePath("/production/delivery-orders"); revalidatePath("/outlet-daily-records/delivery-orders");
    return { ok: true, message: result.message ?? "Saved successfully.", ...result };
  } catch (error) { return { ok: false, message: formatActionError(error, "Could not save. Reload and retry.") }; }
}
async function manager() {
  const client = await createClient(); const db=looseSupabase(client);
  const profile=await getCurrentProfile();
  if (!profile?.company_id || !["super_admin","manager"].includes(profile.role_code ?? "")) throw new Error("Manager or Owner access required.");
  return { db, companyId: profile.company_id };
}
async function rpc(db: ReturnType<typeof looseSupabase>, name: string, args: Record<string,unknown>) {
  const result=await db.rpc(name,args); if (result.error) throw new Error(result.error.message); return result.data;
}
export async function generatePlan(kitchenId: string, deliveryDate: string) {
  return run(async () => { const {db,companyId}=await manager(); uuid.parse(kitchenId); date.parse(deliveryDate);
    const payload=await buildPlanPayload(db,companyId,kitchenId,deliveryDate);
    const id=await rpc(db,"create_production_plan",{p_payload:payload}); return {id:String(id)}; });
}
export async function changePlan(planId: string, revision: number, action: string, payload: unknown, key: string) {
  return run(async () => { const {db,companyId}=await manager(); uuid.parse(planId); uuid.parse(key); z.number().int().positive().parse(revision);
    z.enum(["save","recalculate","submit","approve","return","revise"]).parse(action);
    let parsed: unknown=payload;
    if (action==="save") parsed=z.object({ allocations:z.array(z.object({product_id:uuid,branch_id:uuid,approved_qty:quantity.nullable(),reason})).max(10000),product_lines:z.array(z.object({product_id:uuid,trays:quantity.int().nullable(),tray_mode:z.enum(["automatic","manual"]).nullable().optional(),retained_qty:quantity,reason})).max(500) }).parse(payload);
    if (action==="return") parsed=z.object({reason:reason.min(1)}).parse(payload);
    if (action==="recalculate") {
      const p=await db.from("production_plans").select("kitchen_id,delivery_date").eq("id",planId).eq("company_id",companyId).single();
      if (p.error) throw new Error(p.error.message);
      parsed=await buildPlanPayload(db,companyId,String(p.data.kitchen_id),String(p.data.delivery_date));
    }
    const result=await rpc(db,"update_production_plan",{p_plan_id:planId,p_revision:revision,p_action:action,p_payload:parsed,p_key:key}) as {id:string};
    return action==="approve"?{...result,message:"Plan approved. Kitchen can view the released plan in OMS."}:result;
  });
}
export async function confirmDispatch(planId: string, revision: number, payload: unknown, key: string) {
  return run(async () => { const {db}=await manager(); uuid.parse(planId); uuid.parse(key); z.number().int().positive().parse(revision);
    const parsed=z.object({destinations:z.array(destination).min(1).max(100),production:z.array(z.object({product_id:uuid,actual_qty:quantity,reason})).min(1).max(500)}).parse(payload);
    await rpc(db,"confirm_production_dispatch",{p_plan_id:planId,p_revision:revision,p_payload:parsed,p_key:key}); return {}; });
}
export async function configurePlanning(payload: unknown) {
  return run(async () => { const {db}=await manager();
    const parsed=z.object({availability:z.array(z.object({product_id:uuid,available_from:date.nullable(),available_until:date.nullable(),expected_from:date.nullable(),expected_until:date.nullable()})).max(500).optional(),kitchen_id:uuid,enabled:z.boolean(),draft_time:z.literal("20:00"),buffer_percent:quantity.max(100),max_decrease_percent:quantity.max(100),recipients:z.array(z.email()).max(50),batches:z.array(z.object({product_id:uuid,yield_per_tray:quantity.positive(),forecast_basis:z.enum(["same_day","manual"]).default("manual")})).max(500),minimums:z.array(z.object({branch_id:uuid,product_id:uuid,minimum_qty:quantity})).max(10000)}).parse(payload);
    await rpc(db,"configure_production_planning",{p_payload:parsed}); return {}; });
}
export async function savePlanningEvent(payload: unknown) {
  return run(async () => { const {db}=await manager();
    const parsed=z.object({demand_kind:z.enum(["outlet_event","corporate_event","franchise_order"]).optional(),kitchen_id:uuid,branch_id:uuid.nullable(),event_date:date,name:z.string().trim().min(1).max(150),notes:reason,confirmed:z.boolean(),lines:z.array(z.object({product_id:uuid,qty:quantity.positive()})).min(1).max(500)}).parse(payload);
    const id=await rpc(db,"save_production_event",{p_payload:parsed}); return {id:String(id)}; });
}
export async function voidDeliveryOrder(id: string, correctionReason: string, rebuild: boolean, key: string) {
  return run(async () => { const {db}=await manager(); uuid.parse(id); uuid.parse(key); reason.min(1).parse(correctionReason);
    await rpc(db,"void_production_delivery",{p_do_id:id,p_reason:correctionReason,p_rebuild:z.boolean().parse(rebuild),p_key:key}); return {}; });
}

/** Read-only, permission-gated lookup; saving repeats the effective-route validation in SQL. */
export async function resolveEventSupply(eventDate: string, branchId: string | null): Promise<{ok:boolean;message:string;kitchen_id?:string|null;outlets?:import("@/lib/production-planning/types").PlanningBranch[];kitchens?:import("@/lib/production-planning/types").PlanningBranch[]}> {
 try {const {db}=await manager();date.parse(eventDate);uuid.nullable().parse(branchId);const result=await rpc(db,"resolve_production_event_supply",{p_date:eventDate,p_branch:branchId}) as {kitchen_id:string|null;outlets:import("@/lib/production-planning/types").PlanningBranch[];kitchens:import("@/lib/production-planning/types").PlanningBranch[]};return {ok:true,message:"",...result};}
 catch(error){return {ok:false,message:formatActionError(error,"Could not check the supply route. Retry before confirming.")};}
}

export type PlanningHistoryRow = {branchId:string;recordId:string;date:string;received:number|null;leftover:number|null;wastage:number|null};
/** Current observations are a read-only reference, distinct from the saved forecast snapshot. */
export async function readPlanningHistory(planId:string,productId:string):Promise<{ok:boolean;message:string;rows:PlanningHistoryRow[]}> {
 try {
  uuid.parse(planId);uuid.parse(productId);
  const profile=await getCurrentProfile();if(!profile?.company_id)throw new Error("Sign in to view history.");
  const db=looseSupabase(await createClient());
  const plan=await db.from("production_plans").select("id,delivery_date").eq("company_id",profile.company_id).eq("id",planId).single();
  if(plan.error)throw new Error(plan.error.message);
  const allocations=await complete(()=>db.from("production_plan_allocations").select("branch_id",{count:"exact"}).eq("plan_id",planId).eq("product_id",productId),["branch_id"]);
  const branches=[...new Set(allocations.map(a=>String(a.branch_id)))];if(!branches.length)return {ok:true,message:"",rows:[]};
  const records=await complete(()=>db.from("outlet_daily_records").select("id,branch_id,record_date",{count:"exact"}).eq("company_id",profile.company_id).in("branch_id",branches).gte("record_date",addDays(String(plan.data.delivery_date),-56)).lt("record_date",plan.data.delivery_date).in("status",["evening_completed","reviewed"]));
  const result:PlanningHistoryRow[]=[];
  for(let offset=0;offset<records.length;offset+=100){
   const chunk=records.slice(offset,offset+100);const byId=new Map(chunk.map(r=>[String(r.id),r]));
   const lines=await complete(()=>db.from("outlet_daily_record_lines").select("id,record_id,morning_received_qty,morning_received_provided,evening_leftover_qty,wastage_qty,wastage_provided",{count:"exact"}).in("record_id",chunk.map(r=>r.id)).eq("product_id",productId));
   for(const line of lines){const record=byId.get(String(line.record_id));if(!record)throw new Error("History changed. Retry.");result.push({branchId:String(record.branch_id),recordId:String(record.id),date:String(record.record_date),received:line.morning_received_provided===true&&line.morning_received_qty!==null?Number(line.morning_received_qty):null,leftover:line.evening_leftover_qty===null?null:Number(line.evening_leftover_qty),wastage:line.wastage_provided===true&&line.wastage_qty!==null?Number(line.wastage_qty):null});}
  }
  return {ok:true,message:"",rows:result.sort((a,b)=>b.date.localeCompare(a.date))};
 }catch(error){return {ok:false,message:formatActionError(error,"Could not read history. Retry."),rows:[]};}
}
