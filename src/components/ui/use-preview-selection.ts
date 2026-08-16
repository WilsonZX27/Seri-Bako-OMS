"use client";

import { useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";

export function usePreviewSelection<Value>() {
  const [activeValue, setActiveValue] = useState<Value | null>(null);
  const committedSelectionRef = useRef(false);

  const optionProps = (value: Value) => ({
    onMouseEnter: () => {
      committedSelectionRef.current = false;
      setActiveValue(value);
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      committedSelectionRef.current = event.pointerType !== "mouse";
      setActiveValue(value);
    },
    onFocus: () => {
      committedSelectionRef.current = true;
      setActiveValue(value);
    },
    onClick: () => {
      committedSelectionRef.current = true;
      setActiveValue(value);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        committedSelectionRef.current = false;
        setActiveValue(null);
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

  return { activeValue, optionProps, boundaryProps };
}
