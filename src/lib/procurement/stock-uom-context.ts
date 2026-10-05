import { normalizeUom } from "@/lib/uom";

type ItemUnits = { base_unit: string; purchase_unit: string; conversion_to_base_unit?: number };
type MappingUnits = { item_id: string; branch_id: string; supplier_id: string; purchase_uom: string; conversion_to_base_uom: number | null };
/** The balance is already in base units. Only the explanatory purchase pack is converted. */
export function stockUomContext({ item, itemId, branchId, supplierId, purchaseUom, mappings }: {
  item?: ItemUnits; itemId: string; branchId: string | null; supplierId: string | null;
  purchaseUom: string; mappings: MappingUnits[] | null;
}) {
  if (!item) return null;
  const base = normalizeUom(item.base_unit), purchase = normalizeUom(purchaseUom);
  if (!base || !purchase) return null;
  if (base === purchase) return { base, purchase, factor: 1 };
  if (!mappings) return { base, purchase, factor: null };
  const matches = mappings.filter(m => m.item_id === itemId && m.branch_id === branchId && m.supplier_id === supplierId && normalizeUom(m.purchase_uom) === purchase);
  const factors = [...new Set(matches.map(m => Number(m.conversion_to_base_uom)))];
  const factor = factors.length === 1 ? factors[0] : matches.length === 0 && normalizeUom(item.purchase_unit) === purchase ? Number(item.conversion_to_base_unit) : null;
  return { base, purchase, factor: factor !== null && Number.isFinite(factor) && factor > 0 ? factor : null };
}
