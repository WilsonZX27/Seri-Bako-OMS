export const defaultUoms = [
  "KG",
  "G",
  "L",
  "ML",
  "PCS",
  "BOX",
  "CTN",
  "PACK",
  "BAG",
  "BOTTLE",
  "TIN",
  "TRAY",
  "STICK",
  "TONG",
  "CRATE",
  "BLOCK",
  "SLICE",
  "PORTION",
  "TUB",
] as const;

export type DefaultUom = (typeof defaultUoms)[number];

export function normalizeUom(value: string | null | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

export function uomOptionsWithCurrent(value: string | null | undefined) {
  const normalized = normalizeUom(value);
  if (!normalized || defaultUoms.includes(normalized as DefaultUom)) return defaultUoms;
  return [normalized, ...defaultUoms];
}
