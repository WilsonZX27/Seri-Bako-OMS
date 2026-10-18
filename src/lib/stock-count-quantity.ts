// Stock Count quantities retain the database's existing four-decimal precision.
// Three-decimal entry must never pass through the general two-decimal formatter.
export function formatStockCountQuantity(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-MY", { maximumFractionDigits: 4 }).format(Number(value ?? 0));
}

export function stockCountQuantityInput(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? String(numeric) : "";
}

export function stockCountInputStep(uom: string, value: string) {
  if (!["kg", "g", "l", "ml", "ltr", "liter", "litre"].includes(uom.trim().toLowerCase())) return 1;
  // Keep valid historical four-decimal counts editable without stepMismatch.
  const numeric = Number(value);
  return Math.abs(numeric * 1000 - Math.round(numeric * 1000)) > 1e-7 ? 0.0001 : 0.001;
}
