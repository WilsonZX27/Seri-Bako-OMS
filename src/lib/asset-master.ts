export const assetMasterFields = [
  { key: "Department / Area", label: "Department / area", type: "text", group: "General" },
  { key: "Category", label: "Category", type: "text", group: "General" },
  { key: "Subcategory", label: "Subcategory", type: "text", group: "General" },
  { key: "Responsible Person", label: "Responsible person", type: "text", group: "General" },
  { key: "Brand", label: "Brand", type: "text", group: "General" },
  { key: "Model", label: "Model", type: "text", group: "General" },
  { key: "Serial Number", label: "Serial number", type: "text", group: "General" },
  { key: "Purchase Date", label: "Purchase date", type: "date", group: "Purchase & warranty" },
  { key: "Purchase Price", label: "Purchase price (RM)", type: "number", group: "Purchase & warranty" },
  { key: "Supplier Name", label: "Supplier", type: "text", group: "Purchase & warranty" },
  { key: "Supplier Contact", label: "Supplier contact", type: "text", group: "Purchase & warranty" },
  { key: "Invoice No", label: "Invoice number", type: "text", group: "Purchase & warranty" },
  { key: "Warranty Start Date", label: "Warranty starts", type: "date", group: "Purchase & warranty" },
  { key: "Warranty End Date", label: "Warranty ends", type: "date", group: "Purchase & warranty" },
] as const;

export function assetMasterValues(source: Record<string, unknown>, current: Record<string, unknown>) {
  const values: Record<string, string> = {};
  for (const field of assetMasterFields) {
    const value = current[field.key] ?? source[field.key];
    values[field.key] = value == null ? "" : field.type === "date" ? String(value).slice(0, 10) : String(value);
  }
  return values;
}

export function assetMasterHistoryChanges(source: Record<string, unknown>, history: Record<string, unknown>) {
  const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const changes: { label: string; before: string | null; after: string }[] = [];
  if (history.Operation === "create") {
    changes.push({ label: "Asset ID", before: null, after: String(history.Code ?? "") }, { label: "Item name", before: null, after: String(history.Name ?? "") }, { label: "Initial physical quantity", before: null, after: history.Quantity == null ? "Unknown" : String(history.Quantity) });
    if (history["Location Name"]) changes.push({ label: "Initial location", before: null, after: String(history["Location Name"]) });
    const details = assetMasterValues({}, record(history.Details));
    for (const field of assetMasterFields) if (details[field.key]) changes.push({ label: field.label, before: null, after: details[field.key] });
  } else if (history.Operation === "update") {
    const beforeName = String(history["Name Before"] ?? ""), afterName = String(history["Name After"] ?? "");
    if (beforeName !== afterName) changes.push({ label: "Item name", before: beforeName, after: afterName });
    // Earlier records retain sparse overrides. Imported source fields are
    // immutable after activation, so compare the effective displayed values.
    const before = assetMasterValues(source, record(history["Details Before"])), after = assetMasterValues(source, record(history["Details After"]));
    for (const field of assetMasterFields) if (before[field.key] !== after[field.key]) changes.push({ label: field.label, before: before[field.key], after: after[field.key] });
  }
  return changes;
}
