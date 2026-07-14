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
    border: "border-emerald-100",
    badge: "bg-emerald-100",
    tag: "bg-emerald-100 text-emerald-800",
    iconText: "text-emerald-700",
  },
  blue: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-blue-100",
    badge: "bg-blue-100",
    tag: "bg-blue-100 text-blue-800",
    iconText: "text-blue-700",
  },
  amber: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-amber-100",
    badge: "bg-amber-100",
    tag: "bg-amber-100 text-amber-800",
    iconText: "text-amber-700",
  },
  purple: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-purple-100",
    badge: "bg-purple-100",
    tag: "bg-purple-100 text-purple-800",
    iconText: "text-purple-700",
  },
  teal: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-teal-100",
    badge: "bg-teal-100",
    tag: "bg-teal-100 text-teal-800",
    iconText: "text-teal-700",
  },
  neutral: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-slate-200",
    badge: "bg-slate-100",
    tag: "bg-slate-100 text-slate-700",
    iconText: "text-slate-700",
  },
  red: {
    panel: "bg-white",
    header: "bg-white",
    border: "border-red-100",
    badge: "bg-red-100",
    tag: "bg-red-100 text-red-800",
    iconText: "text-red-700",
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
      <div className="grid items-stretch gap-2.5 p-3 md:grid-cols-2 xl:grid-cols-1">
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
    <Card className={cn("h-full rounded-[2px] border border-[var(--sb-border-soft)] bg-white transition-colors", action.disabled ? "opacity-70" : "group-hover:border-[var(--sb-amber-300)] group-hover:bg-[var(--sb-surface-muted)]")}>
      <CardContent className="flex h-full min-h-[88px] flex-col justify-between gap-2 p-3">
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
    <Card className="border bg-card shadow-sm">
      <CardContent className="grid gap-3 p-3 xl:grid-cols-[140px_1fr_auto] xl:items-center">
        <div>
          <p className="text-[13px] font-semibold">Quick Insights</p>
          <p className="mt-1 text-xs text-muted-foreground">Fast counters for today&apos;s workspace.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.map((insight) => {
            const theme = workspaceThemes[insight.theme ?? "neutral"];
            const InsightIcon = insight.icon;
            return (
              <div key={insight.label} className={cn("flex items-center gap-2 rounded-[2px] border border-[var(--sb-border-soft)] bg-white p-2.5", theme.iconText)}>
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
          <Link href={action.href} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-secondary">
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
            <Link href={action.href} className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium hover:bg-secondary">
              {action.label}
              {action.icon ? <action.icon className="h-3.5 w-3.5" /> : null}
            </Link>
          ) : null}
        </div>
        <div className="divide-y rounded-lg border bg-white">
          {insights.map((insight) => {
            const theme = workspaceThemes[insight.theme ?? "neutral"];
            const InsightIcon = insight.icon;
            return (
              <LinkOrDiv key={insight.label} href={insight.href} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
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
