import Link from "next/link";
import { RecipeForm } from "@/components/recipe-form";
import { Calculator } from "lucide-react";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { updateRecipe } from "@/server/actions/recipes";
import { getProducts } from "@/server/queries/products";
import { getRecipe, getRecipeIngredientOptions } from "@/server/queries/recipes";
import { requirePermission } from "@/server/auth/permissions";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("recipes.update");
  const { id } = await params;
  const [recipe, products, items] = await Promise.all([
    getRecipe(id),
    getProducts({ status: "active" }),
    getRecipeIngredientOptions(),
  ]);

  if (recipe.status === "active") {
    return (
      <>
        <PageHeader title="Active Recipe Locked" description={`${recipe.product_code} - ${recipe.product_name}`} />
        <div className="p-5">
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Active recipes cannot be edited directly. Create a new version from the recipe detail page.</p>
              <Button asChild variant="outline"><Link href={`/recipes/${recipe.id}`}>Back to recipe</Link></Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit Recipe" description={`${recipe.product_code} - ${recipe.product_name}`} />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Recipe Actions" description="Save this editable recipe version without changing its workflow state."><Button type="submit" form="recipe-edit-form" className="w-full"><Calculator className="h-4 w-4" />Save Recipe</Button><Button asChild variant="outline" className="w-full"><Link href={`/recipes/${id}`}>Cancel</Link></Button></RecordActionPanel>}><RecipeForm formId="recipe-edit-form" recipe={recipe} products={products} items={items} action={updateRecipe.bind(null, id)} showSubmit={false} /></RecordWorkspace>
    </>
  );
}
