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
    <div className={cn("rounded-lg border bg-card", compact ? "p-2.5" : "p-3")}>
      {!compact ? <p className="text-sm font-semibold">Workflow</p> : null}
      <div className={cn("grid gap-2 md:grid-cols-[repeat(auto-fit,minmax(112px,1fr))]", compact ? "" : "mt-3")}>
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          const Icon = done ? CheckCircle2 : active ? CircleDot : Circle;
          const errorStep = rejected && active;
          return (
            <div
              key={step.key}
              className={cn(
                "rounded-md border",
                compact ? "p-2" : "p-2.5",
                done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "",
                active && !errorStep ? "border-slate-700 bg-white text-slate-900 shadow-sm" : "",
                errorStep ? "border-red-200 bg-red-50 text-red-800" : "",
              )}
              title={step.description}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <p className="text-[12px] font-medium">{step.label}</p>
              </div>
              {step.description && !compact ? <p className="mt-1 text-xs text-muted-foreground">{step.description}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
