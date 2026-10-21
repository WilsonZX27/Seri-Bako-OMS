import { addDays, type Forecast, type HistoryPoint } from "@/lib/production-planning/forecast";

export type EmployeeForecast = {
  branch_id: string; product_id: string; weekday_qty: number | null;
  weekend_qty: number | null; updated_at: string | null; source: string;
};
export const dayType = (date: string): "weekday" | "weekend" =>
  [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()) ? "weekend" : "weekday";

/** Prefer pairs within the demand bounds. An odd quantity is safer than inventing demand. */
export function preferEven(value: number, lower: number, upper: number): number {
  const quantity = Math.max(Math.ceil(lower), Math.min(Math.ceil(upper), Math.ceil(value)));
  if (quantity % 2 === 0) return quantity;
  if (quantity + 1 <= Math.floor(upper)) return quantity + 1;
  if (quantity - 1 >= Math.ceil(lower)) return quantity - 1;
  return quantity;
}

/** Employee forecasts are an explicit demand baseline, never a minimum or POS sales. */
export function recommendEmployeeQuantity(
  history: HistoryPoint[], date: string, employee: number, minimum: number | null,
  bufferPercent: number, maxDecreasePercent: number, allowHistory: boolean,
): Forecast {
  if (![employee, bufferPercent, maxDecreasePercent].every(Number.isFinite) || employee < 0
    || bufferPercent < 0 || bufferPercent > 100 || maxDecreasePercent < 0 || maxDecreasePercent > 100
    || (minimum !== null && (!Number.isFinite(minimum) || minimum < 0))) throw new Error("Invalid employee forecast.");
  const period = history.filter(p => p.date >= addDays(date, -30) && p.date < date && dayType(p.date) === dayType(date));
  const valid = allowHistory ? period.filter(p => p.completed && p.receivedProvided && !p.specialEvent
    && [p.received, p.leftover, p.wastage].every(n => Number.isFinite(n) && n >= 0)
    && p.leftover + p.wastage <= p.received).sort((a,b) => a.date.localeCompare(b.date) || a.recordId.localeCompare(b.recordId)) : [];
  const enough = valid.length >= 5;
  const received = valid.reduce((s,p) => s + p.received, 0);
  const wastageRate = received > 0 ? valid.reduce((s,p) => s + p.wastage, 0) / received : null;
  const stockoutRisk = valid.some(p => p.date >= addDays(date, -14) && (p.stockout || (p.received > 0 && p.leftover === 0 && p.wastage === 0)));
  const observationMissing = valid.some(p => !p.stockout && p.stockoutObserved !== true);
  const weights = valid.reduce((s,_,i) => s + i + 1, 0);
  const movement = enough ? valid.reduce((s,p,i) => s + (p.received - p.leftover - p.wastage) * (i + 1), 0) / weights : null;
  const movementValues = valid.map(p => p.received - p.leftover - p.wastage).sort((a,b) => a-b);
  const p80 = enough ? movementValues[Math.ceil(movementValues.length * .8) - 1] : null;
  const buffered = p80 === null ? null : Math.ceil(p80 * (1 + bufferPercent / 100));
  // Never revive an explicit zero forecast or reduce a possible sell-out automatically.
  const reductionFloor = employee === 0 ? 0 : Math.ceil(employee * (stockoutRisk || observationMissing || !enough ? 1 : 1 - maxDecreasePercent / 100));
  let target = employee;
  if (employee > 0 && buffered !== null) {
    if (buffered > employee) target = Math.min(buffered, Math.ceil(employee * (1 + bufferPercent / 100)));
    else if (!stockoutRisk && wastageRate !== null && wastageRate >= .3) target = Math.max(buffered, reductionFloor);
  }
  const floor = Math.max(minimum ?? 0, reductionFloor);
  const ceiling = Math.max(floor, Math.ceil(target));
  const suggested = minimum === null ? null : preferEven(target, floor, ceiling);
  // Only outlets with enough evidence and <30% waste may absorb bounded surplus.
  const capacity = employee > 0 && suggested !== null && enough && wastageRate !== null && wastageRate < .3
    ? Math.max(suggested, Math.ceil(employee * (1 + bufferPercent / 100))) : suggested;
  return {
    method: enough ? "employee-history" : "employee-baseline", suggested, weightedMovement: movement,
    minimum, reductionFloor, stockoutRisk, excluded: period.length - valid.length,
    evidence: valid, version: "employee-demand-v1",
    employee: { quantity: employee, dayType: dayType(date), historyDays: valid.length, wastageRate,
      capacity: capacity ?? null, extra: 0, oddException: suggested !== null && suggested % 2 !== 0,
      note: allowHistory ? (enough ? "30-day movement reference; not product POS sales." : "Insufficient comparable history; employee baseline retained.")
        : "Employee baseline only. Multi-day or unknown shelf-life is not adjusted using daily receipts." },
  };
}

type Destination = { branchId: string; quantity: number; capacity: number; wastageRate: number | null; historyDays: number };
/** Returns only bounded additions. Unallocated output remains visible for a manager decision. */
export function distributeSafeSurplus(destinations: Destination[], surplus: number): Map<string, number> {
  const result = new Map<string, number>();
  if (!Number.isFinite(surplus) || surplus < 0) return result;
  const eligible = destinations.filter(d => d.historyDays >= 5 && d.wastageRate !== null && d.wastageRate < .3
    && [d.quantity,d.capacity].every(n => Number.isSafeInteger(n) && n >= 0) && d.capacity >= d.quantity + 2)
    .sort((a,b) => a.wastageRate! - b.wastageRate! || a.branchId.localeCompare(b.branchId));
  // Water-fill in pairs; each pass exhausts demand capacity or the available output.
  let pairs = Math.floor(surplus / 2);
  let active = eligible.map(d => ({...d,pairs:Math.floor((d.capacity-d.quantity)/2)}));
  while (pairs > 0 && active.length) {
    const share=Math.max(1,Math.floor(pairs/active.length));
    for (const d of active) {
      const take=Math.min(d.pairs,share,pairs);
      if(take>0){result.set(d.branchId,(result.get(d.branchId)??0)+take*2);pairs-=take;d.pairs-=take;}
    }
    active=active.filter(d=>d.pairs>0);
  }
  return result;
}
