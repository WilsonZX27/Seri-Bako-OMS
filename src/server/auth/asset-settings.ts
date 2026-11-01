import { canManageAssetDestinations } from "@/lib/asset-settings-access";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { requirePermission } from "@/server/auth/permissions";

export async function requireAssetDestinationManager() {
  const actor = await requireActiveTenantActor();
  if (!canManageAssetDestinations(actor.roleCode)) throw new Error("Your role cannot manage asset destinations.");
  await requirePermission("assets.view");
  return actor;
}
