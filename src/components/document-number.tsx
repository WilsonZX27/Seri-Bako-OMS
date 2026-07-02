import { cn } from "@/lib/utils";

export function DocumentNumber({ value, className }: { value: string; className?: string }) {
  return <span className={cn("font-mono text-xl font-semibold tracking-wide text-foreground", className)}>{value}</span>;
}
