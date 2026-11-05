import { randomUUID } from "node:crypto";
import { reliabilityFlags } from "@/lib/reliability/flags";
import { logServerInfo, logServerWarning, type LogContext } from "@/server/observability/logger";

type ReadStates = NonNullable<LogContext["readStates"]>;
type ReadName = keyof ReadStates;

function failureKind(error: unknown) {
  const candidate = error as { code?: unknown; name?: unknown; message?: unknown } | null;
  if (candidate?.message === "Inventory summary read timed out.") return "workspace_deadline";
  if (candidate?.name === "AbortError" || candidate?.name === "TimeoutError") return candidate.name;
  const code = typeof candidate?.code === "string" ? candidate.code : "";
  return ["57014", "PGRST002", "PGRST003", "PGRST202", "42883", "42501", "500", "502", "503", "504"].includes(code) ? code : "read_failed";
}

/** One sanitized snapshot per workspace attempt; never log inputs, results or error text. */
export function createInventoryReadDiagnostics() {
  const enabled = reliabilityFlags.observation;
  const operationId = enabled ? randomUUID() : undefined;
  const states: ReadStates = { summary: { status: "pending" }, movement: { status: "pending" }, permissions: { status: "pending" } };
  return {
    async track<T>(name: ReadName, read: () => Promise<T>): Promise<T> {
      const started = performance.now();
      try {
        const value = await read();
        states[name] = { status: "fulfilled", durationMs: Math.round(performance.now() - started) };
        return value;
      } catch (error) {
        states[name] = { status: "rejected", durationMs: Math.round(performance.now() - started) };
        throw error;
      }
    },
    async run<T>(read: () => Promise<T>): Promise<T> {
      const started = performance.now();
      const emit = (failed: boolean, error?: unknown) => {
        if (!enabled) return;
        // Diagnostics must not replace the read's value or original error.
        try {
          const context: LogContext = { source: "inventory.workspace", event: failed ? "inventory_read_failed" : "inventory_read_settled", operationId, durationMs: Math.round(performance.now() - started), readStates: { ...states }, ...(failed ? { errorCode: failureKind(error) } : {}) };
          if (failed) logServerWarning("Inventory workspace read failed", context);
          else logServerInfo("Inventory workspace read settled", context);
        } catch { /* Best-effort observability only. */ }
      };
      try {
        const value = await read();
        emit(false);
        return value;
      } catch (error) {
        emit(true, error);
        throw error;
      }
    },
  };
}
