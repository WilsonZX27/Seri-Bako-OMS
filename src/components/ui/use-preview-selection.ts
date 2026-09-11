"use client";

import { useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";

export function usePreviewSelection<Value>() {
  const [hydrated, setHydrated] = useState(false);
  const [activeValue, setActiveValue] = useState<Value | null>(null);
  const committedSelectionRef = useRef(false);

  useEffect(() => setHydrated(true), []);

  const previewValue = (value: Value) => {
    committedSelectionRef.current = false;
    setActiveValue(value);
  };

  const commitValue = (value: Value) => {
    committedSelectionRef.current = true;
    setActiveValue(value);
  };

  const clearSelection = () => {
    committedSelectionRef.current = false;
    setActiveValue(null);
  };

  const optionProps = (value: Value) => ({
    onMouseEnter: () => previewValue(value),
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") previewValue(value);
      else commitValue(value);
    },
    onFocus: () => commitValue(value),
    onClick: () => commitValue(value),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        clearSelection();
        event.currentTarget.blur();
      }
    },
  });

  const boundaryProps = {
    onMouseLeave: (event: MouseEvent<HTMLElement>) => {
      if (!committedSelectionRef.current && !event.currentTarget.matches(":focus-within")) setActiveValue(null);
    },
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget) && !committedSelectionRef.current) setActiveValue(null);
    },
  };

  return { hydrated, activeValue, previewValue, commitValue, clearSelection, optionProps, boundaryProps };
}
