"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

export async function acknowledgeSystemIncident(formData: FormData) {
  await requireActiveTenantActor({ owner: true });
  const incidentId = String(formData.get("incident_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(incidentId)) throw new Error("A valid incident is required.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("acknowledge_system_incident", { p_incident_id: incidentId });
  if (error) throw new Error(error.message);
  revalidatePath("/administration/system-health");
}
