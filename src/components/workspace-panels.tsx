import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type WorkspaceThemeName = "green" | "blue" | "amber" | "purple" | "teal" | "neutral" | "red";

type WorkspaceTheme = {
  panel: string;
  header: string;
  border: string;
  badge: string;
  tag: string;
  iconText: string;
};

export type WorkspaceAction = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  recommendedFor?: string;
  badge?: string;
  disabled?: boolean;
};

export type WorkspaceSection = {
  title: string;
  description: string;
  icon: LucideIcon;
  theme: WorkspaceThemeName;
  actions: WorkspaceAction[];
};

export type WorkspaceInsight = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  theme?: WorkspaceThemeName;
  href?: string;
};

export const workspaceThemes: Record<WorkspaceThemeName, WorkspaceTheme> = {
  green: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-[var(--sb-success-bg)]",
    badge: "bg-[var(--sb-success-bg)]",
    tag: "bg-[var(--sb-success-bg)] text-[var(--sb-success)]",
    iconText: "text-[var(--sb-success)]",
  },
  blue: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-[var(--sb-info-bg)]",
    badge: "bg-[var(--sb-info-bg)]",
    tag: "bg-[var(--sb-info-bg)] text-[var(--sb-info)]",
    iconText: "text-[var(--sb-info)]",
  },
  amber: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-[var(--sb-warning-bg)]",
    badge: "bg-[var(--sb-warning-bg)]",
    tag: "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]",
    iconText: "text-[var(--sb-warning)]",
  },
  purple: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-[var(--sb-info-bg)]",
    badge: "bg-[var(--sb-info-bg)]",
    tag: "bg-[var(--sb-info-bg)] text-[var(--sb-info)]",
    iconText: "text-[var(--sb-info)]",
  },
  teal: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-[var(--sb-success-bg)]",
    badge: "bg-[var(--sb-success-bg)]",
    tag: "bg-[var(--sb-success-bg)] text-[var(--sb-success)]",
    iconText: "text-[var(--sb-success)]",
  },
  neutral: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-[var(--sb-border-soft)]",
    badge: "bg-[var(--sb-neutral-bg)]",
    tag: "bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)]",
    iconText: "text-[var(--sb-neutral-text)]",
  },
  red: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-[var(--sb-danger-bg)]",
    badge: "bg-[var(--sb-danger-bg)]",
    tag: "bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]",
    iconText: "text-[var(--sb-danger)]",
  },
};

export function WorkspaceSectionPanel({ section }: { section: WorkspaceSection }) {
  const theme = workspaceThemes[section.theme];
  const SectionIcon = section.icon;

  return (
    <section className={cn("flex h-auto flex-col overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)]", theme.panel)}>
      <div className={cn("border-b px-3 py-2.5", theme.border, theme.header)}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", theme.badge, theme.iconText)}>
            <SectionIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[13px] font-bold uppercase tracking-normal text-foreground">{section.title}</h2>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted-foreground">{section.description}</p>
          </div>
        </div>
      </div>
      <div className="grid items-stretch divide-y divide-[var(--sb-border-soft)] md:grid-cols-2 md:gap-2.5 md:divide-y-0 md:p-3 xl:grid-cols-1">
        {section.actions.map((action) => (
          <WorkspaceActionCard key={action.href} action={action} theme={theme} />
        ))}
      </div>
    </section>
  );
}

function WorkspaceActionCard({ action, theme }: { action: WorkspaceAction; theme: WorkspaceTheme }) {
  const ActionIcon = action.icon;
  const content = (
    <Card className={cn("h-full rounded-none border-0 bg-white transition-colors md:rounded-[2px] md:border md:border-[var(--sb-border-soft)]", action.disabled ? "opacity-70" : "active:bg-[var(--sb-surface-muted)] md:group-hover:border-[var(--sb-amber-300)] md:group-hover:bg-[var(--sb-surface-muted)]")}>
      <CardContent className="flex h-full min-h-16 flex-col justify-between gap-2 p-3 md:min-h-[88px]">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", theme.badge, theme.iconText)}>
            <ActionIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[13px] font-semibold text-foreground">{action.title}</h3>
              {action.badge ? <Badge variant="secondary">{action.badge}</Badge> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-muted-foreground">{action.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (action.disabled) return <div>{content}</div>;
  return <Link href={action.href} className="group block h-full">{content}</Link>;
}

export function WorkspaceQuickInsights({ insights, action }: { insights: WorkspaceInsight[]; action?: { href: string; label: string; icon?: LucideIcon } }) {
  return (
    <Card className="rounded-[2px] border bg-card shadow-none">
      <CardContent className="grid gap-3 p-3 xl:grid-cols-[140px_1fr_auto] xl:items-center">
        <div>
          <p className="text-[13px] font-semibold">Quick Insights</p>
          <p className="mt-1 text-xs text-muted-foreground">Fast counters for today&apos;s workspace.</p>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden border border-[var(--sb-border-soft)] bg-[var(--sb-border-soft)] sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:border-0 sm:bg-transparent xl:grid-cols-4">
          {insights.map((insight) => {
            const theme = workspaceThemes[insight.theme ?? "neutral"];
            const InsightIcon = insight.icon;
            return (
              <div key={insight.label} className={cn("flex min-w-0 items-center gap-2 bg-white p-2.5 sm:rounded-[2px] sm:border sm:border-[var(--sb-border-soft)]", theme.iconText)}>
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", theme.badge)}>
                  <InsightIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[20px] font-bold leading-none">{insight.value}</p>
                  <p className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium">{insight.label}</p>
                </div>
              </div>
            );
          })}
        </div>
        {action ? (
          <Link href={action.href} className="inline-flex h-[var(--sb-control-height)] items-center justify-center gap-2 rounded-[var(--sb-radius-control)] border bg-background px-4 text-sm font-medium hover:bg-secondary">
            {action.label}
            {action.icon ? <action.icon className="h-4 w-4" /> : null}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CompactStatList({ insights, action }: { insights: WorkspaceInsight[]; action?: { href: string; label: string; icon?: LucideIcon } }) {
  return (
    <Card className="border bg-card shadow-sm">
      <CardContent className="p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold">Quick Insights</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Today&apos;s key counters.</p>
          </div>
          {action ? (
            <Link href={action.href} className="inline-flex h-[var(--sb-control-height)] items-center gap-1 rounded-[var(--sb-radius-control)] border px-2.5 text-xs font-medium hover:bg-secondary">
              {action.label}
              {action.icon ? <action.icon className="h-3.5 w-3.5" /> : null}
            </Link>
          ) : null}
        </div>
        <div className="divide-y rounded-[var(--sb-radius-control)] border bg-white">
          {insights.map((insight) => {
            const theme = workspaceThemes[insight.theme ?? "neutral"];
            const InsightIcon = insight.icon;
            return (
              <LinkOrDiv key={insight.label} href={insight.href} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[var(--sb-surface-muted)]">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", theme.badge, theme.iconText)}>
                    <InsightIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-medium text-muted-foreground">{insight.label}</span>
                </div>
                <span className="font-mono text-sm font-semibold">{insight.value}</span>
              </LinkOrDiv>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function LinkOrDiv({ href, className, children }: { href?: string; className?: string; children: ReactNode }) {
  if (href) return <Link href={href} className={cn("block", className)}>{children}</Link>;
  return <div className={className}>{children}</div>;
}
