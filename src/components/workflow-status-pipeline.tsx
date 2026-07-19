import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = {
  key: string;
  label: string;
  description?: string;
};

export function WorkflowStatusPipeline({ steps, currentStatus, compact = false }: { steps: WorkflowStep[]; currentStatus: string; compact?: boolean }) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === currentStatus));
  const rejected = ["rejected", "cancelled"].includes(currentStatus);

  return (
    <div className={cn("rounded-[2px] border border-[var(--sb-border-soft)] bg-card", compact ? "p-1.5" : "p-2.5")}>
      {!compact ? <p className="text-sm font-semibold">Workflow</p> : null}
      <div className={cn("grid min-w-0 gap-1.5 md:grid-cols-[repeat(auto-fit,minmax(104px,1fr))]", compact ? "" : "mt-2")}>
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          const Icon = done ? CheckCircle2 : active ? CircleDot : Circle;
          const errorStep = rejected && active;
          return (
            <div
              key={step.key}
              className={cn(
                "min-w-0 rounded-[2px] border",
                compact ? "p-1.5" : "p-2",
                done ? "border-[var(--sb-success-bg)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]" : "",
                active && !errorStep ? "border-[var(--sb-amber-700)] bg-white text-[var(--sb-text)]" : "",
                errorStep ? "border-[var(--sb-danger-bg)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" : "",
              )}
              title={step.description}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <p className="min-w-0 truncate text-[11px] font-medium">{step.label}</p>
              </div>
              {step.description && !compact ? <p className="mt-1 text-xs text-muted-foreground">{step.description}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
