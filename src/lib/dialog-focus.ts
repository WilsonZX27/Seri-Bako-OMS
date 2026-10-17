/** Ignore hidden form state and non-tabbable controls when managing modal focus. */
export function dialogTabStops(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]"))
    .filter((element) => element.tabIndex >= 0
      && !element.matches(":disabled, [type='hidden']")
      && !element.closest("[inert], [hidden], [aria-hidden='true']")
      && element.getClientRects().length > 0
      && getComputedStyle(element).visibility !== "hidden");
}

export function focusDialog(dialog: HTMLElement, preferred?: HTMLElement | null) {
  const stops = dialogTabStops(dialog);
  const initial = preferred && dialog.contains(preferred)
    && !preferred.matches(":disabled, [type='hidden']")
    && !preferred.closest("[inert], [hidden], [aria-hidden='true']")
    && preferred.getClientRects().length > 0
    && getComputedStyle(preferred).visibility !== "hidden"
    ? preferred : stops[0] ?? dialog;
  initial.focus();
}

export function containDialogTab(event: KeyboardEvent, dialog: HTMLElement) {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const stops = dialogTabStops(dialog);
  const first = stops[0];
  const last = stops[stops.length - 1];
  const current = document.activeElement;
  if (!first) {
    event.preventDefault();
    dialog.focus();
  } else if (!stops.includes(current as HTMLElement) || (event.shiftKey ? current === first : current === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}
