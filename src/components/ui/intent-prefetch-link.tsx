"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ComponentProps } from "react";

/** Warm only the destination the operator points to or focuses. Keep Next's
 * automatic viewport prefetch off, so a record input page does not eagerly run
 * every report. Route cache invalidation remains owned by the write actions. */
export function IntentPrefetchLink({ onMouseEnter, onFocus, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const warmed = useRef(new Set<string>());
  const warm = () => {
    if (typeof props.href !== "string" || !props.href.startsWith("/") || props["aria-current"] === "page" || warmed.current.has(props.href)) return;
    warmed.current.add(props.href);
    router.prefetch(props.href);
  };
  return <Link {...props} prefetch={false} onMouseEnter={event => { onMouseEnter?.(event); warm(); }} onFocus={event => { onFocus?.(event); warm(); }} />;
}
