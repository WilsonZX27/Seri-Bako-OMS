"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Reserve the measured footer height, including wrapped help and safe-area padding. */
export function MobileActionReserve({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(96);
  useEffect(() => {
    const bar = root.current?.querySelector<HTMLElement>("[data-mobile-document-action]");
    if (!bar) return;
    const measure = () => setHeight(bar.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className="md:hidden"><div aria-hidden="true" style={{ height: height + 24 }} />{children}</div>;
}
