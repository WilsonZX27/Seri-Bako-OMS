/** Persisted business number first; legacy references and UUID links remain intact. */
export function assetTransferNumber(record: {document_no?: string | null; source_id?: string | null; id: string}) {
  return record.document_no || record.source_id || record.id;
}
