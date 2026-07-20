import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { limitedServerFetch } from "@/lib/supabase/server-fetch";
import type { Database } from "@/types/database";

export function requireSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!serviceRoleKey) {
    throw new Error("Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }
  return serviceRoleKey;
}

export function createAdminClient() {
  const { url } = requireSupabaseEnv();
  return createClient<Database>(url, requireSupabaseServiceRoleKey(), {
    global: { fetch: limitedServerFetch },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
