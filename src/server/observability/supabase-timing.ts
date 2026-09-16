import { logServerWarning } from "@/server/observability/logger";
import { recordLatencySample } from "@/server/observability/latency-percentiles";

/** Never log URLs, filters, headers, request bodies or returned records. */
export function reportSlowSupabaseRequest(target: URL, method: string, durationMs: number, status: number | null) {
  const relation = /^\/rest\/v1\/(?:rpc\/)?([a-z_][a-z0-9_]*)\/?$/.exec(target.pathname)?.[1];
  const source = relation ? `supabase.${relation}`
    : target.pathname.startsWith("/auth/v1/") ? "supabase.auth"
      : "supabase.other";
  recordLatencySample("supabase.database", durationMs, status == null || status >= 500);
  if (durationMs < 1000) return;
  logServerWarning("Slow Supabase request", {
    event: "slow_supabase_request",
    source,
    httpMethod: method,
    durationMs: Math.round(durationMs),
    httpStatus: status,
  });
}
