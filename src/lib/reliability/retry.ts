type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  jitterMs?: number;
  circuitKey?: string;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (context: { attempt: number; delayMs: number; error: unknown }) => void;
};

type CircuitState = { failures: number[]; openUntil: number };
const circuits = new Map<string, CircuitState>();
const FAILURE_WINDOW_MS = 15_000;
const CIRCUIT_OPEN_MS = 15_000;
const CIRCUIT_THRESHOLD = 3;

export class CircuitOpenError extends Error {
  constructor(readonly circuitKey: string) {
    super("This service is recovering. Try again shortly.");
    this.name = "CircuitOpenError";
  }
}

export function isTransientFailure(error: unknown) {
  const value = error as { status?: number; code?: string; message?: string } | null;
  const status = Number(value?.status ?? 0);
  const text = `${value?.code ?? ""} ${value?.message ?? String(error ?? "")}`.toLowerCase();
  return [408, 429, 502, 503, 504].includes(status)
    || /\b(408|429|502|503|504)\b/.test(text)
    || text.includes("fetch failed")
    || text.includes("network")
    || text.includes("timeout")
    || text.includes("temporarily unavailable");
}

function stateFor(key: string) {
  const state = circuits.get(key) ?? { failures: [], openUntil: 0 };
  circuits.set(key, state);
  return state;
}

function noteFailure(key: string) {
  const now = Date.now();
  const state = stateFor(key);
  state.failures = [...state.failures.filter((time) => now - time <= FAILURE_WINDOW_MS), now];
  if (state.failures.length >= CIRCUIT_THRESHOLD) state.openUntil = now + CIRCUIT_OPEN_MS;
}

export function resetRetryCircuit(key: string) {
  circuits.delete(key);
}

export async function withReadRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  // One original call, one immediate retry, then one short jittered retry.
  const attempts = Math.min(3, Math.max(1, options.attempts ?? 3));
  const circuitKey = options.circuitKey ?? "default-read";
  const retryable = options.isRetryable ?? isTransientFailure;
  const state = stateFor(circuitKey);
  if (state.openUntil > Date.now()) throw new CircuitOpenError(circuitKey);

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await operation();
      resetRetryCircuit(circuitKey);
      return result;
    } catch (error) {
      lastError = error;
      if (!retryable(error) || attempt === attempts) {
        if (retryable(error)) noteFailure(circuitKey);
        throw error;
      }
      const base = options.baseDelayMs ?? 350;
      const jitter = Math.floor(Math.random() * (options.jitterMs ?? 150));
      const delayMs = attempt === 1 ? 0 : base * 2 ** (attempt - 2) + jitter;
      options.onRetry?.({ attempt, delayMs, error });
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
