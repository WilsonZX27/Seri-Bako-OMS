import { ItemForm } from "@/components/item-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createItem } from "@/server/actions/items";
import { formatPageError } from "@/server/actions/error-handling";
import { getSuppliersForSelect } from "@/server/queries/common";

export const dynamic = "force-dynamic";

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ barcode?: string }> }) {
  try {
    const params = await searchParams;
    const suppliers = await getSuppliersForSelect();

    return (
      <>
        <PageHeader title="New Item" description="Create an ingredient or packaging item." />
        <div className="p-5">
          <ItemForm suppliers={suppliers} initialBarcode={params.barcode} action={createItem} />
        </div>
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="New Item" description="Create an ingredient or packaging item." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              {formatPageError(error, "The item form could not load right now. Please try again shortly.")}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
}
