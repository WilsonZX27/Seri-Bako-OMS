import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/queries/common";
import type { Json } from "@/types/database";

type ActivityInput = {
  entityType: string;
  entityId: string;
  activityType: string;
  message: string;
  metadata?: Json;
};

export async function writeActivityLog(input: ActivityInput) {
  if (isMockMode()) return;

  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  const { error } = await supabase.from("activity_logs").insert({
    company_id: profile?.company_id ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    activity_type: input.activityType,
    message: input.message,
    metadata: input.metadata ?? null,
    created_by: profile?.id ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
