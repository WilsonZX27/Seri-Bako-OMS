import { NextResponse } from "next/server";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

type DependencyState = "healthy" | "degraded" | "unavailable";

async function probe(url: string, headers: HeadersInit): Promise<DependencyState> {
  try {
    const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (response.ok || response.status === 401) return "healthy";
    if (response.status === 404) return "degraded";
    if ([408, 429, 502, 503, 504].includes(response.status)) return "degraded";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    const { url, publishableKey } = requireSupabaseEnv();
    const headers = { apikey: publishableKey };
    const [database, auth, storage] = await Promise.all([
      probe(`${url}/rest/v1/`, headers),
      probe(`${url}/auth/v1/health`, headers),
      probe(`${url}/storage/v1/status`, headers),
    ]);
    const states = [database, auth, storage];
    const overall = states.includes("unavailable") ? "unavailable" : states.includes("degraded") ? "degraded" : "healthy";
    return NextResponse.json(
      { status: overall, checkedAt, dependencies: { app: "healthy", database, auth, storage } },
      { status: overall === "unavailable" ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", checkedAt, dependencies: { app: "healthy", database: "unavailable", auth: "unavailable", storage: "unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
