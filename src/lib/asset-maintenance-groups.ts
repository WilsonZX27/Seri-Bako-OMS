/** Presentation only: never mutates, merges or closes historical requests. */
export function groupMaintenanceRequests<T extends { id: string; asset_id?: string | null; status?: string | null }>(records: T[]) {
  const groups = new Map<string, T[]>();
  for (const record of records) {
    const key = record.asset_id ? `asset:${record.asset_id}` : `request:${record.id}`;
    const rows = groups.get(key) ?? []; rows.push(record); groups.set(key, rows);
  }
  return [...groups.values()];
}
