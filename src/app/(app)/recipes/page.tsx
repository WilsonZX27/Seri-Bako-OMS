import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getRecipes } from "@/server/queries/recipes";

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <>
      <PageHeader
        title="Recipe / BOM"
        description="Finished product recipes linked to Item Master ingredients."
        action={{ href: "/recipes/new", label: "New recipe" }}
      />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe No</TableHead>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Yield</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Cost / Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">{recipe.recipe_no}</TableCell>
                    <TableCell>{recipe.product_code}</TableCell>
                    <TableCell className="font-medium">{recipe.product_name}</TableCell>
                    <TableCell>v{recipe.version}</TableCell>
                    <TableCell>
                      {formatNumber(recipe.yield_qty)} {recipe.yield_unit}
                    </TableCell>
                    <TableCell>{recipe.effective_date}</TableCell>
                    <TableCell>
                      <Badge variant={recipe.approval_status === "approved" ? "success" : recipe.approval_status === "rejected" ? "danger" : "secondary"}>{recipe.approval_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(recipe.total_recipe_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(recipe.cost_per_finished_unit)}</TableCell>
                    <TableCell>
                      <Badge variant={recipe.status === "active" ? "success" : recipe.status === "rejected" ? "danger" : "secondary"}>{recipe.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/recipes/${recipe.id}`}>View</Link>
                        </Button>
                        {recipe.status !== "active" ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/recipes/${recipe.id}/edit`}>Edit</Link>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!recipes.length ? (
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
      </div>
    </>
  );
}
