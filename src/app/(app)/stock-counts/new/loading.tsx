import { PageLoadingState } from "@/components/ui/system-states";

export default function NewStockCountLoading() {
  return <PageLoadingState label="Preparing the count workspace..." variant="form" />;
}
