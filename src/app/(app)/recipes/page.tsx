import Link from "next/link";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusTabs } from "@/components/status-tabs";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/sortable-table";
import { hasActiveFilters, paginateRows } from "@/lib/table-state";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getRecipes } from "@/server/queries/recipes";
import { hasPermission } from "@/server/auth/permissions";

export default async function RecipesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [recipes, canCreate] = await Promise.all([getRecipes(), hasPermission("recipes.create")]);
  const search = filters.search?.trim().toLowerCase();
  const visibleRecipes = recipes.filter((recipe) => (!search || [recipe.recipe_no, recipe.product_code, recipe.product_name].some((value) => value.toLowerCase().includes(search))) && (!filters.status || filters.status === "all" || recipe.status === filters.status));
  const page = paginateRows(visibleRecipes, filters.page);
  const filtered = hasActiveFilters(filters);
  const emptyAction = filtered ? { href: "/recipes", label: "Reset filters" } : canCreate ? { href: "/recipes/new", label: "New recipe" } : undefined;

  return (
    <>
      <PageHeader
        title="Recipe / BOM"
        description="Finished product recipes linked to Item Master ingredients."
      />
      <WorkspaceGrid hideMobileConsole={!canCreate} rightRail={<><ConsoleSection title="Actions">{canCreate ? <Button asChild className="w-full" data-mobile-primary-action><Link href="/recipes/new">New recipe</Link></Button> : <p className="text-xs text-muted-foreground">Recipe master data is read-only for Finance.</p>}</ConsoleSection><ConsoleSection title="Recipe Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{recipes.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{recipes.filter((recipe) => recipe.status === "active").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Pending approval</dt><dd className="font-semibold">{recipes.filter((recipe) => recipe.status === "pending_approval").length}</dd></div></dl></ConsoleSection></>}>
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <StatusTabs statuses={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "pending_approval", label: "Pending Approval" }, { value: "archived", label: "Archived" }]} activeStatus={filters.status} />
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search recipe number, product code, or product" statuses={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "pending_approval", label: "Pending Approval" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "archived", label: "Archived" }]} resultCount={page.totalRows} filtered={filtered} resetHref="/recipes" />
            <Table mobileHidden aria-label="Recipes">
              <TableHeader>
                <TableRow>
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
                  <TableHead className="w-12 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.rows.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">{recipe.recipe_no}</TableCell>
                    <TableCell className="hidden md:table-cell">{recipe.product_code}</TableCell>
                    <TableCell className="font-medium">{recipe.product_name}</TableCell>
                    <TableCell className="hidden lg:table-cell">v{recipe.version}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatNumber(recipe.yield_qty)} {recipe.yield_unit}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{recipe.effective_date}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={recipe.approval_status === "approved" ? "success" : recipe.approval_status === "rejected" ? "danger" : "secondary"}>{recipe.approval_status}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{formatCurrency(recipe.total_recipe_cost)}</TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{formatCurrency(recipe.cost_per_finished_unit)}</TableCell>
                    <TableCell>
                      <Badge variant={recipe.status === "active" ? "success" : recipe.status === "rejected" ? "danger" : "secondary"}>{recipe.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right"><TableActionLink href={`/recipes/${recipe.id}`} label={`Open ${recipe.recipe_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
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
            {!page.rows.length ? <EmptyState title={filtered ? "No recipes match these filters" : "No recipes yet"} description={filtered ? "Reset the filters or widen the search." : "Recipes appear after a finished product receives a BOM."} action={emptyAction} /> : null}
          </OperationalList>
          <PaginationControls page={page.page} totalPages={page.totalPages} totalRows={page.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
