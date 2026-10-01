import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { OutletPackagingReport } from "@/components/outlet-packaging-report";
import { getOutletPackagingReport } from "@/server/queries/outlet-packaging";

async function Report({ days }: { days: 7 | 30 }) {
  // Read one bounded month once. Period, outlet and product changes are local.
  const report = await getOutletPackagingReport(30);
  return <OutletPackagingReport key={days} report={report} days={days} />;
}

export default async function OutletPackagingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = rawDays === "30" ? 30 : 7;
  return <>
    <PageHeader title="Packaging Usage" />
    <Suspense fallback={<WorkspaceGrid rightRail={<ConsoleSection title="Packaging actions"><p>Loading report…</p></ConsoleSection>}><div role="status" aria-live="polite" className="erp-surface p-6 text-sm text-muted-foreground">Loading packaging stock and usage…</div></WorkspaceGrid>}>
      <Report days={days} />
    </Suspense>
  </>;
}
