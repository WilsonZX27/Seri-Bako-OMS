import { cn } from "@/lib/utils";

export function DocumentNumber({ value, className, size = "default" }: { value: string; className?: string; size?: "sm" | "default" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-semibold tracking-tight text-[var(--sb-text)]",
        size === "sm" ? "text-xs" : "",
        size === "default" ? "text-sm" : "",
        size === "lg" ? "text-lg" : "",
        className,
      )}
    >
      {value}
    </span>
  );
}
