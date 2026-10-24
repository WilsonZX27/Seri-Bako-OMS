import { createClient } from "@/lib/supabase/server";
import { looseSupabase, type LooseSupabase } from "@/lib/supabase/loose";

export async function readPaidEmergencyLeaveCapability(db: LooseSupabase) {
  const result = await db.rpc("schedule_leave_capabilities");
  if (result.error) {
    if (["PGRST202", "42883", "42501"].includes((result.error as {code?:string}).code ?? "")) return false;
    throw new Error("Schedule leave support could not be verified.");
  }
  const data = result.data as { revision?: number; paid_emergency_leave?: boolean } | null;
  return data?.revision === 1 && data.paid_emergency_leave === true;
}
export async function getPaidEmergencyLeaveCapability() {
  return readPaidEmergencyLeaveCapability(looseSupabase(await createClient()));
}
