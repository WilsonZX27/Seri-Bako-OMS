import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function ItemThumbnail({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (src) {
    // The URL is written only by the validated item-image upload path.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={40} height={40} loading="lazy" decoding="async" className={cn("h-10 w-10 shrink-0 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] object-cover", className)} />;
  }
  return <span aria-hidden="true" className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] text-[var(--sb-text-soft)]", className)}><Package className="h-4 w-4" /></span>;
}
