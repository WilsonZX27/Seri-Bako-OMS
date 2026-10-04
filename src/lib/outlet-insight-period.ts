import { addDays } from "@/lib/production-planning/forecast";
export type InsightPeriod = "1" | "7" | "30" | "month";
export function insightPeriod(value?: string): InsightPeriod { return value === "1" || value === "30" || value === "month" ? value : "7"; }
export function insightRange(period: InsightPeriod, end: string) {
  addDays(end, 0);
  const start = period === "month" ? `${end.slice(0,8)}01` : addDays(end, -(Number(period)-1));
  const days = Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000)+1;
  return { start, end, days, previousStart: addDays(start,-days), previousEnd: addDays(start,-1) };
}
export function insightDelta(current: number | null, previous: number | null) {
  if(current===null||previous===null)return null;
  return { absolute: current-previous, percent: previous===0?null:(current-previous)/previous*100 };
}
