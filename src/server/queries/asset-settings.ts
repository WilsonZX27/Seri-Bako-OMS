import { isMockMode } from "@/lib/mock-mode";
import { requireAssetDestinationManager } from "@/server/auth/asset-settings";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";

export async function getAssetOtherLocations(page: number) {
  await requireAssetDestinationManager();
  if (isMockMode()) return { rows: [{ id: "00000000-0000-4000-8000-000000000101", source_name: "Hostel — training example", other_active: true, settings_revision: 0 }], total: 1, page: 1 };
  const db = looseSupabase(await createClient());
  const currentPage = Math.max(1, Math.min(10000, Math.trunc(page) || 1));
  const result = await db.rpc("get_asset_other_location_settings", { p_page: currentPage });
  if (result.error) throw new Error("Destinations could not be loaded. Please try again.");
  const payload = result.data as { rows?: unknown; total?: unknown } | null;
  if (!Array.isArray(payload?.rows) || typeof payload?.total !== "number") throw new Error("Destination count is unavailable. Please try again.");
  return { rows: payload.rows as { id: string; source_name: string; other_active: boolean; settings_revision: number }[], total: payload.total, page: currentPage };
}
