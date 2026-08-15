import Link from "next/link";
import { ConsoleSection } from "@/components/layout/right-console";
import { ProductMarginInsights } from "@/components/reports/costing-report-insights";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasActiveFilters } from "@/lib/table-state";
import { formatCurrency } from "@/lib/utils";
import { getProductMargin, type ProductMarginRow } from "@/server/queries/product-margin";
import { logServerError } from "@/server/observability/logger";

export const dynamic = "force-dynamic";

const statusVariant = { Ready: "success", "Cost incomplete": "warning", "Missing price": "danger", "Missing recipe": "danger" } as const;
const bandLabel = { review: "Review", healthy: "Healthy", unavailable: "Unavailable" } as const;

function actionLabel(row: ProductMarginRow) {
  if (row.status === "Missing price") return "Review product pricing";
  if (row.status === "Cost incomplete") return "Review recipe costing";
  if (row.status === "Missing recipe") return "Link active recipe";
  return "Review margin";
}

function actionHref(row: ProductMarginRow) {
  return row.status === "Cost incomplete" ? "/reports/recipe-costing?confidence=low" : `/products/${row.id}`;
}

export default async function ProductMarginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const rows = await getProductMargin(filters).catch((error) => { logServerError(error, { source: "page.productMargin.report" }); return null; });
  const filtered = hasActiveFilters(filters);
  const emptyTitle = filtered ? "No product margins match these filters" : "No active products to review";
  const emptyDescription = filtered
    ? "Clear or widen the filters to review another product."
    : "Create or activate a product before reviewing margin estimates.";
  return <><PageHeader title="Product Margin" description="Read-only product cost and gross-margin estimate from trusted recipe costs." />
    <WorkspaceGrid hideMobileConsole rightRail={<><ConsoleSection title="Margin assumptions"><div className="space-y-2 text-xs text-muted-foreground"><p>Read-only estimate, not a pricing recommendation. Only <strong className="text-foreground">High</strong>-confidence recipe costs are used; Medium and Low are Cost incomplete.</p><p>One active product-packaging price is required. Missing or ambiguous pricing blocks margin, and missing cost is never zero.</p><p>No product price, product cost, or margin is written. Pricing decisions remain manual.</p></div></ConsoleSection><ConsoleSection title="Review paths"><p className="text-xs text-muted-foreground">Use Product to review packaging pricing. Use Recipe Costing or Costing Readiness when a recipe cost is incomplete.</p></ConsoleSection></>}>
      {!rows ? <Card><CardContent className="p-5"><EmptyState title="Product margin is unavailable" description="Try again shortly. No product data was changed." /></CardContent></Card> : <div className="space-y-3" data-product-margin-workspace>
        <FilterBar resultCount={rows.length} resetHref="/reports/product-margin" filtered={hasActiveFilters(filters)} className="sb-list-filters--balanced">
          <Input name="search" defaultValue={filters.search} placeholder="Search product" aria-label="Search product" />
          <SelectNative name="status" defaultValue={filters.status ?? "all"} aria-label="Margin readiness status"><option value="all">All statuses</option><option value="ready">Ready</option><option value="cost_incomplete">Cost incomplete</option><option value="missing_price">Missing price</option><option value="missing_recipe">Missing recipe</option></SelectNative>
          <FilterBarMore activeCount={Number(Boolean(filters.margin_band && filters.margin_band !== "all")) + Number(Boolean(filters.incomplete && filters.incomplete !== "all"))} resetHref="/reports/product-margin">
            <SelectNative name="margin_band" defaultValue={filters.margin_band ?? "all"} aria-label="Margin band"><option value="all">All margin bands</option><option value="review">Review</option><option value="healthy">Healthy</option><option value="unavailable">Unavailable</option></SelectNative>
            <SelectNative name="incomplete" defaultValue={filters.incomplete ?? "all"} aria-label="Recipe cost completeness"><option value="all">All recipe links</option><option value="yes">Missing recipe/cost only</option><option value="no">Ready only</option></SelectNative>
          </FilterBarMore>
          <Button type="submit" variant="secondary">Filter</Button>
        </FilterBar>
        <ProductMarginInsights rows={rows} searchParams={filters} />
        <section className="sb-list-content-card overflow-hidden">
        <Table mobileHidden compactUntil="2xl" aria-label="Product cost and margin estimates"><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Recipe</TableHead><TableHead>Recipe confidence</TableHead><TableHead className="text-right">Selling price</TableHead><TableHead className="text-right">Product cost</TableHead><TableHead className="text-right">Margin</TableHead><TableHead className="text-right">Margin %</TableHead><TableHead>Margin band</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-medium">{row.product_code}</p><p className="text-xs text-muted-foreground">{row.product_name}</p></TableCell><TableCell>{row.recipe_id ? <Link className="hover:underline" href={`/recipes/${row.recipe_id}`}>Open recipe · {row.recipe_no}</Link> : "—"}</TableCell><TableCell>{row.recipe_confidence ? <Badge variant={row.recipe_confidence === "High" ? "success" : row.recipe_confidence === "Medium" ? "warning" : "danger"}>{row.recipe_confidence}</Badge> : "—"}</TableCell><TableCell className="text-right">{row.selling_price == null ? "—" : formatCurrency(row.selling_price)}</TableCell><TableCell className="text-right">{row.estimated_product_cost == null ? "Incomplete" : formatCurrency(row.estimated_product_cost)}</TableCell><TableCell className="text-right">{row.gross_margin_amount == null ? "—" : formatCurrency(row.gross_margin_amount)}</TableCell><TableCell className="text-right">{row.gross_margin_percent == null ? "—" : `${(row.gross_margin_percent * 100).toFixed(1)}%`}</TableCell><TableCell><Badge variant={row.margin_band === "healthy" ? "success" : row.margin_band === "review" ? "warning" : "secondary"}>{bandLabel[row.margin_band]}</Badge></TableCell><TableCell><Badge variant={statusVariant[row.status]}>{row.status}</Badge></TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={actionHref(row)}>{actionLabel(row)}</Link></Button></TableCell></TableRow>)}{!rows.length ? <TableRow><TableCell colSpan={10}><EmptyState title={emptyTitle} description={emptyDescription} /></TableCell></TableRow> : null}</TableBody></Table>
        <div data-product-margin-mobile-list>
          <OperationalList ariaLabel="Product cost and margin estimates" showUntil="2xl">
            {rows.map((row) => <OperationalListRow
              key={row.id}
              href={actionHref(row)}
              label={`${actionLabel(row)} for ${row.product_name}`}
              primary={row.product_name}
              status={<Badge variant={statusVariant[row.status]}>{row.status}</Badge>}
              statusMeta={row.gross_margin_percent == null ? "Margin unavailable" : `${(row.gross_margin_percent * 100).toFixed(1)}% margin`}
              secondary={<>{row.product_code} · {row.recipe_no ?? "No active recipe"}</>}
              detail={<><span className="block">Price {row.selling_price == null ? "unavailable" : formatCurrency(row.selling_price)} · Cost {row.estimated_product_cost == null ? "incomplete" : formatCurrency(row.estimated_product_cost)} · Margin {row.gross_margin_amount == null ? "unavailable" : formatCurrency(row.gross_margin_amount)}</span><span className="block"><span className="font-medium text-[var(--sb-text)]">Confidence:</span> {row.recipe_confidence ?? "unavailable"} · <span className="font-medium text-[var(--sb-text)]">Next: {actionLabel(row)}</span></span></>}
              meta={`Band ${bandLabel[row.margin_band]}`}
            />)}
            {!rows.length ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null}
          </OperationalList>
        </div>
        </section>
      </div>}
    </WorkspaceGrid></>;
}
