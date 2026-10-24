export type AssetTransferAction = "approve" | "reject" | "dispatch" | "receive";
export function assetTransferActions(status: string, access: { canApprove: boolean; canTransfer: boolean; canAccessSource: boolean; canAccessDestination: boolean }): AssetTransferAction[] {
  if (status === "requested" && access.canApprove && access.canAccessSource) return ["approve", "reject"];
  if (status === "approved" && access.canTransfer && access.canAccessSource) return ["dispatch"];
  if (status === "dispatched" && access.canTransfer && access.canAccessDestination) return ["receive"];
  return [];
}

/** Preserve the picker's GET filters through selection and Change asset. */
export function assetTransferPickerHref(query: { q?: string; page?: number }, assetId?: string) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q.slice(0, 120));
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (assetId) params.set("asset", assetId);
  const search = params.toString();
  return `/asset-management/transfers/new${search ? `?${search}` : ""}`;
}

/** Form payload is validated again by the atomic, scope-checked batch RPC. */
export function assetTransferBatchLines(form: FormData) {
  const ids = form.getAll("asset_id");
  if (!ids.length || ids.length > 100) throw new Error("Choose between 1 and 100 assets.");
  const seen = new Set<string>();
  return ids.map(value => {
    if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Choose a valid asset.");
    const id = value.toLowerCase();
    if (seen.has(id)) throw new Error("Each asset may appear only once.");
    seen.add(id);
    const raw = form.get(`quantity_${value}`);
    const quantity = typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647) throw new Error("Enter a positive whole quantity for each asset.");
    return { asset_id: id, quantity };
  });
}
