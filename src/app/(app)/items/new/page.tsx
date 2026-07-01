import { ItemForm } from "@/components/item-form";
import { PageHeader } from "@/components/ui/page-header";
import { createItem } from "@/server/actions/items";
import { getSuppliersForSelect } from "@/server/queries/common";

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ barcode?: string }> }) {
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
}
