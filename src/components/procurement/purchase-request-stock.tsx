import { formatDateOnly, formatNumber } from "@/lib/utils";
import type { PurchaseRequestBranchStock } from "@/server/queries/procurement";
import type { stockUomContext } from "@/lib/procurement/stock-uom-context";
export function PurchaseRequestStock({stock, units}: {stock?: PurchaseRequestBranchStock; units: ReturnType<typeof stockUomContext>}) {
  return <div className="space-y-0.5 text-xs">
    <p className={stock ? "font-medium tabular-nums" : "font-medium text-muted-foreground"}>{stock ? `${formatNumber(stock.quantity)} ${stock.uom}` : "No branch stock history yet"}</p>
    {units && units.purchase !== units.base ? <p className={units.factor === null ? "text-[var(--sb-warning)]" : "text-muted-foreground"}>{units.factor === null ? `${units.purchase} → ${units.base} · conversion not configured` : `1 ${units.purchase} = ${formatNumber(units.factor)} ${units.base}`}</p> : null}
    {stock ? <p className="text-[11px] text-muted-foreground">Stock updated {formatDateOnly(stock.asOf)}</p> : null}
  </div>;
}
