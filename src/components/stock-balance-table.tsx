"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OperationalListRow, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn, formatCurrency, formatQuantity } from "@/lib/utils";
import { ItemThumbnail } from "@/components/ui/item-thumbnail";

export type StockBalanceRow = {
  item_id: string;
  item_code: string;
  item_name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  available_qty: number;
  reserved_qty: number;
  current_qty: number;
  purchase_unit: string;
  base_unit: string;
  conversion_to_base_unit: number;
  average_cost: number;
  inventory_value: number;
  last_movement: string | null;
  item_status: string;
  status: string;
  image_url?: string | null;
};

function rowKey(item: StockBalanceRow) {
  return `${item.item_id}-${item.branch_id ?? "all"}`;
}

export function statusVariant(status: string) {
  if (status === "negative") return "danger";
  if (status === "low_stock") return "warning";
  return "success";
}

export function getStockBalanceStatusLabel(status: string) {
  if (status === "negative") return "Out of Stock";
  if (status === "low_stock") return "Reorder Needed";
  if (status === "ok") return "Sufficient";
  return status.replaceAll("_", " ");
}

function formatLedgerHref(itemId: string, branchId: string | null) {
  return `/stock-transactions?item_id=${itemId}&branch_id=${branchId ?? ""}`;
}

export function StockBalanceTableRows({
  rows,
  inBasket,
  onToggleBasket,
}: {
  rows: StockBalanceRow[];
  inBasket: Set<string>;
  onToggleBasket: (row: StockBalanceRow) => void;
}) {
  const router = useRouter();

  return (
    <TableBody data-stock-balance-table>
      {rows.map((item) => {
        const href = formatLedgerHref(item.item_id, item.branch_id);
        const key = rowKey(item);
        const selected = inBasket.has(key);
        const itemActive = item.item_status === "active";
        return (
          <TableRow
            key={key}
            className="cursor-pointer"
            tabIndex={0}
            data-href={href}
            onDoubleClick={(event) => {
              if ((event.target as HTMLElement).closest("a, button, input, select, textarea, option")) return;
              router.push(href);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(href);
              }
            }}
          >
            <TableCell className="w-12 p-0 text-center">
              <Button
                type="button"
                disabled={!itemActive}
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleBasket(item);
                }}
                aria-label={!itemActive ? `${item.item_code} is inactive and cannot be added to PR preparation` : selected ? `Remove ${item.item_code} from PR preparation` : `Add ${item.item_code} to PR preparation`}
                title={!itemActive ? "Inactive item: refresh the master record before preparing a PR." : undefined}
                aria-pressed={selected}
                className={cn("h-9 w-9 rounded-[var(--sb-radius-control)]", selected && "bg-[var(--sb-green-100)] text-[var(--sb-green-950)]")}
              >
                {selected ? <Trash2 className="h-4 w-4" /> : <span className="relative"><ShoppingCart className="h-4 w-4" /><Plus className="absolute -right-1 -top-1 h-2.5 w-2.5 bg-white" aria-hidden="true" /></span>}
              </Button>
            </TableCell>
            <TableCell>{item.item_code}</TableCell>
            <TableCell className="font-medium">{item.item_name}</TableCell>
            <TableCell>{item.branch_name ?? "-"}</TableCell>
            <TableCell className="text-right"><span className="block font-medium">{formatQuantity(item.available_qty)} {item.base_unit}</span><span className="block text-[10px] text-muted-foreground">{formatQuantity(item.reserved_qty)} reserved</span></TableCell>
            <TableCell className="text-right font-medium">{formatQuantity(item.current_qty)} {item.base_unit}</TableCell>
            <TableCell className="text-right"><span className="block font-medium">{formatCurrency(item.average_cost)}</span><span className="block text-[10px] text-muted-foreground">{formatCurrency(item.inventory_value)} value</span></TableCell>
            <TableCell>{item.last_movement ?? "-"}</TableCell>
            <TableCell><Badge className="whitespace-normal" variant={statusVariant(item.status)}>{getStockBalanceStatusLabel(item.status)}</Badge></TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
}

export function StockBalanceOperationalRows({
  rows,
  inBasket,
  onToggleBasket,
}: {
  rows: StockBalanceRow[];
  inBasket: Set<string>;
  onToggleBasket: (row: StockBalanceRow) => void;
}) {
  return (
    <>
      {rows.map((item) => {
        const key = rowKey(item);
        const selected = inBasket.has(key);
        const itemActive = item.item_status === "active";
        return (
          <OperationalListRow
            key={key}
            href={`/stock-transactions?item_id=${item.item_id}&branch_id=${item.branch_id ?? ""}`}
            label={`Open ledger for ${item.item_name}`}
            primary={<span className="flex min-w-0 items-start gap-2.5"><ItemThumbnail src={item.image_url} alt={item.item_name} /><span className="min-w-0 break-words pt-0.5">{item.item_name}</span></span>}
            status={<Badge className="whitespace-normal" variant={statusVariant(item.status)}>{getStockBalanceStatusLabel(item.status)}</Badge>}
            statusMeta={`${formatQuantity(item.current_qty)} ${item.base_unit}`}
            secondary={<span className="block pl-12"><span className="block">{item.item_code} · {item.branch_name ?? "All permitted branches"}</span><span className="block">{formatQuantity(item.available_qty)} available · {formatQuantity(item.reserved_qty)} reserved · {formatCurrency(item.average_cost)} avg</span></span>}
            trailing={
              <button
                type="button"
                disabled={!itemActive}
                className={cn("inline-flex h-10 w-10 items-center justify-center rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] active:bg-[var(--sb-surface-muted)]", selected && "border-[var(--sb-green-700)] bg-[var(--sb-green-100)] text-[var(--sb-green-950)]")}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleBasket(item);
                }}
                aria-label={!itemActive ? `${item.item_code} is inactive and cannot be added to PR preparation` : selected ? `Remove ${item.item_code} from PR preparation` : `Add ${item.item_code} to PR preparation`}
                title={!itemActive ? "Inactive item: refresh the master record before preparing a PR." : undefined}
                aria-pressed={selected}
              >
                {selected ? <Trash2 className="h-4 w-4" /> : <span className="relative"><ShoppingCart className="h-4 w-4" /><Plus className="absolute -right-1 -top-1 h-2.5 w-2.5 bg-white" aria-hidden="true" /></span>}
              </button>
            }
          />
        );
      })}
      {!rows.length ? <div className="px-3 py-3 text-center text-xs text-muted-foreground">No stock balance rows.</div> : null}
    </>
  );
}
