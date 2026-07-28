import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const imageTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function hasExpectedImageSignature(file: File, type: keyof typeof imageTypes) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (type === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function uploadMasterDataImage(entity: "items" | "products", id: string, value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > 2 * 1024 * 1024) throw new Error("Image must be 2MB or smaller.");
  const extension = imageTypes[value.type];
  if (!extension) throw new Error("Image must be a PNG, JPG, or WEBP file.");
  if (!(await hasExpectedImageSignature(value, value.type as keyof typeof imageTypes))) {
    throw new Error("Image content does not match its file type.");
  }

  const recordId = z.string().uuid("The image record identifier is invalid.").parse(id);
  const supabase = createAdminClient();
  const path = `${entity}/${recordId}/image.${extension}`;
  const { error } = await supabase.storage
    .from("company-assets")
    .upload(path, value, { contentType: value.type, upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from("company-assets").getPublicUrl(path).data.publicUrl;
}
