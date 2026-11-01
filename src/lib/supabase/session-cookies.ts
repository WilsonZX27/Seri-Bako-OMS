import { combineChunks, isChunkLike, stringFromBase64URL } from "@supabase/ssr";

/** Ignore only undecodable input for this project's session; never write cookies. */
export async function readableSessionCookies<T extends { name: string; value: string }>(cookies: T[], url: string): Promise<T[]> {
  const key = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const value = await combineChunks(key, name => cookies.find(cookie => cookie.name === name)?.value ?? null);
  if (!value?.startsWith("base64-")) return cookies;
  try {
    stringFromBase64URL(value.slice(7));
    return cookies;
  } catch {
    // Keep names visible so a later explicit sign-in can replace old chunks.
    return cookies.map(cookie => isChunkLike(cookie.name, key) ? { ...cookie, value: "" } : cookie);
  }
}
