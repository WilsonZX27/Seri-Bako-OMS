const MAX_CONCURRENT_SUPABASE_REQUESTS = 1;
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
  const hostname = new URL(target).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") return fetch(input, { ...init, cache: "no-store" });
  await acquire();
  try {
    // Supabase reads back operational state immediately after an atomic mutation.
    // Do not let the local Next fetch cache replay the pre-posting transfer detail.
    return await fetch(input, { ...init, cache: "no-store" });
  } finally {
    release();
  }
}
