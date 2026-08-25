import { notFound } from "next/navigation";

export class DetailNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} is not available.`);
    this.name = "DetailNotFoundError";
  }
}

export function requireDetailRow<T>(row: T | null | undefined, entity: string, id: string): T {
  if (row == null) throw new DetailNotFoundError(entity, id);
  return row;
}

export async function detailOrNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof DetailNotFoundError) notFound();
    throw error;
  }
}
