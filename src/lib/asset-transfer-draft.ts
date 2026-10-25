export type TransferAssetChoice = { id: string; asset_code: string; item_name: string; holdings: Record<string, number> };
export type AssetTransferDraft = { from: string; to: string; date: string; reason: string; query: string; selected: Record<string, string> };
export function toggleTransferAsset(selected: Record<string, string>, id: string) {
  const next = { ...selected };
  if (Object.hasOwn(next, id)) delete next[id];
  else if (Object.keys(next).length < 100) next[id] = "1";
  return next;
}
export function transferDraftError(draft: AssetTransferDraft, choices: TransferAssetChoice[], locations: { id: string }[]) {
  if (!locations.some(location => location.id === draft.from)) return "Choose a source location.";
  if (!locations.some(location => location.id === draft.to)) return "Choose a destination location.";
  if (draft.from === draft.to) return "Choose different source and destination locations.";
  const parsed = new Date(`${draft.date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== draft.date) return "Choose a valid request date.";
  if (!draft.reason.trim() || draft.reason.trim().length > 2000) return "Enter a transfer reason within 2,000 characters.";
  const lines = Object.entries(draft.selected);
  if (!lines.length || lines.length > 100) return "Choose between 1 and 100 assets.";
  for (const [id, raw] of lines) {
    const choice = choices.find(item => item.id === id), available = choice?.holdings[draft.from];
    if (!choice || available === undefined) return "A selected asset is unavailable at this source. Change the source or remove the line.";
    const quantity = raw.trim() ? Number(raw) : NaN;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647 || quantity > available) return `Enter a positive whole quantity up to ${available} for ${choice.asset_code}.`;
  }
  return "";
}
export function validTransferDraft(value: unknown): value is AssetTransferDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as AssetTransferDraft;
  if (![row.from, row.to, row.date, row.reason, row.query].every(item => typeof item === "string" && item.length <= 4000) || !row.selected || typeof row.selected !== "object" || Array.isArray(row.selected)) return false;
  return Object.keys(row.selected).length <= 100 && Object.entries(row.selected).every(([id, quantity]) => /^[0-9a-f-]{36}$/i.test(id) && typeof quantity === "string" && quantity.length <= 32);
}
