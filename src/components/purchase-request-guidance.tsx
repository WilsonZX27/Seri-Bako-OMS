"use client";

import { useEffect, useSyncExternalStore } from "react";

// The desktop console renders outside the page subtree, so React context from
// the form page cannot reach it. This client-only subscription bridges both views.
const initialMessage = "Review the branch, supplier and request items before submitting.";
let message = initialMessage;
const listeners = new Set<() => void>();
function publish(value: string) {
  message = value;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function PurchaseRequestGuidance() {
  const value = useSyncExternalStore(subscribe, () => message, () => initialMessage);
  return <p className="text-xs text-muted-foreground" role="status">{value}</p>;
}

export function usePurchaseRequestGuidance(value: string) {
  useEffect(() => { publish(value); }, [value]);
  useEffect(() => () => publish(initialMessage), []);
}
