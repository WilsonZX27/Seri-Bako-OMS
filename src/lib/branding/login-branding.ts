/** Public identity explicitly configured for this deployment; never discovers a tenant. */
export function loginBranding(env: Record<string, string | undefined> = process.env) {
  const companyName = env.LOGIN_BRAND_NAME?.trim().replace(/\s+/g, " ").slice(0, 80);
  const rawLogo = env.LOGIN_BRAND_LOGO_URL?.trim();
  let logoUrl: string | null = null;
  if (companyName && rawLogo) {
    try {
      const url = new URL(rawLogo);
      if (url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash) logoUrl = url.href;
    } catch { /* An invalid public logo must not break sign-in. */ }
  }
  return { company_name: companyName || "Operations", logo_url: logoUrl };
}
