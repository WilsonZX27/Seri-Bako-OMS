export type ProductAvailability = { available_from?: string | null; available_until?: string | null };
/** Both ends are inclusive; empty dates mean unrestricted availability. */
export function productAvailableOn(product: ProductAvailability, date: string) {
  return (!product.available_from || product.available_from <= date) && (!product.available_until || product.available_until >= date);
}
