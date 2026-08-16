export type ResolvedPurchaseRequestLineInput = {
  item_id: string;
  qty: string;
  uom: string;
  estimated_unit_cost: string | number;
  suggested_supplier_id: string | null;
  reason: string;
  remarks: string;
  branch_id: string;
};

export type UnresolvedPurchaseRequestLineInput = {
  requested_description: string;
  requested_qty: string;
  requested_uom: string;
  remarks: string;
};

export function extractPurchaseRequestLineInputs(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const descriptions = formData.getAll("line_description").map((value) => String(value).trim());
  const qtys = formData.getAll("line_qty").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const costs = formData.getAll("line_estimated_unit_cost").map(String);
  const suppliers = formData.getAll("line_suggested_supplier_id").map(String);
  const reasons = formData.getAll("line_reason").map(String);
  const remarks = formData.getAll("line_remarks").map(String);
  const submittedBranches = formData.getAll("line_branch_id").map(String);
  const lineCount = Math.max(
    itemIds.length,
    descriptions.length,
    qtys.length,
    uoms.length,
    costs.length,
    suppliers.length,
    reasons.length,
    remarks.length,
    submittedBranches.length,
  );
  const enteredLineIndexes = Array.from({ length: lineCount }, (_, index) => index)
    .filter((index) => Boolean(descriptions[index] || itemIds[index] || String(qtys[index] ?? "").trim() || String(uoms[index] ?? "").trim()));

  if (!enteredLineIndexes.length) throw new Error("Add at least one item before creating this purchase request.");

  const incompleteLineIndexes = enteredLineIndexes.filter((index) =>
    !descriptions[index] || !String(qtys[index] ?? "").trim() || !String(uoms[index] ?? "").trim(),
  );
  if (incompleteLineIndexes.length) {
    throw new Error(`Nothing was saved. Complete purchase request line${incompleteLineIndexes.length === 1 ? "" : "s"} ${incompleteLineIndexes.map((index) => index + 1).join(", ")}; entered text is never discarded.`);
  }

  const lines: ResolvedPurchaseRequestLineInput[] = enteredLineIndexes
    .filter((index) => Boolean(itemIds[index]))
    .map((index) => ({
      item_id: itemIds[index],
      qty: qtys[index],
      uom: uoms[index],
      estimated_unit_cost: costs[index] ?? 0,
      suggested_supplier_id: suppliers[index] || null,
      reason: reasons[index] ?? "",
      remarks: remarks[index] ?? "",
      branch_id: submittedBranches[index] ?? "",
    }));
  const unresolvedLines: UnresolvedPurchaseRequestLineInput[] = enteredLineIndexes
    .filter((index) => !itemIds[index])
    .map((index) => ({
      requested_description: descriptions[index],
      requested_qty: qtys[index],
      requested_uom: uoms[index],
      remarks: remarks[index] ?? "",
    }));

  const duplicateItemIds = lines.filter((line, index) =>
    lines.findIndex((candidate) => candidate.item_id === line.item_id) !== index,
  );
  if (duplicateItemIds.length) throw new Error("Each item can appear only once in a purchase request.");

  return { lines, unresolvedLines, lineBranchIds: lines.map((line) => line.branch_id) };
}
