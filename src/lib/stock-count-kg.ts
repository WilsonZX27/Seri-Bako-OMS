import { z } from "zod";
const optionalNumber = z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().finite().positive().max(1_000_000).nullable());
export const stockCountWeightSetupSchema = z.object({
  units_per_purchase: optionalNumber.refine((value) => value === null || Number.isInteger(value), "Pack count must be a whole number"),
  kg_per_unit: optionalNumber.refine((value) => value === null || Math.abs(value - Math.round(value * 10000) / 10000) < 1e-9, "Use at most four decimals"),
  package_description: z.string().trim().max(200).default(""),
  evidence: z.string().trim().max(1000).default(""),
}).superRefine((value, ctx) => {
  if ((value.units_per_purchase === null) !== (value.kg_per_unit === null)) ctx.addIssue({ code: "custom", message: "Enter both packs per purchase unit and net KG per pack, or leave both blank" });
  if (value.kg_per_unit !== null && (value.package_description.length < 2 || value.evidence.length < 3)) ctx.addIssue({ code: "custom", message: "Describe the sealed package and the source of its net weight" });
});
export type StockCountKgMeasurement = {
  counted_kg: number; purchase_uom: string; base_uom: string;
  units_per_purchase: number | null; kg_per_unit: number | null;
  package_description: string; evidence: string; version: number;
};
export type StockCountKgSetup = { purchase_uom: string; measurement: StockCountKgMeasurement | null };
export function packagingKg(units: string | number | null, net: string | number | null) {
  if (units === "" || net === "" || units == null || net == null) return null;
  const count = Number(units), kg = Number(net);
  return Number.isInteger(count) && count > 0 && count <= 1_000_000 && Number.isFinite(kg) && kg > 0 && kg <= 1_000_000 ? count * kg : null;
}

export function weightPostingConfirmation(verifiedLineCount: number, itemCodes: string[]) {
  return {
    label: `Post ${verifiedLineCount} verified items`,
    description: `${verifiedLineCount} inventory lines will post. ${itemCodes.join(", ")} will be separated into ${itemCodes.length} pending weight reviews, with original snapshots and measured KG preserved. Their inventory will not change. Packaging ratios do not resolve historical balances. This is not a complete posting of all items.`,
  };
}
