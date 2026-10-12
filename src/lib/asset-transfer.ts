export type AssetTransferAction = "approve" | "reject" | "dispatch" | "receive";
export function assetTransferActions(status: string, access: { canApprove: boolean; canTransfer: boolean; canAccessSource: boolean; canAccessDestination: boolean }): AssetTransferAction[] {
  if (status === "requested" && access.canApprove && access.canAccessSource) return ["approve", "reject"];
  if (status === "approved" && access.canTransfer && access.canAccessSource) return ["dispatch"];
  if (status === "dispatched" && access.canTransfer && access.canAccessDestination) return ["receive"];
  return [];
}
