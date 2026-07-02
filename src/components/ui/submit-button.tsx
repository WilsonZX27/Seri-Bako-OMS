"use client";

import { LoaderCircle } from "lucide-react";
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

  return (
    <>
      <Button {...props} disabled={disabled || pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {pending ? pendingLabel : children}
      </Button>
      {showOverlay && pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4 shadow-lg">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">{overlayLabel ?? pendingLabel}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
