/** Release presentation state after explicit form reset or browser navigation.
 * This never confirms, retries, or cancels the underlying business operation.
 */
export function listenForFormPendingRecovery(
  documentTarget: EventTarget,
  windowTarget: EventTarget,
  matchesForm: (target: EventTarget | null) => boolean,
  release: () => void,
) {
  const reset = (event: Event) => { if (matchesForm(event.target)) release(); };
  const navigate = () => release();
  documentTarget.addEventListener("reset", reset, true);
  windowTarget.addEventListener("pageshow", navigate);
  windowTarget.addEventListener("popstate", navigate);
  return () => {
    documentTarget.removeEventListener("reset", reset, true);
    windowTarget.removeEventListener("pageshow", navigate);
    windowTarget.removeEventListener("popstate", navigate);
  };
}
