import { cn } from "@/lib/utils";

export function DocumentNumber({ value, className, size = "default" }: { value: string; className?: string; size?: "sm" | "default" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 font-mono font-semibold tracking-wide text-slate-900 shadow-sm",
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
