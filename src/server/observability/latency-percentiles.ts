import { logServerInfo } from "@/server/observability/logger";

const WINDOW_SIZE = 25;
const MAX_SERIES = 64;

type LatencySample = {
  durationMs: number;
  failed: boolean;
};

const windows = new Map<string, LatencySample[]>();

function percentile(sorted: number[], ratio: number) {
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

/**
 * Keeps a small, process-local window and emits aggregate latency only. Values,
 * URLs, query strings, record identifiers and request bodies never enter it.
 */
export function recordLatencySample(source: string, durationMs: number, failed = false) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  if (!windows.has(source) && windows.size >= MAX_SERIES) return;

  const samples = windows.get(source) ?? [];
  samples.push({ durationMs: Math.round(durationMs), failed });
  windows.set(source, samples);
  if (samples.length < WINDOW_SIZE) return;

  const durations = samples.map((sample) => sample.durationMs).sort((left, right) => left - right);
  logServerInfo("Server latency window", {
    event: "server_latency_percentiles",
    source,
    sampleCount: samples.length,
    failureCount: samples.filter((sample) => sample.failed).length,
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99),
    maxMs: durations.at(-1) ?? 0,
  });
  windows.delete(source);
}

export async function measureServerOperation<T>(source: string, operation: () => Promise<T>) {
  const started = performance.now();
  try {
    const result = await operation();
    recordLatencySample(source, performance.now() - started);
    return result;
  } catch (error) {
    recordLatencySample(source, performance.now() - started, true);
    throw error;
  }
}
