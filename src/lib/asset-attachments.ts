export const assetAttachmentLimit = 10 * 1024 * 1024;
export const assetAttachmentTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const assetAttachmentKinds = ["Photo", "Invoice", "Warranty", "Other"] as const;

export function assetAttachmentSignature(type: string, bytes: Uint8Array): boolean {
  const starts = (...expected: number[]) => expected.every((value, index) => bytes[index] === value);
  if (type === "image/jpeg") return starts(255, 216, 255);
  if (type === "image/png") return starts(137, 80, 78, 71, 13, 10, 26, 10);
  if (type === "application/pdf") return starts(37, 80, 68, 70, 45);
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}
