import { groupMaintenanceRequests } from "@/lib/asset-maintenance-groups";
import { addDays } from "@/lib/production-planning/forecast";
import type { LooseSupabase } from "@/lib/supabase/loose";
import type { AssetRecord } from "@/server/queries/assets";

/** Filter and group RLS-visible identities before pagination; never merge stored requests. */
export async function getMaintenanceGroupPage(db: LooseSupabase, company: string, page: number, pageSize: number, filters: { overview?: boolean; locationId?: string; status?: string; date?: string } = {}) {
  const query = (columns: string) => {
    let request = db.from("asset_maintenance").select(columns).eq("company_id", company);
    if (filters.overview) request = request.not("status", "in", "(Closed,Resolved,Cancelled,closed,resolved,cancelled)");
    if (filters.locationId) request = request.eq("location_id", filters.locationId);
    if (filters.status === "Outstanding") request = request.in("status", ["Open", "Assigned"]);
    else if (filters.status === "Processed") request = request.in("status", ["Resolved", "Closed"]);
    else if (filters.status && !["All", "all"].includes(filters.status)) request = request.eq("status", filters.status);
    if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) request = request.gte("source_data->>Created Date", filters.date).lt("source_data->>Created Date", addDays(filters.date, 1));
    return request;
  };
  const identities: { id: string; asset_id: string | null }[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await query("id,asset_id").order(filters.overview ? "created_at" : "source_data->>Created Date", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
    if (result.error || result.data === null) throw new Error(result.error?.message ?? "Maintenance groups unavailable.");
    identities.push(...result.data as typeof identities);
    if (result.data.length < 500) break;
  }
  const groups = groupMaintenanceRequests(identities);
  const ids = groups.slice((page - 1) * pageSize, page * pageSize).flat().map(row => row.id);
  const records = new Map<string, AssetRecord>();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const result = await query("*").in("id", ids.slice(offset, offset + 100));
    if (result.error || result.data === null) throw new Error(result.error?.message ?? "Maintenance records unavailable.");
    for (const row of result.data as AssetRecord[]) records.set(row.id, row);
  }
  return { records: ids.flatMap(id => records.has(id) ? [records.get(id)!] : []), total: groups.length };
}
