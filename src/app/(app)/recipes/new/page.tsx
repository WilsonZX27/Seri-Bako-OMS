import { RecipeForm } from "@/components/recipe-form";
import { PageHeader } from "@/components/ui/page-header";
import { createRecipe } from "@/server/actions/recipes";
import { getProducts } from "@/server/queries/products";
import { getRecipeIngredientOptions } from "@/server/queries/recipes";

export default async function NewRecipePage() {
  const [products, items] = await Promise.all([getProducts({ status: "active" }), getRecipeIngredientOptions()]);

  return (
    <>
      <PageHeader title="New Recipe" description="Create a recipe header and ingredient BOM lines." />
      <div className="p-5">
        <RecipeForm products={products} items={items} action={createRecipe} />
      </div>
    </>
  );
}
