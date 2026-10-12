"use client";

import { forwardRef, useSyncExternalStore } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Keep native focus and dismissal behavior outside responsive hidden panels.
export const NativeDialog = forwardRef<HTMLDialogElement, ComponentPropsWithoutRef<"dialog">>(
  function NativeDialog(props, ref) {
    const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
    return mounted ? createPortal(<dialog {...props} ref={ref} />, document.body) : null;
  },
);
