import { createBrowserClient } from "@supabase/ssr";
import { isMockMode } from "@/lib/mock-mode";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export function createClient() {
  if (isMockMode()) {
    throw new Error("Mock mode is enabled. Disable NEXT_PUBLIC_ENABLE_MOCK_MODE to use the real Supabase project.");
  }

  const { url, publishableKey } = requireSupabaseEnv();

  return createBrowserClient<Database>(
    url,
    publishableKey,
  );
}
