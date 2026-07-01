import { Label } from "@/components/ui/label";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  error?: string;
};

export function Field({ label, children, error }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
