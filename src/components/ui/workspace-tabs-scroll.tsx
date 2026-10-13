"use client";

import { useEffect, useRef } from "react";

/** Keep the selected tab visible without moving the page or taking focus. */
export function WorkspaceTabsScroll({ current }: { current: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const nav = marker.current?.parentElement;
    if (!nav) return;
    const reveal = () => {
      const selected = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!selected) return;
      const bounds = nav.getBoundingClientRect();
      const tab = selected.getBoundingClientRect();
      if (tab.left < bounds.left) nav.scrollLeft -= bounds.left - tab.left;
      else if (tab.right > bounds.right) nav.scrollLeft += tab.right - bounds.right;
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [current]);
  return <span ref={marker} hidden aria-hidden="true" />;
}
