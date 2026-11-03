const UUID_REFERENCE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Display persisted numbers or readable legacy references; route IDs remain unchanged. */
export function assetTransferNumber(record: {document_no?: string | null; source_id?: string | null; id: string}) {
  const number = record.document_no?.trim();
  if (number) return number;
  const reference = record.source_id?.trim();
  return reference && !UUID_REFERENCE.test(reference) ? reference : "Unnumbered";
}
