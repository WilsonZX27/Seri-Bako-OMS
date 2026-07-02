import { headers } from "next/headers";

export async function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin")?.trim();
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export function getAuthRedirectUrl(next = "/set-password") {
  const normalizedNext = next.startsWith("/") ? next : `/${next}`;
  return `/auth/callback?next=${encodeURIComponent(normalizedNext)}`;
}
