const prefix = "oms:asset-draft:v1:";
const lifetime = 4 * 60 * 60 * 1000;
export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
export type AssetChecklistDraft = { fields: Record<string, string>; checkDate: string; selected: string[] };
export function isAssetChecklistDraft(value: unknown, assetIds: readonly string[], today: string): value is AssetChecklistDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as AssetChecklistDraft;
  if (typeof row.checkDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.checkDate) || row.checkDate > today) return false;
  const date = new Date(`${row.checkDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.checkDate) return false;
  const ids = new Set(assetIds);
  if (!Array.isArray(row.selected) || new Set(row.selected).size !== row.selected.length || row.selected.some(id => typeof id !== "string" || !ids.has(id))) return false;
  if (!row.fields || typeof row.fields !== "object" || Array.isArray(row.fields)) return false;
  return Object.entries(row.fields).every(([key, text]) => {
    if (typeof text !== "string" || text.length > 4000) return false;
    const separator = key.indexOf("_"), kind = key.slice(0, separator), id = key.slice(separator + 1);
    if (!ids.has(id)) return false;
    if (kind === "remark") return true;
    if (kind === "result") return ["Checked", "Damaged", "Missing", "Needs Maintenance", "Other"].includes(text);
    return kind === "quantity" && (!text || (Number.isSafeInteger(Number(text)) && Number(text) >= 0));
  });
}
export function assetDraftKey(scope: string, form: string) { return `${prefix}${encodeURIComponent(scope)}:${encodeURIComponent(form)}`; }
export function readAssetDraft<T>(storage: DraftStorage, scope: string, form: string, revision: string, valid: (value: unknown) => value is T, now = Date.now()): T | undefined {
  const key = assetDraftKey(scope, form);
  try {
    const raw = storage.getItem(key);
    if (!raw) return undefined;
    if (raw.length > 250000) throw new Error("Oversized draft");
    const draft = JSON.parse(raw);
    if (draft.version !== 1 || draft.revision !== revision || !Number.isFinite(draft.expires) || draft.expires <= now || draft.expires > now + lifetime || !valid(draft.value)) throw new Error("Stale draft");
    return draft.value;
  } catch { try { storage.removeItem(key); } catch { /* Storage unavailable. */ } return undefined; }
}
export function writeAssetDraft(storage: DraftStorage, scope: string, form: string, revision: string, value: unknown, now = Date.now()): boolean {
  try {
    const raw = JSON.stringify({ version: 1, revision, expires: now + lifetime, value });
    if (raw.length > 250000) return false;
    storage.setItem(assetDraftKey(scope, form), raw); return true;
  } catch { return false; }
}
export function clearAssetDraft(storage: DraftStorage, scope: string, form: string) { try { storage.removeItem(assetDraftKey(scope, form)); } catch { /* Preserve normal form operation. */ } }
export function clearAssetRouteDrafts(storage: DraftStorage, scope: string, pathname: string) {
  try {
    const routePrefix = `${prefix}${encodeURIComponent(scope)}:${encodeURIComponent(`${pathname}:`)}`;
    for (let index = storage.length - 1; index >= 0; index--) { const key = storage.key(index); if (key?.startsWith(routePrefix)) storage.removeItem(key); }
  } catch { /* Storage unavailable. */ }
}
export function isolateAssetDrafts(storage: DraftStorage, scope: string, now = Date.now()) {
  try {
    const own = `${prefix}${encodeURIComponent(scope)}:`;
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      let keep = key.startsWith(own);
      try { const draft = JSON.parse(storage.getItem(key) ?? "null"); keep &&= draft?.version === 1 && Number.isFinite(draft.expires) && draft.expires > now && draft.expires <= now + lifetime; } catch { keep = false; }
      if (!keep) storage.removeItem(key);
    }
  } catch { /* Disabled browser storage must not prevent using the module. */ }
}
