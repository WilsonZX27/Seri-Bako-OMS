import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatNumber } from "@/lib/utils";
import type { StockCountKgMeasurement } from "@/lib/stock-count-kg";

export type WeightReviewDisplay = { lineId: string; itemCode: string; itemName: string; measurement: StockCountKgMeasurement | null; action?: (formData: FormData) => Promise<void> };
export function StockCountWeightReviews({ reviews, reversed = false }: { reviews: WeightReviewDisplay[]; reversed?: boolean }) {
  if (!reviews.length) return null;
  return <section id="weight-reviews" className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3" aria-label="Separate weight reviews">
    <div><h2 className="font-semibold">{reviews.length} weight reviews pending · not posted</h2><p className="mt-1 text-sm">{reversed ? "The verified inventory posting was reversed. " : "Only the verified inventory lines were posted. "}These measured KG records are separate; their inventory is unchanged. Packaging evidence alone cannot resolve the historical KG/CTN baseline. An audited correction is still required.</p></div>
    {reviews.map(({ lineId, itemCode, itemName, measurement, action }) => <article key={lineId} className="space-y-2 border-t border-amber-200 pt-3">
      <h3 className="text-sm font-semibold">{itemCode} · {itemName}</h3>
      <p className="text-sm">Measured: {measurement ? `${formatNumber(measurement.counted_kg)} KG` : "Not recorded"} · No stock variance calculated</p>
      {action && measurement ? <details><summary className="cursor-pointer text-sm font-medium">Update weight / packaging evidence</summary><form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">Measured KG<Input name="counted_kg" type="number" required min="0" max="1000000" step="0.0001" defaultValue={measurement.counted_kg} /></label>
        <label className="space-y-1 text-xs">Packs per 1 {measurement.purchase_uom}<Input name="units_per_purchase" type="number" min="1" step="1" defaultValue={measurement.units_per_purchase ?? ""} /></label>
        <label className="space-y-1 text-xs">Net KG per pack<Input name="kg_per_unit" type="number" min="0.0001" step="0.0001" defaultValue={measurement.kg_per_unit ?? ""} /></label>
        <label className="space-y-1 text-xs">Pack description<Input name="package_description" maxLength={200} defaultValue={measurement.package_description} /></label>
        <label className="space-y-1 text-xs sm:col-span-2">Weight evidence<Input name="evidence" maxLength={1000} defaultValue={measurement.evidence} /></label>
        <p className="text-xs sm:col-span-2">Leave both package numbers blank if unknown. Use a package label or unopened-pack net weight, never remaining stock. Saving adds an evidence version; it does not post inventory or close this review.</p>
        <SubmitButton pendingLabel="Saving evidence...">Save review evidence</SubmitButton>
      </form></details> : measurement ? <p className="text-xs">Packaging: {measurement.units_per_purchase && measurement.kg_per_unit ? `${measurement.units_per_purchase} packs × ${measurement.kg_per_unit} KG per ${measurement.purchase_uom}` : "Not confirmed"}. {measurement.evidence}</p> : null}
    </article>)}
  </section>;
}
