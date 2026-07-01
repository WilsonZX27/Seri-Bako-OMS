import { BarcodeScanWorkflow } from "@/components/barcode-workflows/barcode-scan-workflow";

export default function StockWastageScanPage() {
  return <BarcodeScanWorkflow title="Stock Wastage Scan" description="Scan item barcode, enter wastage quantity and reason, then attach photo evidence where required." mode="stock_wastage" />;
}
