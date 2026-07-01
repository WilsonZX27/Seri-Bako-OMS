import { BarcodeScanWorkflow } from "@/components/barcode-workflows/barcode-scan-workflow";

export default function GoodsReceivingScanPage() {
  return (
    <BarcodeScanWorkflow
      title="Goods Receiving Scan"
      description="Scan supplier items during receiving, then match them to the selected PO line before posting the GRN."
      mode="goods_receiving"
    />
  );
}
