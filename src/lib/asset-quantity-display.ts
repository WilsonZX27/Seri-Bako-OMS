import { formatNumber } from "@/lib/utils";

/** Registered holdings are distinct from optional counts in inspection history. */
export function formatRegisteredAssetQuantity(value: number | null): string {
  return value === null ? "Not recorded" : formatNumber(value);
}
