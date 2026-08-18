import { Children, cloneElement, isValidElement, useId } from "react";
import { Label } from "@/components/ui/label";
import { InlineFieldError } from "@/components/ui/system-states";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
};

export function Field({ label, children, error, required = false, className, labelClassName }: FieldProps) {
  const generatedId = useId();
  const visuallyHiddenLabel = labelClassName?.split(/\s+/).includes("sr-only") ?? false;
  const singleChild = Children.count(children) === 1 ? Children.only(children) : null;
  const child = isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(singleChild)
    ? cloneElement(singleChild, {
        id: singleChild.props.id ?? generatedId,
        "aria-describedby": error ? `${generatedId}-error` : singleChild.props["aria-describedby"],
        "aria-invalid": error ? true : singleChild.props["aria-invalid"],
      })
    : children;
  const childId = isValidElement<{ id?: string }>(child) ? child.props.id : undefined;

  return (
    <div className={cn("min-w-0", visuallyHiddenLabel ? "space-y-0" : "space-y-1.5", className)}>
      <Label className={labelClassName} htmlFor={childId}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {child}
      <InlineFieldError id={`${generatedId}-error`}>{error}</InlineFieldError>
    </div>
  );
}
