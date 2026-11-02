// Only unconfirmed, empty daily-food rows are eligible; recorded zeros stay visible.
export function omitEmptyDailyHistory(line: Record<string, unknown> | undefined, status: string | undefined, available: boolean, locked: boolean) {
  if (!line || status !== "draft" || available || locked || line.daily_tracking !== "food_daily") return false;
  if (["qty_sent_confirmed", "morning_received_provided", "wastage_provided", "do_managed", "stockout"].some(key => line[key] === true)) return false;
  if (line.qty_sent_source !== "unavailable") return false;
  if (["qty_sent", "morning_received_qty", "evening_leftover_qty", "wastage_qty", "qty_sent_estimated", "usage_qty", "sold_qty", "saleable_next_day_qty"].some(key => line[key] != null && line[key] !== 0)) return false;
  return ["wastage_reason", "notes", "stockout_time"].every(key => line[key] == null || String(line[key]).trim() === "");
}
