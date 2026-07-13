import { cn } from "@/lib/utils";

export function DocumentNumber({ value, className, size = "default" }: { value: string; className?: string; size?: "sm" | "default" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border border-[var(--sb-border)] bg-white px-2 py-1 font-mono font-semibold tracking-wide text-[var(--sb-text)]",
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
