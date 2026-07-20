import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isMockMode } from "@/lib/mock-mode";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { limitedServerFetch } from "@/lib/supabase/server-fetch";
import type { Database } from "@/types/database";

export async function createClient() {
  if (isMockMode()) {
    throw new Error("Mock mode is enabled. Disable NEXT_PUBLIC_ENABLE_MOCK_MODE to use the real Supabase project.");
  }

  const { url, publishableKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    url,
    publishableKey,
    {
      global: { fetch: limitedServerFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server components cannot set cookies; middleware handles refresh.
          }
        },
      },
    },
  );
}
