type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count: number | null;
};

/** Read a bounded result completely, even when PostgREST caps each response. */
export async function readCompletePages<T>(
  readPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  maximumRows = 100_000,
): Promise<T[]> {
  const rows: T[] = [];
  let expected: number | undefined;
  while (true) {
    const result = await readPage(rows.length, rows.length + 499);
    if (result.error) throw new Error(result.error.message);
    if (!result.data || result.count === null) throw new Error("Complete result count could not be verified.");
    if (result.count > maximumRows) throw new Error("Too many rows. Choose a shorter date range.");
    if (expected !== undefined && result.count !== expected) throw new Error("Records changed during the read. Please retry.");
    expected = result.count;
    rows.push(...result.data);
    if (rows.length === expected) return rows;
    if (!result.data.length || rows.length > expected) throw new Error("Incomplete result. Please retry.");
  }
}
