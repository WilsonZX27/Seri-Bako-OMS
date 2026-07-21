"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";

type StockBalanceRow = {
  item_id: string;
  item_code: string;
  item_name: string;
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

function statusVariant(status: string) {
  if (status === "negative") return "danger";
  if (status === "low_stock") return "warning";
  return "success";
}

function formatLedgerHref(itemId: string, branchId: string | null) {
  return `/stock-transactions?item_id=${itemId}&branch_id=${branchId ?? ""}`;
}

export function StockBalanceTableRows({ rows }: { rows: StockBalanceRow[] }) {
  const router = useRouter();

  useEffect(() => {
    const body = document.querySelector<HTMLTableSectionElement>('tbody[data-stock-balance-table]');
    if (!body) return;

    const handlePointerDown = (event: PointerEvent) => {
      const row = (event.target as HTMLElement | null)?.closest?.('tr[data-href]') as HTMLElement | null;
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
        return (
          <TableRow
            key={`${item.item_id}-${item.branch_id}`}
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
            <TableCell className="text-right">{formatNumber(item.available_qty)} {item.base_unit}</TableCell>
            <TableCell className="text-right">{formatNumber(item.reserved_qty)} {item.base_unit}</TableCell>
            <TableCell className="text-right font-medium">{formatNumber(item.current_qty)} {item.base_unit}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.average_cost)}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.inventory_value)}</TableCell>
            <TableCell>{item.last_movement ?? "-"}</TableCell>
            <TableCell><Badge variant={statusVariant(item.status)}>{item.status.replaceAll("_", " ")}</Badge></TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
}
