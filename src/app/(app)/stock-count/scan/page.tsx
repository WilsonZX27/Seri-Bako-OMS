import { BarcodeScanWorkflow } from "@/components/barcode-workflows/barcode-scan-workflow";

export default function StockCountScanPage() {
  return (
    <BarcodeScanWorkflow
      title="Stock Count Scan Mode"
      description="Scan item or product barcode, confirm the item card, enter physical quantity, then continue scanning."
      mode="stock_count"
    />
  );
}
