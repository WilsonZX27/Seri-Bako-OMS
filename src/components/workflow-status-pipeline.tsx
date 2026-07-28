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
    <div className={cn("border-y border-[var(--sb-border-soft)] bg-white", compact ? "px-1.5 py-2" : "px-2.5 py-3")}>
      {!compact ? <p className="mb-2 text-xs font-semibold text-[var(--sb-text-muted)]">Workflow</p> : null}
      <div className="flex min-w-0 items-center">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          const Icon = done ? CheckCircle2 : active ? CircleDot : Circle;
          const errorStep = rejected && active;
          return (
            <div key={step.key} className="flex min-w-0 flex-1 items-center" title={step.description}>
              <div className={cn("flex min-w-0 items-center gap-1.5", errorStep ? "text-[var(--sb-danger)]" : done ? "text-[var(--sb-success)]" : active ? "font-semibold text-[var(--sb-green-900)]" : "text-[var(--sb-text-muted)]")} aria-current={active ? "step" : undefined}>
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-[var(--sb-green-700)]", errorStep && "text-[var(--sb-danger)]")} />
                <p className="min-w-0 truncate text-[11px]">{step.label}</p>
              </div>
              {index < steps.length - 1 ? <span aria-hidden="true" className={cn("mx-2 h-px min-w-3 flex-1", done ? "bg-[var(--sb-green-300)]" : "bg-[var(--sb-border)]")} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
