"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentProfile } from "@/server/queries/common";
import { buildPlanPayload } from "@/server/production-planning/data";
import { addDays } from "@/lib/production-planning/forecast";
import { deliverPlanningEmails } from "@/server/production-planning/email";
import { logServerError } from "@/server/observability/logger";

export type PlanningActionResult = { ok: boolean; message: string; id?: string };
const quantity = z.number().finite().nonnegative().max(1_000_000);
const uuid = z.uuid();
const reason = z.string().trim().max(1000);
const date = z.string().refine((s) => { try { addDays(s,0); return true; } catch { return false; } }, "Invalid date");
const destination = z.object({ branch_id: uuid.nullable(), event_id: uuid.nullable(), prepared_by: z.string().trim().min(1).max(120), driver: z.string().max(120), vehicle: z.string().max(60), yellow_trays: quantity.int(), silver_trays: quantity.int(), reason: reason, lines: z.array(z.object({ product_id: uuid, qty: quantity })).min(1).max(500) });
async function run(operation: () => Promise<{ id?: string; message?: string }>): Promise<PlanningActionResult> {
  try {
    const result = await operation();
    revalidatePath("/production/planning"); revalidatePath("/outlet-daily-records"); revalidatePath("/production/delivery-orders"); revalidatePath("/outlet-daily-records/delivery-orders");
    return { ok: true, message: result.message ?? "Saved successfully.", ...result };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not save. Retry after reloading." }; }
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
    if (action==="save") parsed=z.object({ allocations:z.array(z.object({product_id:uuid,branch_id:uuid,approved_qty:quantity,reason})).max(10000),product_lines:z.array(z.object({product_id:uuid,trays:quantity.int(),retained_qty:quantity,reason})).max(500) }).parse(payload);
    if (action==="return") parsed=z.object({reason:reason.min(1)}).parse(payload);
    if (action==="recalculate") {
      const p=await db.from("production_plans").select("kitchen_id,delivery_date").eq("id",planId).eq("company_id",companyId).single();
      if (p.error) throw new Error(p.error.message);
      parsed=await buildPlanPayload(db,companyId,String(p.data.kitchen_id),String(p.data.delivery_date));
    }
    const result=await rpc(db,"update_production_plan",{p_plan_id:planId,p_revision:revision,p_action:action,p_payload:parsed,p_key:key}) as {id:string};
    if (action !== "approve") return result;
    try {
      const delivery=await deliverPlanningEmails();
      return {...result,message:delivery.unavailable?"Plan approved. Kitchen email is queued until the mail provider is configured.":delivery.failed?"Plan approved. Some kitchen emails failed; use Retry failed emails.":"Plan approved and kitchen email processed."};
    } catch (error) { logServerError(error,{source:"productionPlanning.approvalEmail"}); return {...result,message:"Plan approved. Kitchen email remains queued; retry from the plan."}; }
  });
}
export async function confirmDispatch(planId: string, revision: number, payload: unknown, key: string) {
  return run(async () => { const {db}=await manager(); uuid.parse(planId); uuid.parse(key); z.number().int().positive().parse(revision);
    const parsed=z.object({destinations:z.array(destination).min(1).max(100),production:z.array(z.object({product_id:uuid,actual_qty:quantity,reason})).min(1).max(500)}).parse(payload);
    await rpc(db,"confirm_production_dispatch",{p_plan_id:planId,p_revision:revision,p_payload:parsed,p_key:key}); return {}; });
}
export async function configurePlanning(payload: unknown) {
  return run(async () => { const {db}=await manager();
    const parsed=z.object({kitchen_id:uuid,enabled:z.boolean(),draft_time:z.literal("20:00"),buffer_percent:quantity.max(100),max_decrease_percent:quantity.max(100),recipients:z.array(z.email()).min(1).max(50),batches:z.array(z.object({product_id:uuid,yield_per_tray:quantity.positive()})).max(500),minimums:z.array(z.object({branch_id:uuid,product_id:uuid,minimum_qty:quantity})).max(10000)}).parse(payload);
    await rpc(db,"configure_production_planning",{p_payload:parsed}); return {}; });
}
export async function savePlanningEvent(payload: unknown) {
  return run(async () => { const {db}=await manager();
    const parsed=z.object({kitchen_id:uuid,branch_id:uuid.nullable(),event_date:date,name:z.string().trim().min(1).max(150),notes:reason,confirmed:z.boolean(),lines:z.array(z.object({product_id:uuid,qty:quantity.positive()})).min(1).max(500)}).parse(payload);
    const id=await rpc(db,"save_production_event",{p_payload:parsed}); return {id:String(id)}; });
}
export async function voidDeliveryOrder(id: string, correctionReason: string, rebuild: boolean, key: string) {
  return run(async () => { const {db}=await manager(); uuid.parse(id); uuid.parse(key); reason.min(1).parse(correctionReason);
    await rpc(db,"void_production_delivery",{p_do_id:id,p_reason:correctionReason,p_rebuild:z.boolean().parse(rebuild),p_key:key}); return {}; });
}
export async function retryPlanningEmails(planId: string) {
  return run(async () => { const {db}=await manager(); uuid.parse(planId); await rpc(db,"retry_production_emails",{p_plan_id:planId});
    try { const delivery=await deliverPlanningEmails(); return {message:delivery.unavailable?"Email is queued until the provider is configured.":delivery.failed?"Some emails failed again. Review the email status.":"Kitchen email retry processed."}; }
    catch(error){logServerError(error,{source:"productionPlanning.retryEmail"});return {message:"Email remains queued. Retry after checking the mail provider."};}
  });
}
