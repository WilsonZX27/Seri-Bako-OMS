"use client";

import { RecordDetailError } from "@/components/ui/record-detail-error";

export default function PurchaseOrderDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecordDetailError error={error} reset={reset} recordLabel="Purchase order" collectionLabel="purchase orders" collectionHref="/purchase-orders" />;
}
