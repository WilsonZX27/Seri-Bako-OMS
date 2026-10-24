/** Resolve the visible house control for a native validation proxy in the same row. */
export function visibleFieldControl(field: HTMLElement): HTMLElement {
  const adjacent = field.previousElementSibling;
  return field.getAttribute("aria-hidden") === "true" && adjacent instanceof HTMLElement && adjacent.matches("[data-select-control]") ? adjacent : field;
}

/** Shared recovery for native constraints and server-returned field errors. */
export function recoverField(target: HTMLElement, message: string) {
  const oldInvalid = target.getAttribute("aria-invalid");
  const oldDescription = target.getAttribute("aria-describedby");
  const surface = target.closest<HTMLElement>(".unified-list-date-control") ?? target;
  const instruction = document.createElement("p");
  instruction.id = `field-recovery-${crypto.randomUUID()}`;
  instruction.dataset.fieldRecoveryMessage = "true";
  instruction.textContent = message;
  instruction.setAttribute("role", "alert");
  surface.after(instruction);
  surface.dataset.fieldRecovery = "true";
  target.dataset.fieldRecovery = "true";
  target.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-describedby", [oldDescription, instruction.id].filter(Boolean).join(" "));
  target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  target.focus({ preventScroll: true });
  return () => {
    instruction.remove();
    delete target.dataset.fieldRecovery;
    delete surface.dataset.fieldRecovery;
    if (oldInvalid === null) target.removeAttribute("aria-invalid"); else target.setAttribute("aria-invalid", oldInvalid);
    if (oldDescription === null) target.removeAttribute("aria-describedby"); else target.setAttribute("aria-describedby", oldDescription);
  };
}
