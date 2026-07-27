import { RecipeForm } from "@/components/recipe-form";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { createRecipe } from "@/server/actions/recipes";
import { getProducts } from "@/server/queries/products";
import { getRecipeIngredientOptions } from "@/server/queries/recipes";

export default async function NewRecipePage() {
  const [products, items] = await Promise.all([getProducts({ status: "active" }), getRecipeIngredientOptions()]);

  return (
    <>
      <PageHeader title="New Recipe" description="Create a recipe header and ingredient BOM lines." />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Recipe Actions" description="Build the ingredient lines, then create the draft recipe."><Button type="submit" form="recipe-create-form" className="w-full" data-mobile-primary-action><Calculator className="h-4 w-4" />Create Recipe</Button><Button asChild variant="outline" className="w-full"><Link href="/recipes">Cancel</Link></Button></RecordActionPanel>}><RecipeForm formId="recipe-create-form" products={products} items={items} action={createRecipe} showSubmit={false} /></RecordWorkspace>
    </>
  );
}
