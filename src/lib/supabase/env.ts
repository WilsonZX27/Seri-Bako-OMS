export function getSupabaseEnv() {
  // Server-only overrides keep local verification isolated even when Next has
  // inlined public build-time variables from a workstation `.env.local`.
  const url = process.env.SUPABASE_URL?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

  return {
    url,
    publishableKey,
    appUrl,
  };
}

export function hasSupabaseEnv() {
  const { url, publishableKey } = getSupabaseEnv();
  return Boolean(url && publishableKey);
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();

  if (!env.url || !env.publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return env;
}

export function getAppUrlEnv() {
  return getSupabaseEnv().appUrl;
}
