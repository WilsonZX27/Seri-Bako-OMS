type AssetLocationLabel = { source_name: string; kind: string; branch_id: string | null };

/** OMS branch names are authoritative; keep unmapped imports identifiable. */
export function assetLocationDisplayName(location: AssetLocationLabel, branchNames: ReadonlyMap<string, string>): string {
  if (location.kind !== "branch") return location.source_name;
  const canonical = location.branch_id ? branchNames.get(location.branch_id)?.trim() : undefined;
  return canonical || `${location.source_name} · Unmapped location`;
}
