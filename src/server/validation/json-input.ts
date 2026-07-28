/**
 * Parses JSON form fields defensively before a server action passes them to a
 * validation schema or database RPC. FormData may contain a File, an empty
 * string, malformed JSON, or an intentionally oversized payload.
 */
export function parseBoundedJson(value: FormDataEntryValue | null, fieldLabel: string, maxCharacters = 100_000): unknown {
  if (typeof value !== "string" || !value.length || value.length > maxCharacters) {
    throw new Error(`The ${fieldLabel} payload is invalid.`);
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`The ${fieldLabel} payload is invalid.`);
  }
}
