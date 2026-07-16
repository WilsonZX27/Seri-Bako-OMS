import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getDocumentAttachmentPaths(db: SupabaseClient, documentId: string) {
  const { data, error } = await db.from("attachments").select("storage_path").eq("entity_type", "document").eq("entity_id", documentId);
  if (error) return { paths: [] as string[], error: error.message };
  return { paths: (data ?? []).flatMap((row) => row.storage_path ? [row.storage_path] : []), error: null };
}

export async function removeDocumentAttachmentPaths(db: SupabaseClient, paths: string[]) {
  const failures: string[] = [];
  for (const path of paths) {
    const result = await db.storage.from("document-attachments").remove([path]);
    if (result.error) failures.push(`${path}: ${result.error.message}`);
  }
  return failures;
}
