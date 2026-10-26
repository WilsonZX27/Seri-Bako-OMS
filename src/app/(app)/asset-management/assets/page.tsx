import { redirect } from "next/navigation";

// Keep existing asset-list links usable; the workspace owns filtering and access.
export default async function AssetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  query.set("view", "assets");
  redirect(`/asset-management?${query}`);
}
