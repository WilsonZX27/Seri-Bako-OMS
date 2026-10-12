/** Versioned, deterministic quantity proxy. This is not product POS sales. */
export const FORECAST_VERSION = "quantity-proxy-v3";
export type HistoryPoint = {
  recordId: string; date: string; received: number; leftover: number; wastage: number;
  receivedProvided: boolean; completed: boolean; specialEvent: boolean; stockout: boolean; stockoutObserved?: boolean;
};
export type Forecast = {
  manualReason?: string;
  method: "same-weekday" | "recent-day-type" | "manual";
  suggested: number | null; weightedMovement: number | null; minimum: number | null;
  reductionFloor: number | null; stockoutRisk: boolean; excluded: number;
  evidence: HistoryPoint[]; version: string;
};
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== date) throw new Error("Invalid business date.");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const weekend = (date: string) => [0, 6].includes(weekday(date));
export function recommendQuantity(history: HistoryPoint[], date: string, minimum: number | null, bufferPercent = 10, maxDecreasePercent = 10): Forecast {
  const from = addDays(date, -56);
  if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) throw new Error("Invalid minimum.");
  if (![bufferPercent, maxDecreasePercent].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) throw new Error("Invalid planning parameters.");
  const inWindow = history.filter((p) => p.date >= from && p.date < date);
  const valid = inWindow.filter((p) => p.completed && p.receivedProvided && !p.specialEvent
    && [p.received, p.leftover, p.wastage].every((n) => Number.isFinite(n) && n >= 0)
    && p.leftover + p.wastage <= p.received).sort((a, b) => a.date.localeCompare(b.date) || a.recordId.localeCompare(b.recordId));
  const same = valid.filter((p) => weekday(p.date) === weekday(date));
  const recent = valid.filter((p) => p.date >= addDays(date, -14) && weekend(p.date) === weekend(date));
  const evidence = same.length >= 3 ? same : recent.length >= 5 ? recent : [];
  const method = same.length >= 3 ? "same-weekday" : recent.length >= 5 ? "recent-day-type" : "manual";
  // The fallback must keep the same decrease/stockout protection even when
  // no observation exists for the delivery weekday. Use its latest comparable
  // observation; insufficient history retains the existing same-weekday floor.
  const latest = evidence.at(-1) ?? same.at(-1);
  // Zero leftover/wastage is a potential sell-out; require review before decreasing.
  const stockoutRisk = valid.some((p) => p.date >= addDays(date, -14) && (p.stockout || (p.received > 0 && p.leftover === 0 && p.wastage === 0)));
  const observationMissing = evidence.some((p) => !p.stockout && p.stockoutObserved !== true);
  const reductionFloor = latest ? Math.ceil(latest.received * (stockoutRisk || observationMissing ? 1 : 1 - maxDecreasePercent / 100)) : null;
  const weights = evidence.reduce((sum, _, i) => sum + i + 1, 0);
  const weightedMovement = evidence.length ? evidence.reduce((sum, p, i) => sum + (p.received - p.leftover - p.wastage) * (i + 1), 0) / weights : null;
  // Unconfirmed minimums are configuration gaps, never inferred from excess stock.
  const suggested = weightedMovement === null || minimum === null ? null : Math.max(minimum, reductionFloor ?? 0, Math.ceil(weightedMovement * (1 + bufferPercent / 100)));
  return { method, suggested, weightedMovement, minimum, reductionFloor, stockoutRisk, excluded: inWindow.length - valid.length, evidence, version: FORECAST_VERSION };
}
export function trayRequirement(demand: number, yieldPerTray: number, trays?: number, retained = 0) {
  if (![demand, yieldPerTray, retained].every(Number.isFinite) || demand < 0 || yieldPerTray <= 0 || retained < 0) throw new Error("Invalid production quantities.");
  const count = trays ?? Math.ceil(demand / yieldPerTray);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Production trays must be whole numbers.");
  const output = count * yieldPerTray;
  return { trays: count, output, unallocated: output - demand - retained };
}
