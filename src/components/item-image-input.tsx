"use client";

import { useEffect, useState } from "react";
import { ItemThumbnail } from "@/components/ui/item-thumbnail";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function ItemImageInput({ currentUrl, name }: { currentUrl?: string | null; name: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const src = preview ?? (removed ? null : currentUrl);
  return <div className="grid gap-2">
    <ItemThumbnail src={src} alt={name} className="!h-36 !w-full rounded-[var(--sb-control-radius)] object-contain" />
    <div className="grid min-w-0 gap-2"><Input key={inputKey} name="item_image" aria-label="Item image" type="file" accept="image/png,image/jpeg,image/webp" className="text-xs file:mr-2 file:rounded-[var(--sb-radius-control)] file:border-0 file:bg-[var(--sb-green-100)] file:px-3 file:text-[var(--sb-green-900)]" onChange={event => { setFile(event.target.files?.[0] ?? null); }} />
      <input type="hidden" name="remove_item_image" value={removed ? "true" : "false"} />
      {src ? <Button type="button" size="sm" variant="outline" className="justify-self-start" onClick={() => { setRemoved(true); setFile(null); setInputKey(key => key + 1); }}><X className="h-3.5 w-3.5" />Remove image</Button> : null}
    </div>
  </div>;
}
