import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import type { Json } from "@/types/database";

type BeginOperationInput = {
  idempotencyKey: string;
  module: string;
  action: string;
  request: Json;
  branchId?: string | null;
};

function stableJson(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key] ?? null)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function requestFingerprint(value: Json) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export async function beginTrackedOperation(input: BeginOperationInput) {
  const actor = await requireActiveTenantActor();
  const supabase = await createClient();
  const fingerprint = requestFingerprint(input.request);
  const { data: existing, error: readError } = await supabase
    .from("operation_requests")
    .select("operation_id, request_fingerprint, status, safe_result, error_code")
    .eq("company_id", actor.companyId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) {
    if (existing.request_fingerprint !== fingerprint) throw new Error("idempotency_key_parameter_mismatch");
    return { operationId: existing.operation_id, existing };
  }

  const operationId = randomUUID();
  const { error } = await supabase.from("operation_requests").insert({
    company_id: actor.companyId,
    operation_id: operationId,
    idempotency_key: input.idempotencyKey,
    request_fingerprint: fingerprint,
    module: input.module,
    action: input.action,
    actor_staff_id: actor.staffId,
    branch_id: input.branchId ?? null,
  });
  if (error) {
    // A concurrent identical request may have won the unique-key race.
    const { data: raced } = await supabase
      .from("operation_requests")
      .select("operation_id, request_fingerprint, status, safe_result, error_code")
      .eq("company_id", actor.companyId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (!raced || raced.request_fingerprint !== fingerprint) throw new Error(error.message);
    return { operationId: raced.operation_id, existing: raced };
  }
  return { operationId, existing: null };
}

export async function completeTrackedOperation(operationId: string, result: { status: "succeeded" | "failed" | "unknown"; safeResult?: Json; errorCode?: string; businessDataChanged?: boolean }) {
  const actor = await requireActiveTenantActor();
  const supabase = await createClient();
  const { error } = await supabase.from("operation_requests").update({
    status: result.status,
    safe_result: result.safeResult ?? null,
    error_code: result.errorCode ?? null,
    business_data_changed: result.businessDataChanged ?? false,
    completed_at: new Date().toISOString(),
  }).eq("company_id", actor.companyId).eq("operation_id", operationId).eq("actor_staff_id", actor.staffId);
  if (error) throw new Error(error.message);
}
