import { cloneElement, isValidElement, useId } from "react";
import { Label } from "@/components/ui/label";
import { InlineFieldError } from "@/components/ui/system-states";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
};

export function Field({ label, children, error, required = false }: FieldProps) {
  const generatedId = useId();
  const child = isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(children)
    ? cloneElement(children, {
        id: children.props.id ?? generatedId,
        "aria-describedby": error ? `${generatedId}-error` : children.props["aria-describedby"],
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={isValidElement<{ id?: string }>(child) ? child.props.id : undefined}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {child}
      <InlineFieldError id={`${generatedId}-error`}>{error}</InlineFieldError>
    </div>
  );
}
