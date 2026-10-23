export type AssetTransferAction = "approve" | "reject" | "dispatch" | "receive";
export function assetTransferActions(status: string, access: { canApprove: boolean; canTransfer: boolean; canAccessSource: boolean; canAccessDestination: boolean }): AssetTransferAction[] {
  if (status === "requested" && access.canApprove && access.canAccessSource) return ["approve", "reject"];
  if (status === "approved" && access.canTransfer && access.canAccessSource) return ["dispatch"];
  if (status === "dispatched" && access.canTransfer && access.canAccessDestination) return ["receive"];
  return [];
}

/** Preserve the picker's GET filters through selection and Change asset. */
export function assetTransferPickerHref(query: { q?: string; page?: number }, assetId?: string) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q.slice(0, 120));
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (assetId) params.set("asset", assetId);
  const search = params.toString();
  return `/asset-management/transfers/new${search ? `?${search}` : ""}`;
}
