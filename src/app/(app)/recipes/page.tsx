import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusTabs } from "@/components/status-tabs";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getRecipes } from "@/server/queries/recipes";

export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const filters = await searchParams;
  const recipes = await getRecipes();
  const search = filters.search?.trim().toLowerCase();
  const visibleRecipes = recipes.filter((recipe) => (!search || [recipe.recipe_no, recipe.product_code, recipe.product_name].some((value) => value.toLowerCase().includes(search))) && (!filters.status || filters.status === "all" || recipe.status === filters.status));

  return (
    <>
      <PageHeader
        title="Recipe / BOM"
        description="Finished product recipes linked to Item Master ingredients."
      />
      <WorkspaceGrid rightRail={<><ConsoleSection title="Actions"><Button asChild className="w-full" data-mobile-primary-action><Link href="/recipes/new">New recipe</Link></Button></ConsoleSection><ConsoleSection title="Recipe Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{recipes.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{recipes.filter((recipe) => recipe.status === "active").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Pending approval</dt><dd className="font-semibold">{recipes.filter((recipe) => recipe.status === "pending_approval").length}</dd></div></dl></ConsoleSection></>}>
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <StatusTabs statuses={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "pending_approval", label: "Pending Approval" }, { value: "archived", label: "Archived" }]} activeStatus={filters.status} />
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search recipe number, product code, or product" statuses={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "pending_approval", label: "Pending Approval" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "archived", label: "Archived" }]} />
          <div className="overflow-x-auto">
            <Table>
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
                {visibleRecipes.map((recipe) => (
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
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/recipes/${recipe.id}`}>View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!visibleRecipes.length ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      No recipes yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
