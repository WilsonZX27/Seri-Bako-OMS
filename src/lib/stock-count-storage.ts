// Resolve window.localStorage inside the callback: accessing the storage
// property itself can throw when a browser blocks persistent storage.
export function tryStockCountStorage<T>(operation: () => T): { ok: true; value: T } | { ok: false; value?: undefined } {
  try {
    return { ok: true, value: operation() };
  } catch {
    return { ok: false };
  }
}
