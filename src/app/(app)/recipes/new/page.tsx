import { RecipeForm } from "@/components/recipe-form";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { createRecipe } from "@/server/actions/recipes";
import { getProducts } from "@/server/queries/products";
import { getRecipeIngredientOptions } from "@/server/queries/recipes";

export default async function NewRecipePage() {
  const [products, items] = await Promise.all([getProducts({ status: "active" }), getRecipeIngredientOptions()]);

  return (
    <>
      <PageHeader title="New Recipe" description="Create a recipe header and ingredient BOM lines." />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Recipe Actions" description={!products.length || !items.length ? "Active products and ingredients are required. Ask an authorised master-data manager to configure them, then reload." : "Build the ingredient lines, then create the draft recipe."}><SubmitButton disabled={!products.length || !items.length} type="submit" form="recipe-create-form" className="w-full" pendingLabel="Creating..." data-mobile-primary-action><Calculator className="h-4 w-4" />Create Recipe</SubmitButton><Button asChild variant="outline" className="w-full"><Link href="/recipes">Cancel</Link></Button><div className="border-t pt-3"><p className="mb-2 text-xs font-semibold">System status</p><dl className="grid gap-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Version</dt><dd className="font-semibold">Assigned on save</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd className="font-semibold">Draft</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Approval</dt><dd className="font-semibold">Draft</dd></div></dl></div></RecordActionPanel>}><RecipeForm requestKey={crypto.randomUUID()} formId="recipe-create-form" products={products} items={items} action={createRecipe} showSubmit={false} /></RecordWorkspace>
    </>
  );
}
