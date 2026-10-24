import type { LooseSupabase } from "@/lib/supabase/loose";
import { assetLocationDisplayName } from "@/lib/asset-location-display";

type Notice = { entity_type?: string | null; entity_id?: string | null };

/** Only the displayed, already-visible notices are enriched. Table RLS still applies. */
export async function getRepairNotificationIdentities(db: LooseSupabase, notices: Notice[]) {
  const ids = [...new Set(notices.filter(row => row.entity_type === "asset_maintenance" && row.entity_id).map(row => row.entity_id!))].slice(0, 5);
  const identities = new Map<string, string>();
  if (!ids.length) return identities;
  const repairs = await db.from("asset_maintenance").select("id,asset_id,location_id,description").in("id", ids);
  if (repairs.error) throw repairs.error;
  const rows = (repairs.data ?? []) as { id: string; asset_id: string | null; location_id: string | null; description?: string | null }[];
  const assetIds = [...new Set(rows.flatMap(row => row.asset_id ? [row.asset_id] : []))];
  const locationIds = [...new Set(rows.flatMap(row => row.location_id ? [row.location_id] : []))];
  const [assets, locations] = await Promise.all([
    assetIds.length ? db.from("assets").select("id,item_name,asset_code").in("id", assetIds) : {data: [], error: null},
    locationIds.length ? db.from("asset_locations").select("id,source_name,kind,branch_id").in("id", locationIds) : {data: [], error: null},
  ]);
  if (assets.error) throw assets.error;
  if (locations.error) throw locations.error;
  const locationRows = (locations.data ?? []) as {id: string; source_name: string; kind: string; branch_id: string | null}[];
  const branchIds = [...new Set(locationRows.flatMap(row => row.kind === "branch" && row.branch_id ? [row.branch_id] : []))];
  const branches = branchIds.length ? await db.from("branches").select("id,branch_name").in("id", branchIds) : {data: [], error: null};
  if (branches.error) throw branches.error;
  const branchNames = new Map(((branches.data ?? []) as {id:string;branch_name:string}[]).map(row => [row.id,row.branch_name]));
  const assetNames = new Map(((assets.data ?? []) as {id:string;item_name:string;asset_code:string}[]).map(row => [row.id, [row.item_name,row.asset_code].filter(Boolean).join(" · ")]));
  const locationNames = new Map(locationRows.map(row => [row.id,assetLocationDisplayName(row,branchNames)]));
  for (const row of rows) {
    const description=row.description?.trim();
    const label = [assetNames.get(row.asset_id ?? ""),locationNames.get(row.location_id ?? ""),description ? description.slice(0,160)+(description.length>160?"…":"") : null].filter(Boolean).join(" · ");
    if (label) identities.set(row.id,label);
  }
  return identities;
}
