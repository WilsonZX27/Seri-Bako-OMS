"use client";

import { LoaderCircle } from "lucide-react";
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

  useEffect(() => {
    const markSubmitted = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (formId ? form?.id === formId : form === buttonRef.current?.form) {
        setSubmitted(event.submitter === buttonRef.current);
      }
    };
    document.addEventListener("submit", markSubmitted, true);
    return () => document.removeEventListener("submit", markSubmitted, true);
  }, [formId]);

  useEffect(() => {
    if (pending) sawPending.current = true;
    else if (sawPending.current) {
      sawPending.current = false;
      setSubmitted(false);
    }
  }, [pending]);

  const isPending = submitted && (formId ? true : pending);

  return (
    <>
      <Button ref={buttonRef} type="submit" {...props} disabled={disabled || isPending} aria-busy={isPending}>
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isPending ? pendingLabel : children}
      </Button>
      {showOverlay && isPending ? (
        <div className="sb-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="sb-popover-surface flex items-center gap-3 px-5 py-4">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">{overlayLabel ?? pendingLabel}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
