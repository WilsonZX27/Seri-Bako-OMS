"use client";

import { useSyncExternalStore, type FieldsetHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const desktopQuery = "(min-width: 1280px)";
function subscribe(callback: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function desktopSnapshot() { return window.matchMedia(desktopQuery).matches; }
function serverSnapshot() { return false; }

/** Hidden responsive inputs must not participate in native form validation. */
export function ResponsiveFormFields({ mode, disabled, className, ...props }: FieldsetHTMLAttributes<HTMLFieldSetElement> & { mode: "desktop" | "compact" }) {
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  return <fieldset {...props} disabled={disabled || (mode === "desktop" ? !desktop : desktop)} data-responsive-form-fields={mode} className={cn("min-w-0", mode === "desktop" ? "hidden xl:block" : "xl:hidden", className)} />;
}
