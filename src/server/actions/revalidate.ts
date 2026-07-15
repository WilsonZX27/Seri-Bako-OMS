import { revalidatePath } from "next/cache";

export function revalidateWorkspaceState(paths: string[] = []) {
  for (const path of new Set(paths)) {
    revalidatePath(path);
  }
}
