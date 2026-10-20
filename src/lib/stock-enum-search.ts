// PostgREST ILIKE cannot operate on PostgreSQL enums. Match known values first,
// then generate equality clauses; user text never becomes an enum operand.
const values = {
  count: ["draft", "submitted", "reviewed", "approved", "posted", "voided", "rejected", "cancelled"],
  operation: ["draft", "submitted", "approved", "in_transit", "posted", "completed", "rejected", "cancelled"],
  reason: ["expired", "damaged", "spoiled", "production_loss", "missing", "staff_meal", "sampling", "supplier_claim", "other"],
};
export function stockEnumSearch(kind: keyof typeof values, search: string) {
  const term = search.trim().toLowerCase().replaceAll(" ", "_");
  if (!term) return "";
  const column = kind === "reason" ? "reason" : "status";
  return values[kind].filter(value => value.includes(term)).map(value => `,${column}.eq.${value}`).join("");
}
