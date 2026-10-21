import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/mock-mode";

export async function getPhaseOneDeletePreview(recordType: string, recordId: string) {
  if (isMockMode()) return null;
  const db = await createClient();
  const { data, error } = await db.rpc("preview_phase_one_hard_delete", { record_type: recordType, record_id: recordId });
  if (error) throw new Error(error.message);
  return data as { eligible: boolean; record_number: string; display_label: string; dependencies: Record<string, number>; reason: string; confirmation: string };
}
