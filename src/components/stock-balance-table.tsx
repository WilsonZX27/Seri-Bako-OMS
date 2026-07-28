"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OperationalListRow, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, formatQuantity } from "@/lib/utils";

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
  base_unit: string;
  average_cost: number;
  inventory_value: number;
  last_movement: string | null;
  status: string;
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

  useEffect(() => {
    const body = document.querySelector<HTMLTableSectionElement>("tbody[data-stock-balance-table]");
    if (!body) return;

    const handlePointerDown = (event: PointerEvent) => {
      const row = (event.target as HTMLElement | null)?.closest?.("tr[data-href]") as HTMLElement | null;
      if (!row) return;
      if ((event.target as HTMLElement | null)?.closest?.("a, button, input, select, textarea, option")) return;
      const href = row.getAttribute("data-href");
      if (href) router.push(href);
    };

    body.addEventListener("pointerdown", handlePointerDown);
    return () => body.removeEventListener("pointerdown", handlePointerDown);
  }, [router]);

  return (
    <TableBody data-stock-balance-table>
      {rows.map((item) => {
        const href = formatLedgerHref(item.item_id, item.branch_id);
        const key = rowKey(item);
        const selected = inBasket.has(key);
        return (
          <TableRow
            key={key}
            className="cursor-pointer"
            tabIndex={0}
            data-href={href}
            onClick={() => router.push(href)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(href);
              }
            }}
          >
            <TableCell>{item.item_code}</TableCell>
            <TableCell className="font-medium">{item.item_name}</TableCell>
            <TableCell>{item.branch_name ?? "-"}</TableCell>
            <TableCell className="text-right">{formatQuantity(item.available_qty)} {item.base_unit}</TableCell>
            <TableCell className="text-right">{formatQuantity(item.reserved_qty)} {item.base_unit}</TableCell>
            <TableCell className="text-right font-medium">{formatQuantity(item.current_qty)} {item.base_unit}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.average_cost)}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.inventory_value)}</TableCell>
            <TableCell>{item.last_movement ?? "-"}</TableCell>
            <TableCell><Badge variant={statusVariant(item.status)}>{getStockBalanceStatusLabel(item.status)}</Badge></TableCell>
            <TableCell className="text-right">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleBasket(item);
                }}
                aria-label={selected ? `Remove ${item.item_code} from PR preparation` : `Add ${item.item_code} to PR preparation`}
              >
                {selected ? <Trash2 className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              </Button>
            </TableCell>
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
        return (
          <OperationalListRow
            key={key}
            href={`/stock-transactions?item_id=${item.item_id}&branch_id=${item.branch_id ?? ""}`}
            label={`Open ledger for ${item.item_name}`}
            primary={item.item_name}
            status={<Badge variant={statusVariant(item.status)}>{getStockBalanceStatusLabel(item.status)}</Badge>}
            secondary={`${item.item_code} · ${item.branch_name ?? "All permitted branches"}`}
            meta={`${formatQuantity(item.current_qty)} ${item.base_unit}`}
            trailing={
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] active:bg-[var(--sb-surface-muted)]"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleBasket(item);
                }}
                aria-label={selected ? `Remove ${item.item_code} from PR preparation` : `Add ${item.item_code} to PR preparation`}
              >
                {selected ? <Trash2 className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              </button>
            }
          />
        );
      })}
      {!rows.length ? <div className="px-3 py-3 text-center text-xs text-muted-foreground">No stock balance rows.</div> : null}
    </>
  );
}
