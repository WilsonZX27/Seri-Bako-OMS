import { createAdminClient } from "@/lib/supabase/admin";

const imageTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function uploadMasterDataImage(entity: "items" | "products", id: string, value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > 2 * 1024 * 1024) throw new Error("Image must be 2MB or smaller.");
  const extension = imageTypes[value.type];
  if (!extension) throw new Error("Image must be a PNG, JPG, or WEBP file.");

  const supabase = createAdminClient();
  const path = `${entity}/${id}/image.${extension}`;
  const { error } = await supabase.storage
    .from("company-assets")
    .upload(path, value, { contentType: value.type, upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from("company-assets").getPublicUrl(path).data.publicUrl;
}
