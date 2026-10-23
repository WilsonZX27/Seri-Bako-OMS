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
    const syncExternalPending = (event: Event) => {
      const detail = (event as CustomEvent<{ formId?: string; pending?: boolean }>).detail;
      if (!detail?.formId || detail.formId !== (formId ?? buttonRef.current?.form?.id)) return;
      if (detail.pending) {
        sawPending.current = true;
        setSubmitted(true);
      } else if (sawPending.current) {
        sawPending.current = false;
        setSubmitted(false);
      }
    };
    document.addEventListener("submit", markSubmitted, true);
    document.addEventListener("sb:form-pending", syncExternalPending);
    return () => {
      document.removeEventListener("submit", markSubmitted, true);
      document.removeEventListener("sb:form-pending", syncExternalPending);
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

/** Place inside a form when its submit control lives outside the form tree. */
export function FormPendingBridge({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    document.dispatchEvent(new CustomEvent("sb:form-pending", { detail: { formId, pending } }));
    // A conditional form can disappear before React reports pending=false.
    // Release only this form's external UI; this says nothing about save outcome
    // and never retries or confirms the underlying action.
    return () => {
      if (pending) document.dispatchEvent(new CustomEvent("sb:form-pending", { detail: { formId, pending: false } }));
    };
  }, [formId, pending]);
  return null;
}
