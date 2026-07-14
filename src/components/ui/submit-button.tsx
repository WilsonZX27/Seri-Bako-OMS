"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
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
  const formId = typeof props.form === "string" ? props.form : null;

  useEffect(() => {
    if (!formId) return;
    const markSubmitted = (event: SubmitEvent) => {
      if ((event.target as HTMLFormElement | null)?.id === formId) setSubmitted(true);
    };
    document.addEventListener("submit", markSubmitted, true);
    return () => document.removeEventListener("submit", markSubmitted, true);
  }, [formId]);

  const isPending = pending || submitted;

  return (
    <>
      <Button {...props} disabled={disabled || isPending} aria-busy={isPending}>
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isPending ? pendingLabel : children}
      </Button>
      {showOverlay && isPending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-[2px] border bg-card px-5 py-4 shadow-sm">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">{overlayLabel ?? pendingLabel}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
