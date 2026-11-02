import { z } from "zod";
import type { Allocation, Plan, ProductionLine } from "./types";

const quantity = z.number().finite().min(0).max(1_000_000);
const note = z.string().max(1000);
const draftSchema = z.object({
  revision: z.number().int().positive(),
  allocations: z.array(z.object({ product_id: z.string(), branch_id: z.string(), approved_qty: quantity.nullable(), reason: note })).max(10000),
  production: z.array(z.object({ product_id: z.string(), trays: quantity.nullable(), retained_qty: quantity, reason: note, tray_mode: z.enum(["automatic", "manual"]).nullable().optional() })).max(500),
});
export function planningDraftKey(companyId: string, actorId: string, planId: string) {
  return `oms:planning-draft:v1:${companyId}:${actorId}:${planId}`;
}
export function encodePlanningDraft(revision: number, allocations: Allocation[], production: ProductionLine[]) {
  return JSON.stringify(draftSchema.parse({ revision, allocations, production }));
}
/** Restore editable fields only; current server data owns identity, evidence and permissions. */
export function decodePlanningDraft(raw: string, plan: Plan): { allocations: Allocation[]; production: ProductionLine[] } {
  if (raw.length > 5_000_000) throw new Error("Stored draft is too large.");
  const draft = draftSchema.parse(JSON.parse(raw));
  if (plan.status !== "draft" || draft.revision !== plan.revision) throw new Error("The saved plan has changed. Your local draft is retained; review it before replacing current data.");
  const allocations = new Map(draft.allocations.map(a => [`${a.product_id}:${a.branch_id}`, a]));
  const production = new Map(draft.production.map(p => [p.product_id, p]));
  if (allocations.size !== draft.allocations.length || production.size !== draft.production.length || allocations.size !== plan.allocations.length || production.size !== plan.product_lines.length || plan.allocations.some(a => !allocations.has(`${a.product_id}:${a.branch_id}`)) || plan.product_lines.some(p => !production.has(p.product_id))) throw new Error("The plan contents changed. Your local draft is retained for review.");
  return {
    allocations: plan.allocations.map(a => ({ ...a, ...allocations.get(`${a.product_id}:${a.branch_id}`)! })),
    production: plan.product_lines.map(p => ({ ...p, ...production.get(p.product_id)! })),
  };
}
