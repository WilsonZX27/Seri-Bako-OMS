import { formatNumber, formatQuantity } from "@/lib/utils";

export type OperationalValue = { value: string; detail?: string; warning?: boolean; title?: string };
export type DailyMetricRow = {
  total_received: number | null;
  received_pending_lines: number;
  received_zero_with_sent: boolean;
  total_wastage: number;
  wastage_percent: number | null;
  status: string;
};

export function receivedDisplay(row: DailyMetricRow): OperationalValue {
  if (row.total_received === null) return row.received_pending_lines > 0
    ? { value: "Pending", detail: `${row.received_pending_lines} line${row.received_pending_lines === 1 ? "" : "s"}`, warning: true, title: `${row.received_pending_lines} food line${row.received_pending_lines === 1 ? "" : "s"} still need a Received value` }
    : { value: "Unavailable", warning: true };
  if (row.received_zero_with_sent) return { value: "0 · verify", warning: true, title: "Qty sent is recorded but no receipt quantity has been confirmed" };
  return { value: formatNumber(row.total_received) };
}

export function wastageDisplay(row: DailyMetricRow): OperationalValue {
  return {
    value: formatQuantity(row.total_wastage),
    detail: !["evening_completed", "reviewed"].includes(row.status) ? "Not final"
      : row.wastage_percent === null ? row.received_pending_lines > 0 ? "Pending receipt" : "—"
      : `${new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(row.wastage_percent)}% rate`,
  };
}

/** Compact cards show a final quantity or a single honest pending state. */
export function compactWastageDisplay(row: DailyMetricRow): OperationalValue {
  const display = wastageDisplay(row);
  if (display.detail === "Not final") return { value: "Not final", title: `Draft wastage: ${display.value}; not final` };
  return { value: display.value, title: display.detail === "—" ? undefined : display.detail };
}

export function supplierDisplay(request: { supplier_state: string; supplier_names: string[] }) {
  switch (request.supplier_state) {
    case "assigned": return request.supplier_names.join(", ");
    case "assignment_required": return "Supplier assignment required";
    case "details_unavailable": return "Supplier details unavailable";
    case "no_lines": return "—";
    default: return "Supplier details unavailable";
  }
}
