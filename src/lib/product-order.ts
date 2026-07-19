const familyOrder = ["SC", "RB", "SRR", "BI", "RT", "BB", "PKG"] as const;
const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export type DisplayOrderedProduct = { product_code: string; display_order?: number | null };

export function compareProductDisplayOrder(a: DisplayOrderedProduct, b: DisplayOrderedProduct) {
  const family = (code: string) => {
    const index = familyOrder.findIndex((prefix) => code.toUpperCase().startsWith(prefix));
    return index < 0 ? familyOrder.length : index;
  };
  return family(a.product_code) - family(b.product_code)
    || Number(a.display_order ?? 9999) - Number(b.display_order ?? 9999)
    || natural.compare(a.product_code, b.product_code);
}

export function sortProductsForDisplay<T extends DisplayOrderedProduct>(products: T[]) {
  return [...products].sort(compareProductDisplayOrder);
}
