import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

export const getSystemHealthWorkspace = cache(async () => {
  await requireActiveTenantActor({ owner: true });
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("system_incidents")
    .select("id, fingerprint, module, route, branch_id, severity, status, safe_code, safe_message, recommended_action, occurrence_count, recovery_attempts, first_seen_at, last_seen_at, recovered_at, acknowledged_at")
    .gte("last_seen_at", since)
    .order("last_seen_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const incidents = data ?? [];
  const unresolved = incidents.filter((row) => !["recovered", "acknowledged"].includes(row.status));
  const recovered = incidents.filter((row) => row.status === "recovered");
  const totalOccurrences = incidents.reduce((sum, row) => sum + row.occurrence_count, 0);
  const recoveredOccurrences = recovered.reduce((sum, row) => sum + row.occurrence_count, 0);
  return {
    incidents,
    summary: {
      incidents24h: incidents.length,
      unresolved: unresolved.length,
      actionRequired: incidents.filter((row) => row.status === "action_required").length,
      recoveryRate: totalOccurrences ? Math.round((recoveredOccurrences / totalOccurrences) * 100) : 100,
    },
  };
});
