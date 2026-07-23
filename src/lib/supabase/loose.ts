type LooseError = { message: string } | null;

export type LooseQueryResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  data: T[] | null;
  error: LooseError;
  count?: number | null;
};

export type LooseSingleResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  data: T;
  error: LooseError;
};

export type LooseMaybeSingleResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  data: T | null;
  error: LooseError;
};

export type LooseQuery<T extends Record<string, unknown> = Record<string, unknown>> = PromiseLike<LooseQueryResult<T>> & {
  select: (columns?: string, options?: Record<string, unknown>) => LooseQuery<T>;
  insert: (values: unknown) => LooseQuery<T>;
  update: (values: unknown) => LooseQuery<T>;
  eq: (column: string, value: unknown) => LooseQuery<T>;
  in: (column: string, values: unknown[]) => LooseQuery<T>;
  is: (column: string, value: unknown) => LooseQuery<T>;
  lt: (column: string, value: unknown) => LooseQuery<T>;
  lte: (column: string, value: unknown) => LooseQuery<T>;
  gt: (column: string, value: unknown) => LooseQuery<T>;
  or: (filters: string) => LooseQuery<T>;
  order: (column: string, options?: Record<string, unknown>) => LooseQuery<T>;
  limit: (count: number) => LooseQuery<T>;
  range: (from: number, to: number) => LooseQuery<T>;
  single: () => Promise<LooseSingleResult<T>>;
  maybeSingle: () => Promise<LooseMaybeSingleResult<T>>;
};

export type LooseSupabase = {
  from: <T extends Record<string, unknown> = Record<string, unknown>>(table: string) => LooseQuery<T>;
};

export function looseSupabase(client: unknown) {
  return client as LooseSupabase;
}
