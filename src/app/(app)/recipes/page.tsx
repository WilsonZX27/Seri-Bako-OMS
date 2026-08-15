import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingLink } from "@/components/ui/pending-link";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusTabs } from "@/components/status-tabs";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/sortable-table";
import { hasActiveFilters } from "@/lib/table-state";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import { getRecipes, getRecipeSummary } from "@/server/queries/recipes";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

export default async function RecipesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [page, canCreate, [summaryResult]] = await Promise.all([getRecipes(filters), hasPermission("recipes.create"), Promise.allSettled([getRecipeSummary()])]);
  if (summaryResult.status === "rejected") logServerError(summaryResult.reason, { source: "page.recipes.summary" });
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const filtered = hasActiveFilters(filters);
  const emptyAction = filtered ? { href: "/recipes", label: "Reset filters" } : canCreate ? { href: "/recipes/new", label: "New recipe" } : undefined;

  return (
    <>
      <PageHeader
        title="Recipe / BOM"
        description="Finished product recipes linked to Item Master ingredients."
      />
      <WorkspaceGrid tabletRailMode="split" tabletRailBreakpoint="md" hideMobileConsole={!canCreate} rightRail={<><ConsoleSection title="Actions">{canCreate ? <Button asChild className="w-full" data-mobile-primary-action><PendingLink href="/recipes/new" pendingLabel="Opening recipe form...">New recipe</PendingLink></Button> : <p className="text-xs text-muted-foreground">Recipe master data is read-only for Finance.</p>}</ConsoleSection><ConsoleSection title="Recipe Summary">{summary ? <dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{summary.total}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{summary.active}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Pending approval</dt><dd className="font-semibold">{summary.pendingApproval}</dd></div></dl> : <div role="status"><p className="text-xs font-semibold text-[var(--sb-warning)]">Unavailable</p><p className="mt-1 text-xs text-muted-foreground">The recipe list remains current. Retry to load recipe totals.</p></div>}</ConsoleSection></>}>
        <div className="space-y-3">
          <MasterDataFilters search={filters.search} status={filters.status} leadingFilter={<StatusTabs statuses={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "pending_approval", label: "Pending Approval" }, { value: "archived", label: "Archived" }]} activeStatus={filters.status} />} placeholder="Search recipe number, product code, or product" showStatus={false} resultCount={page.totalRows} filtered={filtered} resetHref="/recipes" />
          <div className="sb-list-content-card overflow-hidden">
            <Table mobileHidden aria-label="Recipes" stickyColumn="second">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Action</TableHead>
                  <TableHead>Recipe No</TableHead>
                  <TableHead className="hidden md:table-cell">Product Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden lg:table-cell">Version</TableHead>
                  <TableHead className="hidden md:table-cell">Yield</TableHead>
                  <TableHead className="hidden lg:table-cell">Effective</TableHead>
                  <TableHead className="hidden md:table-cell">Approval</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Total Cost</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Cost / Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="w-16 p-0 text-center"><TableActionLink href={`/recipes/${recipe.id}`} label={`Open ${recipe.recipe_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell className="font-medium">{recipe.recipe_no}</TableCell>
                    <TableCell className="hidden md:table-cell">{recipe.product_code}</TableCell>
                    <TableCell className="font-medium">{recipe.product_name}</TableCell>
                    <TableCell className="hidden lg:table-cell">v{recipe.version}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatNumber(recipe.yield_qty)} {recipe.yield_unit}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDateOnly(recipe.effective_date)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={recipe.approval_status === "approved" ? "success" : recipe.approval_status === "rejected" ? "danger" : "secondary"}>{recipe.approval_status}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{formatCurrency(recipe.total_recipe_cost)}</TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{formatCurrency(recipe.cost_per_finished_unit)}</TableCell>
                    <TableCell>
                      <Badge variant={recipe.status === "active" ? "success" : recipe.status === "rejected" ? "danger" : "secondary"}>{recipe.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!page.rows.length ? (
                  <TableRow>
                    <TableCell colSpan={11}><EmptyState title={filtered ? "No recipes match these filters" : "No recipes yet"} description={filtered ? "Reset the filters or widen the search." : "Recipes appear after a finished product receives a BOM."} action={emptyAction} /></TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          <OperationalList ariaLabel="Recipes">
            {page.rows.map((recipe) => <OperationalListRow key={recipe.id} href={`/recipes/${recipe.id}`} label={`Open ${recipe.recipe_no}`} primary={recipe.product_name} status={<Badge variant={recipe.status === "active" ? "success" : recipe.status === "rejected" ? "danger" : "secondary"}>{recipe.status}</Badge>} secondary={`${recipe.recipe_no} · ${recipe.product_code}`} meta={`${formatNumber(recipe.yield_qty)} ${recipe.yield_unit}`} />)}
            {!page.rows.length ? <EmptyState title={filtered ? "No recipes match these filters" : "No recipes yet"} description={filtered ? "Reset the filters or widen the search." : "Recipes appear after a finished product receives a BOM."} action={filtered ? emptyAction : undefined} /> : null}
          </OperationalList>
          <PaginationControls page={page.page} totalPages={page.totalPages} totalRows={page.totalRows} searchParams={filters} />
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
