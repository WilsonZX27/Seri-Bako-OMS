const configuredConcurrency = Number(process.env.SUPABASE_LOCAL_FETCH_CONCURRENCY ?? "3");
const MAX_CONCURRENT_SUPABASE_REQUESTS = Number.isFinite(configuredConcurrency)
  ? Math.min(12, Math.max(1, Math.floor(configuredConcurrency)))
  : 3;
let activeRequests = 0;
const waiters: Array<() => void> = [];

async function acquire() {
  if (activeRequests < MAX_CONCURRENT_SUPABASE_REQUESTS) {
    activeRequests += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
}

function release() {
  const next = waiters.shift();
  if (next) next();
  else activeRequests -= 1;
}

export async function limitedServerFetch(input: RequestInfo | URL, init?: RequestInit) {
  const target = input instanceof Request ? input.url : input.toString();
  const url = new URL(target);
  const hostname = url.hostname;
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const execute = async () => {
    const started = performance.now();
    let status: number | null = null;
    try {
      const response = await fetch(input, { ...init, cache: "no-store" });
      status = response.status;
      return response;
    } finally {
      if (reliabilityFlags.observation) reportSlowSupabaseRequest(url, method, performance.now() - started, status);
    }
  };
  const safeRead = method === "GET" || method === "HEAD";
  const fetchWithPolicy = () => reliabilityFlags.readRetry && safeRead
    ? withReadRetry(execute, { circuitKey: `supabase:${hostname}` })
    : execute();
  if (hostname !== "127.0.0.1" && hostname !== "localhost") return fetchWithPolicy();
  await acquire();
  try {
    // Supabase reads back operational state immediately after an atomic mutation.
    // Do not let the local Next fetch cache replay the pre-posting transfer detail.
    return await fetchWithPolicy();
  } finally {
    release();
  }
}
import { reliabilityFlags } from "@/lib/reliability/flags";
import { withReadRetry } from "@/lib/reliability/retry";
import { reportSlowSupabaseRequest } from "@/server/observability/supabase-timing";
