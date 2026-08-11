import Link from "next/link";
import { ArrowRight, ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OperationalMetric = {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger";
};

export type OperationalQueueItem = {
  href: string;
  title: string;
  description: string;
  value?: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger";
};

export type OperationalTool = {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
};

type OperationalHubProps = {
  eyebrow: string;
  summary: string;
  primaryAction: {
    href: string;
    label: string;
  };
  metrics: OperationalMetric[];
  queueTitle: string;
  queueDescription: string;
  queue: OperationalQueueItem[];
  toolsTitle: string;
  tools: OperationalTool[];
};

const toneStyles = {
  default: {
    value: "text-[var(--sb-green-900)]",
    icon: "bg-[var(--sb-green-100)] text-[var(--sb-green-800)]",
  },
  warning: {
    value: "text-[var(--sb-warning)]",
    icon: "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]",
  },
  danger: {
    value: "text-[var(--sb-danger)]",
    icon: "bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]",
  },
} as const;

export function OperationalHub({
  eyebrow,
  summary,
  primaryAction,
  metrics,
  queueTitle,
  queueDescription,
  queue,
  toolsTitle,
  tools,
}: OperationalHubProps) {
  return (
    <div data-operational-hub className="space-y-3 sm:space-y-4">
      <section className="overflow-hidden border border-[var(--sb-border-soft)] bg-white">
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--sb-text)]">{eyebrow}</p>
            <p className="mt-0.5 max-w-[65ch] text-xs leading-5 text-[var(--sb-text-muted)]">{summary}</p>
          </div>
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link href={primaryAction.href}>
              {primaryAction.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <dl className="grid grid-cols-2 border-t border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] md:grid-cols-4">
          {metrics.map((metric, index) => {
            const tone = toneStyles[metric.tone ?? "default"];
            return (
              <div
                key={metric.label}
                className={cn(
                  "min-w-0 px-3.5 py-3",
                  index % 2 === 1 && "border-l border-[var(--sb-border-soft)]",
                  index >= 2 && "border-t border-[var(--sb-border-soft)] md:border-t-0",
                  index > 0 && "md:border-l md:border-[var(--sb-border-soft)]",
                )}
              >
                <dt className="truncate text-[13px] font-medium text-[var(--sb-text)]">{metric.label}</dt>
                <dd className={cn("mt-1.5 font-mono text-[1.375rem] font-bold leading-none tabular-nums", tone.value)}>
                  {metric.value}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] lg:gap-4">
        <section className="min-w-0 overflow-hidden border border-[var(--sb-border-soft)] bg-white">
          <div className="border-b border-[var(--sb-border-soft)] px-3.5 py-3 sm:px-4">
            <h2 className="text-sm font-semibold text-[var(--sb-text)]">{queueTitle}</h2>
            <p className="mt-0.5 text-xs leading-5 text-[var(--sb-text-muted)]">{queueDescription}</p>
          </div>
          <div className="divide-y divide-[var(--sb-border-soft)]">
            {queue.map((item) => {
              const ItemIcon = item.icon;
              const tone = toneStyles[item.tone ?? "default"];
              return (
                <Link
                  key={`${item.href}-${item.title}`}
                  href={item.href}
                  className="group flex min-h-16 items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)] sm:px-4"
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--sb-border-soft)]", tone.icon)}>
                    <ItemIcon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--sb-text)]">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--sb-text-muted)]">{item.description}</span>
                  </span>
                  {item.value !== undefined ? (
                    <span className={cn("shrink-0 font-mono text-sm font-semibold tabular-nums", tone.value)}>{item.value}</span>
                  ) : null}
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--sb-text-soft)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden border border-[var(--sb-border-soft)] bg-white">
          <div className="border-b border-[var(--sb-border-soft)] px-3.5 py-3 sm:px-4">
            <h2 className="text-sm font-semibold text-[var(--sb-text)]">{toolsTitle}</h2>
          </div>
          <div className="divide-y divide-[var(--sb-border-soft)]">
            {tools.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <Link
                  key={`${tool.href}-${tool.title}`}
                  href={tool.href}
                  className="group flex min-h-14 items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)] sm:px-4"
                >
                  <ToolIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--sb-green-800)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--sb-text)]">{tool.title}</span>
                    {tool.description ? <span className="mt-0.5 block truncate text-xs text-[var(--sb-text-muted)]">{tool.description}</span> : null}
                  </span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--sb-text-soft)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
