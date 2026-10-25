"use client";
import { useEffect, useState } from "react";
export function useAssetTransferActionSlots() {
  const [slots, setSlots] = useState<HTMLElement[]>([]);
  useEffect(() => {
    const sync = () => {
      const next = Array.from(document.querySelectorAll<HTMLElement>("[data-transfer-request-slot]"));
      setSlots(previous => previous.length === next.length && previous.every((slot, index) => slot === next[index]) ? previous : next);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return slots;
}
