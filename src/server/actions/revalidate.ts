import { revalidatePath } from "next/cache";

export function revalidateWorkspaceState(paths: string[] = []) {
  const commonPaths = [
    "/dashboard",
    "/documents",
    "/purchase-requests",
    "/purchase-orders",
    "/goods-receivings",
  ];

  for (const path of new Set([...commonPaths, ...paths])) {
    revalidatePath(path);
  }
}
