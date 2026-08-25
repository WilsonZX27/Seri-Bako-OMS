import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { reliabilityFlags } from "@/lib/reliability/flags";
import { logServerWarning } from "@/server/observability/logger";

type IncidentInput = {
  module: string;
  code: string;
  message: string;
  route?: string | null;
  branchId?: string | null;
  severity?: "info" | "warning" | "error" | "critical";
  operationId?: string | null;
  eventType?: "detected" | "retrying" | "recovered" | "failed";
  recommendedAction?: string | null;
};

export function incidentFingerprint(input: Pick<IncidentInput, "module" | "code" | "route">) {
  return createHash("sha256").update(`${input.module}|${input.code}|${input.route ?? ""}`).digest("hex").slice(0, 32);
}

export async function recordSystemIncident(input: IncidentInput) {
  if (!reliabilityFlags.observation) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("record_system_incident", {
      p_fingerprint: incidentFingerprint(input),
      p_module: input.module,
      p_safe_code: input.code,
      p_safe_message: input.message.slice(0, 240),
      p_route: input.route ?? null,
      p_branch_id: input.branchId ?? null,
      p_severity: input.severity ?? "error",
      p_operation_id: input.operationId ?? null,
      p_event_type: input.eventType ?? "detected",
      p_recommended_action: input.recommendedAction ?? null,
    });
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    // Observability must never become a new outage source for the operator's
    // original workflow. Keep a redacted fallback in platform logs.
    logServerWarning(error, { source: "reliability.incident", requestId: input.operationId ?? undefined });
    return null;
  }
}
