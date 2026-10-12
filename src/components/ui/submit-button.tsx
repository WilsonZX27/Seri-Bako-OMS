"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = ButtonProps & {
  pendingLabel?: string;
  overlayLabel?: string;
  showOverlay?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  overlayLabel,
  showOverlay = false,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const [submitted, setSubmitted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sawPending = useRef(false);
  const formId = typeof props.form === "string" ? props.form : null;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    const markSubmitted = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (formId ? form?.id === formId : form === buttonRef.current?.form) {
        setSubmitted(event.submitter === buttonRef.current);
      }
    };
    const markSettled = (event: Event) => {
      const targetId = (event as CustomEvent<{ formId?: string }>).detail?.formId;
      if (targetId && targetId === (formId ?? buttonRef.current?.form?.id)) setSubmitted(false);
    };
    document.addEventListener("submit", markSubmitted, true);
    document.addEventListener("sb:form-settled", markSettled);
    return () => {
      document.removeEventListener("submit", markSubmitted, true);
      document.removeEventListener("sb:form-settled", markSettled);
    };
  }, [formId]);

  useEffect(() => {
    if (pending) sawPending.current = true;
    else if (sawPending.current) {
      sawPending.current = false;
      setSubmitted(false);
    }
  }, [pending]);

  useEffect(() => {
    setSubmitted(false);
  }, [locationKey]);

  useEffect(() => {
    if (!submitted || !formId) return;
    const form = document.getElementById(formId);
    const observationRoot = form?.parentElement ?? form;
    let settled = false;
    let observer: MutationObserver | null = null;
    const release = () => {
      if (settled) return;
      settled = true;
      setSubmitted(false);
    };
    const beginObserving = window.setTimeout(() => {
      if (!observationRoot || settled) return;
      observer = new MutationObserver((records) => {
        if (records.some((record) => record.type === "childList" || record.type === "characterData")) {
          window.setTimeout(release, 120);
        }
      });
      observer.observe(observationRoot, { childList: true, subtree: true, characterData: true });
    }, 250);
    form?.addEventListener("reset", release);
    window.addEventListener("pageshow", release);
    window.addEventListener("popstate", release);
    const timeout = window.setTimeout(release, 30000);
    return () => {
      observer?.disconnect();
      window.clearTimeout(beginObserving);
      form?.removeEventListener("reset", release);
      window.removeEventListener("pageshow", release);
      window.removeEventListener("popstate", release);
      window.clearTimeout(timeout);
    };
  }, [submitted, formId]);

  const isPending = submitted && (formId ? true : pending);

  return (
    <>
      <Button ref={buttonRef} type="submit" {...props} disabled={disabled || isPending} aria-busy={isPending}>
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isPending ? pendingLabel : children}
      </Button>
      {showOverlay && isPending ? (
        <div className="sb-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center" aria-busy="true">
          <div className="sb-popover-surface flex items-center gap-3 px-5 py-4" role="status" aria-live="polite" aria-atomic="true">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">{overlayLabel ?? pendingLabel}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
