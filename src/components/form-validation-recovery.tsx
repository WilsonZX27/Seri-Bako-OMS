"use client";

import { useEffect } from "react";
import { recoverField, visibleFieldControl } from "@/lib/field-recovery";

/** Capture native validation once for every authenticated form, including portals. */
export function FormValidationRecovery() {
  useEffect(() => {
    let frame = 0;
    let first: { target: HTMLElement; message: string } | null = null;
    let cleanup: (() => void) | undefined;
    const invalid = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) || !field.form) return;
      // Hidden responsive copies and native proxy selects are owned by their visible control.
      const ownControl = visibleFieldControl(field);
      const proxy = ownControl !== field ? ownControl : field.getAttribute("aria-hidden") === "true" ? Array.from(field.form.querySelectorAll<HTMLElement>("[data-field-name]")).find((trigger) => trigger.dataset.fieldName === field.name && trigger.getClientRects().length) : undefined;
      const visibleTarget = proxy ?? field;
      if (!visibleTarget.getClientRects().length || visibleTarget.getAttribute("aria-hidden") === "true") return;
      event.preventDefault();
      if (first) return;
      first = { target: visibleTarget, message: field.validationMessage || "Check this field before saving." };
      frame = requestAnimationFrame(() => {
        cleanup?.();
        const target = first;
        first = null;
        if (target?.target.isConnected) cleanup = recoverField(target.target, target.message);
      });
    };
    const edited = (event: Event) => {
      if (event.target instanceof HTMLElement && visibleFieldControl(event.target).dataset.fieldRecovery) {
        cleanup?.();
        cleanup = undefined;
      }
    };
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", edited);
    document.addEventListener("change", edited);
    return () => {
      cancelAnimationFrame(frame);
      cleanup?.();
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", edited);
      document.removeEventListener("change", edited);
    };
  }, []);
  return null;
}
