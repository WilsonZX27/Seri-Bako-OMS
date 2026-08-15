import { Badge } from "@/components/ui/badge";
import { InteractiveRankingChart } from "@/components/ui/interactive-ranking-chart";
import type { CostingModuleSummary } from "@/server/queries/costing-readiness";

const moduleLabels = {
  item: "Items",
  supplier_item: "Supplier items",
  recipe: "Recipes",
  product: "Products",
} as const;

export function CostingReadinessInsights({
  readiness,
  modules,
  severity,
}: {
  readiness: "Ready" | "Needs cleanup" | "Not ready";
  modules: CostingModuleSummary[];
  severity?: string;
}) {
  const scope = severity && severity !== "all" ? severity : "all severities";
  const scopedSummary = modules.reduce((summary, row) => ({
    total: summary.total + row.total,
    critical: summary.critical + row.critical,
    warning: summary.warning + row.warning,
    info: summary.info + row.info,
  }), { total: 0, critical: 0, warning: 0, info: 0 });
  const items = [...modules]
    .sort((left, right) => right.total - left.total || moduleLabels[left.module].localeCompare(moduleLabels[right.module]))
    .map((row) => {
      const params = new URLSearchParams({ module: row.module });
      if (severity && severity !== "all") params.set("severity", severity);
      return {
        id: row.module,
        label: moduleLabels[row.module],
        value: row.total,
        formattedValue: `${row.total} ${row.total === 1 ? "issue" : "issues"}`,
        details: [`${row.critical} critical`, `${row.warning} warning`, `${row.info} information`, `Scope: ${scope}`],
        caution: row.critical ? "Critical gaps block trustworthy costing." : undefined,
        href: `/reports/costing-readiness?${params.toString()}`,
      };
    });

  return <section className="sb-work-surface overflow-hidden" aria-labelledby="costing-readiness-insight-title" data-costing-readiness-insights>
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--sb-border-soft)] px-4 py-3">
      <div>
        <h2 id="costing-readiness-insight-title" className="text-sm font-semibold">Where are costing gaps concentrated?</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Current master data and recipe lines · {scope} · issue counts, not financial value</p>
      </div>
      <Badge variant={readiness === "Ready" ? "success" : readiness === "Needs cleanup" ? "warning" : "danger"}>Overall: {readiness}</Badge>
    </header>
    <div className="p-3">
      <p className="mb-2 text-xs text-muted-foreground"><strong className="text-foreground">{scopedSummary.total} in scope</strong> · {scopedSummary.critical} critical · {scopedSummary.warning} warning · {scopedSummary.info} information</p>
      <InteractiveRankingChart items={items} ariaLabel={`Costing readiness issues by module for ${scope}`} idlePrompt="Hover, tap, or focus a module to preview severity composition. Open applies that module to the issue list." />
    </div>
  </section>;
}
