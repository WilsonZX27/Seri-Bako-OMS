import Link from "next/link";
import { Activity, CheckCircle2, CircleAlert, HeartPulse } from "lucide-react";
import { acknowledgeSystemIncident } from "@/server/actions/system-health";
import { getSystemHealthWorkspace } from "@/server/queries/system-health";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusVariant = (status: string) => status === "recovered" ? "success" : status === "action_required" ? "danger" : status === "recovering" ? "warning" : "secondary";

export default async function SystemHealthPage({ searchParams }: { searchParams: Promise<{ incident?: string }> }) {
  const [{ incidents, summary }, params] = await Promise.all([getSystemHealthWorkspace(), searchParams]);
  const selected = incidents.find((row) => row.id === params.incident) ?? null;

  return (
    <>
      <PageHeader title="System Health" description="Owner-only reliability signals, automatic recovery, and unresolved operational incidents." />
      <WorkspaceGrid
        hideMobileConsole={!selected}
        rightRail={selected ? (
          <ConsoleSection title="Incident detail">
            <div className="space-y-2">
              <Badge variant={statusVariant(selected.status)}>{selected.status.replaceAll("_", " ")}</Badge>
              <p className="text-sm font-medium">{selected.safe_message}</p>
              <dl className="space-y-1 text-xs text-[var(--sb-text-muted)]">
                <div className="flex justify-between gap-3"><dt>Code</dt><dd className="font-medium text-[var(--sb-text)]">{selected.safe_code}</dd></div>
                <div className="flex justify-between gap-3"><dt>Occurrences</dt><dd className="font-medium text-[var(--sb-text)]">{selected.occurrence_count}</dd></div>
                <div className="flex justify-between gap-3"><dt>Retries</dt><dd className="font-medium text-[var(--sb-text)]">{selected.recovery_attempts}</dd></div>
                <div className="flex justify-between gap-3"><dt>Last seen</dt><dd className="font-medium text-[var(--sb-text)]">{formatDateTime(selected.last_seen_at)}</dd></div>
              </dl>
              {selected.recommended_action ? <p className="rounded-[var(--sb-radius-control)] bg-[var(--sb-warning-bg)] p-2 text-xs text-[var(--sb-warning)]">{selected.recommended_action}</p> : null}
              {!['recovered','acknowledged'].includes(selected.status) ? (
                <form action={acknowledgeSystemIncident}>
                  <input type="hidden" name="incident_id" value={selected.id} />
                  <Button type="submit" variant="outline" className="w-full">Acknowledge</Button>
                </form>
              ) : null}
            </div>
          </ConsoleSection>
        ) : (
          <ConsoleSection title="Reliability policy">
            <p className="text-xs text-[var(--sb-text-muted)]">Automatic detection is active for instrumented server operations. Safe transient reads retry; repeated signals escalate.</p>
          </ConsoleSection>
        )}
      >
        <section aria-label="24-hour reliability summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-border-soft)] lg:grid-cols-4">
          {[
            { label: "Incidents · 24h", value: summary.incidents24h, icon: Activity },
            { label: "Unresolved", value: summary.unresolved, icon: CircleAlert },
            { label: "Action required", value: summary.actionRequired, icon: HeartPulse },
            { label: "Recovery rate", value: `${summary.recoveryRate}%`, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--sb-text-muted)]"><Icon className="h-4 w-4" aria-hidden="true" />{label}</div>
              <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[var(--sb-border-soft)] px-3 py-2">
            <div><h2 className="text-sm font-semibold">Reliability incidents</h2><p className="text-xs text-[var(--sb-text-muted)]">Recovered signals remain visible for audit and are collapsed into one fingerprint.</p></div>
            <a href="/api/health" className="self-center text-xs font-medium text-[var(--sb-green-800)]">Health API</a>
          </div>
          <div className="divide-y divide-[var(--sb-border-soft)]">
            {incidents.map((incident) => (
              <Link key={incident.id} href={`/administration/system-health?incident=${incident.id}`} className="grid gap-2 px-3 py-3 hover:bg-[var(--sb-surface-muted)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{incident.module}</p><Badge variant={statusVariant(incident.status)}>{incident.status.replaceAll("_", " ")}</Badge></div>
                  <p className="mt-1 text-xs text-[var(--sb-text-muted)]">{incident.safe_message}</p>
                  <p className="mt-1 text-[11px] text-[var(--sb-text-muted)]">{incident.safe_code} · {incident.occurrence_count} occurrence{incident.occurrence_count === 1 ? "" : "s"}</p>
                </div>
                <time className="text-xs text-[var(--sb-text-muted)]">{formatDateTime(incident.last_seen_at)}</time>
              </Link>
            ))}
            {!incidents.length ? <div className="p-6 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-[var(--sb-success)]" /><p className="mt-2 text-sm font-medium">No reliability incidents in the last 24 hours</p><p className="mt-1 text-xs text-[var(--sb-text-muted)]">New signals will be grouped here automatically.</p></div> : null}
          </div>
        </section>
      </WorkspaceGrid>
    </>
  );
}
