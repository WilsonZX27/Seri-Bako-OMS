/** Persist identity before submission so refresh/unknown-result retries reuse it.
 * Editing a submitted basket retains its key: the database rejects changed
 * content after success. Emptying the basket starts a new intent. */
export function prepareBasketSubmission(form: HTMLFormElement, storageKey: string): boolean {
  try {
    const field = form.elements.namedItem("idempotency_key") as HTMLInputElement | null;
    if (!field) throw new Error("Missing basket request key");
    const keyName = `${storageKey}:submission`;
    const saved = window.localStorage.getItem(keyName);
    const key = saved && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved) ? saved : crypto.randomUUID();
    window.localStorage.setItem(keyName, key);
    if (window.localStorage.getItem(keyName) !== key) throw new Error("Retry key not stored");
    field.value = key;
    return true;
  } catch {
    window.alert("The basket could not save its retry reference. No request was sent. Enable browser storage and retry.");
    return false;
  }
}
