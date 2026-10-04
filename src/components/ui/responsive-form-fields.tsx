"use client";

import { useSyncExternalStore, type FieldsetHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const desktopQuery = "(min-width: 1280px)";
const tabletQuery = "(min-width: 768px)";
function subscribeTablet(callback: () => void) { const query=window.matchMedia(tabletQuery);query.addEventListener("change",callback);return()=>query.removeEventListener("change",callback); }
function tabletSnapshot(){return window.matchMedia(tabletQuery).matches;}
function subscribe(callback: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function desktopSnapshot() { return window.matchMedia(desktopQuery).matches; }
function serverSnapshot() { return false; }

/** Hidden responsive inputs must not participate in native form validation. */
export function ResponsiveFormFields({ mode, breakpoint="xl", disabled, className, ...props }: FieldsetHTMLAttributes<HTMLFieldSetElement> & { mode: "desktop" | "compact"; breakpoint?: "md" | "xl" }) {
  const desktop = useSyncExternalStore(breakpoint==="md"?subscribeTablet:subscribe, breakpoint==="md"?tabletSnapshot:desktopSnapshot, serverSnapshot);
  return <fieldset {...props} disabled={disabled || (mode === "desktop" ? !desktop : desktop)} data-responsive-form-fields={mode} className={cn("min-w-0", breakpoint==="md" ? (mode === "desktop" ? "hidden md:block" : "md:hidden") : (mode === "desktop" ? "hidden xl:block" : "xl:hidden"), className)} />;
}
