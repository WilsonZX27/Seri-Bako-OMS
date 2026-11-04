export type ProductAvailability = { available_from?: string | null; available_until?: string | null };
/** Both ends are inclusive; empty dates mean unrestricted availability. */
export function productAvailableOn(product: ProductAvailability, date: string) {
  return (!product.available_from || product.available_from <= date) && (!product.available_until || product.available_until >= date);
}

/** Display saved bounds even when the descriptive seasonal flag is false. */
export function productAvailabilityLabel(product: ProductAvailability & { is_seasonal?: boolean | null }) {
  const { available_from: from, available_until: until } = product;
  if (from && until) return `${from} – ${until}`;
  if (from) return `From ${from}`;
  if (until) return `Until ${until}`;
  return product.is_seasonal ? "Seasonal · dates not set" : "Year-round";
}
