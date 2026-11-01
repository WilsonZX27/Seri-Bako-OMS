export function canManageAssetDestinations(role: string) {
  return ["super_admin", "manager", "finance", "purchasing"].includes(role);
}
