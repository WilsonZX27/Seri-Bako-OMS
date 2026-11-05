export type InventoryActivity = { item_id: string; item_code: string; name: string; movement_count: number; historical_unit_status: "unverified" };

// Null means unsupported/untrusted, while [] means a verified empty period.
export function readInventoryActivity(payload: unknown, key: "purchased_activity" | "consumed_activity"): InventoryActivity[] | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (data.activity_metric !== "posted_movement_records" || data.quantity_summary_status !== "historical_units_unverified" || !Array.isArray(data[key])) return null;
  const rows = data[key] as unknown[];
  const ids = new Set<string>();
  for (const value of rows) {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    if (typeof row.item_id !== "string" || !row.item_id || ids.has(row.item_id) || typeof row.item_code !== "string" || typeof row.name !== "string" || row.historical_unit_status !== "unverified" || !Number.isSafeInteger(row.movement_count) || Number(row.movement_count) < 0) return null;
    ids.add(row.item_id);
  }
  return rows.map(value => {
    const row = value as InventoryActivity;
    return { item_id: row.item_id, item_code: row.item_code, name: row.name, movement_count: row.movement_count, historical_unit_status: "unverified" };
  });
}
