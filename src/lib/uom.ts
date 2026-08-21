export const defaultUoms = [
  "BAG",
  "BLOCK",
  "BOTTLE",
  "BUNCH",
  "BOX",
  "CAN",
  "CASE",
  "CRATE",
  "CTN",
  "DOZEN",
  "G",
  "GAL",
  "GUNI",
  "JAR",
  "KG",
  "L",
  "MG",
  "ML",
  "NOS",
  "PACK",
  "PAIR",
  "PCS",
  "PKT",
  "PORTION",
  "ROLL",
  "SACHET",
  "SHEET",
  "SLICE",
  "STICK",
  "TIN",
  "TONG",
  "TONNE",
  "TRAY",
  "TUB",
  "UNIT",
] as const;

export type DefaultUom = (typeof defaultUoms)[number];

const uomAliases: Record<string, DefaultUom> = {
  BTL: "BOTTLE",
};

export function normalizeUom(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return uomAliases[normalized] ?? normalized;
}

export function uomOptionsWithCurrent(value: string | null | undefined) {
  return uomOptionsForValues([value]);
}

export function uomOptionsForValues(values: Array<string | null | undefined>) {
  const current = values.map(normalizeUom).filter(Boolean);
  return [...new Set([...current, ...defaultUoms])].sort((left, right) => left.localeCompare(right));
}
