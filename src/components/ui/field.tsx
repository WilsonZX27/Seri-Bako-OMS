import { Label } from "@/components/ui/label";
import { InlineFieldError } from "@/components/ui/system-states";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
};

export function Field({ label, children, error, required = false }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      <InlineFieldError>{error}</InlineFieldError>
    </div>
  );
}
