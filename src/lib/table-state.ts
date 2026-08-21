export type PaginationResult<T> = {
  rows: T[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function compareTableValues(a: unknown, b: unknown, direction: string) {
  const normalizedA = typeof a === "number" ? a : String(a ?? "");
  const normalizedB = typeof b === "number" ? b : String(b ?? "");
  const result = typeof normalizedA === "number" && typeof normalizedB === "number"
    ? normalizedA - normalizedB
    : new Intl.Collator("en", { numeric: true, sensitivity: "base" }).compare(String(normalizedA), String(normalizedB));
  return direction === "desc" ? -result : result;
}

export function paginateRows<T>(rows: T[], pageValue?: string, pageSize = 15): PaginationResult<T> {
  const totalRows = rows.length;
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);
  const requestedPage = Number(pageValue ?? 1);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    totalRows,
    page,
    pageSize,
    totalPages,
  };
}

export function hasActiveFilters(params: Record<string, string | undefined>, ignored = ["page", "sort", "dir", "success", "error"]) {
  return Object.entries(params).some(([key, value]) => Boolean(value && value !== "all" && !ignored.includes(key)));
}
