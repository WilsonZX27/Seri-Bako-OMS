type DraftLine = { itemId: string; itemSearch: string; qty: string; uom: string; supplierId: string; cost: string; remarks: string; reason: string };
type Draft = { branchId: string; supplierId: string; priority: string; neededByDate: string; remarks: string; lines: DraftLine[] };

export function purchaseRequestDraftSignature(draft: Draft) {
  const number = (value: string) => value.trim() && Number.isFinite(Number(value)) ? String(Number(value)) : value.trim();
  return JSON.stringify({
    branchId: draft.branchId, priority: draft.priority, neededByDate: draft.neededByDate,
    remarks: draft.remarks.trim(),
    // Database reads need not preserve insertion order; row keys and catalogue labels are not saved values.
    lines: draft.lines.filter(line => line.itemId || line.itemSearch.trim() || line.qty.trim() || line.uom.trim()).map(line => JSON.stringify({
      itemId: line.itemId,
      description: line.itemId ? "" : line.itemSearch.trim(),
      qty: number(line.qty), uom: line.uom.trim(), supplierId: line.itemId ? line.supplierId : "",
      cost: line.itemId ? number(line.cost) : "", remarks: line.remarks.trim(), reason: line.itemId ? line.reason.trim() : "",
    })).sort(),
  });
}

export function purchaseRequestSubmitBlock(editor: HTMLFormElement | null, requestId: string) {
  if (!editor || editor.dataset.prRequestId !== requestId) return "Request editor unavailable. Reload before submitting.";
  if (editor.dataset.prOperation) return "Wait for the current request action to finish.";
  if (editor.dataset.prSaveFailed === "true") return "The last save was not confirmed. Save successfully or reload before submitting.";
  if (editor.dataset.prDirty !== "false") return "Save request changes before submitting.";
  return "";
}
