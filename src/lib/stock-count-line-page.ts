export function stockCountLinePage<T extends { item_id: string; item?: { item_name?: string | null; item_code?: string | null } | null }>(lines: T[], query = "", requestedPage = "1") {
  const term = query.trim().toLocaleLowerCase();
  const matched = lines.map((line, index) => ({ line, index: index + 1 })).filter(({ line, index }) => !term || `${index} ${line.item?.item_code ?? ""} ${line.item?.item_name ?? ""} ${line.item_id}`.toLocaleLowerCase().includes(term));
  const totalPages = Math.max(1, Math.ceil(matched.length / 15));
  const parsed = Number(requestedPage);
  const page = Number.isSafeInteger(parsed) ? Math.min(totalPages, Math.max(1, parsed)) : 1;
  return { rows: matched.slice((page - 1) * 15, page * 15), page, totalPages, totalRows: matched.length };
}
