/** Asset management roles remain subject to tenant and location authorization. */
export function canAccessAssetManagement(roleCode: string): boolean {
  return ["super_admin", "manager", "outlet_supervisor"].includes(roleCode);
}
