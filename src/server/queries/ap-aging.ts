import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/server/observability/logger";

function isApAgingReport(value: unknown): value is ApAgingReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<ApAgingReport>;
  return typeof report.report_date === "string"
    && typeof report.timezone === "string"
    && typeof report.currency === "string"
    && Number.isFinite(report.page)
    && Number.isFinite(report.page_size)
    && Number.isFinite(report.total_rows)
    && Array.isArray(report.rows)
    && Array.isArray(report.suppliers)
    && Boolean(report.buckets && typeof report.buckets === "object")
    && Boolean(report.summary && typeof report.summary === "object")
    && Boolean(report.attention && typeof report.attention === "object");
}

export type ApAgingRow = {
  id: string;
  invoice_no: string;
  supplier_invoice_no: string;
  supplier_id: string;
  supplier_name: string;
  invoice_date: string;
  due_date: string | null;
  days_overdue: number;
  days_until_due: number;
  original_total: number;
  amount_paid: number;
  outstanding: number;
  aging_bucket: string;
  status: string;
  currency: string;
  alert_severity: "data_quality" | "critical" | "overdue" | "due_today" | "due_soon" | null;
  alert_label: string | null;
  alert_priority: number | null;
};

export type ApSupplierExposure = {
  supplier_id: string;
  supplier_name: string;
  invoice_count: number;
  total_outstanding: number;
  overdue_outstanding: number;
  oldest_due_date: string | null;
  maximum_days_overdue: number;
};

export type ApAgingReport = {
  report_date: string;
  timezone: string;
  currency: string;
  page: number;
  page_size: number;
  total_rows: number;
  rows: ApAgingRow[];
  suppliers: ApSupplierExposure[];
  buckets: Record<string, { invoice_count: number; outstanding: number }>;
  attention: {
    total_attention_amount: number;
    critical_count: number;
    critical_amount: number;
    overdue_count: number;
    overdue_amount: number;
    due_today_count: number;
    due_today_amount: number;
    due_next_7_count: number;
    due_next_7_amount: number;
    missing_due_date_count: number;
    highest_exposure_supplier: string | null;
    oldest_overdue_invoice: string | null;
    rows: ApAgingRow[];
  };
  summary: {
    total_outstanding: number;
    total_overdue: number;
    due_today: number;
    due_next_7_days: number;
    overdue_90_plus: number;
    supplier_count: number;
    oldest_overdue_invoice: string | null;
    highest_exposure_supplier: string | null;
  };
};

export type CashFlowForecastPeriod = "7" | "14" | "30" | "month";

export type CashFlowForecastRow = ApAgingRow & {
  forecast_state: "overdue" | "due_today" | "upcoming" | "missing_due_date";
};

export type CashFlowForecast = {
  report_date: string;
  period: CashFlowForecastPeriod;
  period_end: string;
  timezone: string;
  currency: string;
  total_due_in_period: number;
  overdue_brought_forward: number;
  due_today: number;
  due_this_week: number;
  due_next_week: number;
  missing_due_date_exposure: number;
  windows: Array<{
    key: "overdue" | "due_today" | "due_1_7" | "due_8_14" | "due_15_period_end" | "missing_due_date";
    amount: number;
    invoice_count: number;
  }>;
  top_suppliers: Array<{ supplier_id: string; supplier_name: string; invoice_count: number; amount: number }>;
  rows: CashFlowForecastRow[];
  page: number;
  page_size: number;
  total_rows: number;
};

export async function getApAgingReport(filters: Record<string, string | undefined> = {}, exportAll = false) {
  const db = await createClient();
  const { data, error } = await db.rpc("get_ap_aging_report", {
    p_search: filters.search?.trim() || null,
    p_supplier_id: filters.supplier && filters.supplier !== "all" ? filters.supplier : null,
    p_bucket: filters.bucket && filters.bucket !== "all" ? filters.bucket : null,
    p_status: filters.status && filters.status !== "all" ? filters.status : null,
    p_due_from: filters.due_from || null,
    p_due_to: filters.due_to || null,
    p_overdue_only: filters.overdue === "1",
    p_page: Math.max(Number(filters.page) || 1, 1),
    p_page_size: exportAll ? 10000 : 20,
  });
  if (error) {
    logServerError(error, { source: "ap-aging.getApAgingReport" });
    throw new Error("AP Aging report is unavailable.");
  }
  if (!isApAgingReport(data)) {
    logServerError(new Error("AP Aging RPC returned an incomplete payload."), { source: "ap-aging.getApAgingReport" });
    throw new Error("AP Aging report is unavailable.");
  }
  return data;
}

export async function getCompleteApAgingReport(filters: Record<string, string | undefined> = {}, options: { maxRows?: number } = {}) {
  const maxRows = options.maxRows ?? Number.POSITIVE_INFINITY;
  const report = await getApAgingReport({ ...filters, page: "1" }, true);
  if (report.total_rows > maxRows) throw new Error("The AP Aging export is too large. Narrow the filters and try again.");
  const rows = [...report.rows];
  for (let page = 2; rows.length < report.total_rows; page += 1) {
    const next = await getApAgingReport({ ...filters, page: String(page) }, true);
    if (!next.rows.length) break;
    if (rows.length + next.rows.length > maxRows) throw new Error("The AP Aging export is too large. Narrow the filters and try again.");
    rows.push(...next.rows);
  }
  return { ...report, page: 1, rows };
}

const shiftDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const monthEnd = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
};

const total = (rows: ApAgingRow[]) => Math.round(rows.reduce((sum, row) => sum + Number(row.outstanding), 0) * 100) / 100;

export async function getCashFlowForecast(requestedPeriod?: string, requestedPage?: string): Promise<CashFlowForecast> {
  const period: CashFlowForecastPeriod = ["7", "14", "30", "month"].includes(requestedPeriod ?? "")
    ? requestedPeriod as CashFlowForecastPeriod
    : "30";
  const report = await getCompleteApAgingReport();
  const periodEnd = period === "month" ? monthEnd(report.report_date) : shiftDate(report.report_date, Number(period));
  const weekEnd = shiftDate(report.report_date, 7);
  const nextWeekEnd = shiftDate(report.report_date, 14);
  const withDueDate = report.rows.filter((row) => row.due_date);
  const overdue = withDueDate.filter((row) => row.due_date! < report.report_date);
  const dueInPeriod = withDueDate.filter((row) => row.due_date! >= report.report_date && row.due_date! <= periodEnd);
  const dueToday = withDueDate.filter((row) => row.due_date === report.report_date);
  const dueThisWeek = withDueDate.filter((row) => row.due_date! >= report.report_date && row.due_date! <= weekEnd);
  const dueNextWeek = withDueDate.filter((row) => row.due_date! > weekEnd && row.due_date! <= nextWeekEnd);
  const dueOneToSeven = withDueDate.filter((row) => row.due_date! > report.report_date && row.due_date! <= weekEnd && row.due_date! <= periodEnd);
  const dueEightToFourteen = withDueDate.filter((row) => row.due_date! > weekEnd && row.due_date! <= nextWeekEnd && row.due_date! <= periodEnd);
  const dueFifteenToPeriodEnd = withDueDate.filter((row) => row.due_date! > nextWeekEnd && row.due_date! <= periodEnd);
  const missingDueDate = report.rows.filter((row) => !row.due_date);

  const supplierTotals = new Map<string, { supplier_id: string; supplier_name: string; invoice_count: number; amount: number }>();
  for (const row of dueInPeriod) {
    const current = supplierTotals.get(row.supplier_id) ?? { supplier_id: row.supplier_id, supplier_name: row.supplier_name, invoice_count: 0, amount: 0 };
    current.invoice_count += 1;
    current.amount += Number(row.outstanding);
    supplierTotals.set(row.supplier_id, current);
  }
  const topSuppliers = [...supplierTotals.values()]
    .map((row) => ({ ...row, amount: Math.round(row.amount * 100) / 100 }))
    .sort((left, right) => right.amount - left.amount || left.supplier_name.localeCompare(right.supplier_name))
    .slice(0, 5);

  const relevantRows: CashFlowForecastRow[] = report.rows
    .filter((row) => !row.due_date || row.due_date <= periodEnd)
    .map((row): CashFlowForecastRow => ({
      ...row,
      forecast_state: !row.due_date ? "missing_due_date" : row.due_date < report.report_date ? "overdue" : row.due_date === report.report_date ? "due_today" : "upcoming",
    }))
    .sort((left, right) => {
      if (!left.due_date && !right.due_date) return left.invoice_no.localeCompare(right.invoice_no);
      if (!left.due_date) return 1;
      if (!right.due_date) return -1;
      return left.due_date.localeCompare(right.due_date) || right.outstanding - left.outstanding;
    });
  const pageSize = 20;
  const page = Math.min(Math.max(Number(requestedPage) || 1, 1), Math.max(Math.ceil(relevantRows.length / pageSize), 1));

  return {
    report_date: report.report_date,
    period,
    period_end: periodEnd,
    timezone: report.timezone,
    currency: report.currency,
    total_due_in_period: total(dueInPeriod),
    overdue_brought_forward: total(overdue),
    due_today: total(dueToday),
    due_this_week: total(dueThisWeek),
    due_next_week: total(dueNextWeek),
    missing_due_date_exposure: total(missingDueDate),
    windows: [
      { key: "overdue", amount: total(overdue), invoice_count: overdue.length },
      { key: "due_today", amount: total(dueToday), invoice_count: dueToday.length },
      { key: "due_1_7", amount: total(dueOneToSeven), invoice_count: dueOneToSeven.length },
      { key: "due_8_14", amount: total(dueEightToFourteen), invoice_count: dueEightToFourteen.length },
      { key: "due_15_period_end", amount: total(dueFifteenToPeriodEnd), invoice_count: dueFifteenToPeriodEnd.length },
      { key: "missing_due_date", amount: total(missingDueDate), invoice_count: missingDueDate.length },
    ],
    top_suppliers: topSuppliers,
    rows: relevantRows.slice((page - 1) * pageSize, page * pageSize),
    page,
    page_size: pageSize,
    total_rows: relevantRows.length,
  };
}

export async function getPayablesAttention() {
  const db = await createClient();
  type PayablesAttention = Omit<
    ApAgingReport["attention"],
    "highest_exposure_supplier" | "oldest_overdue_invoice" | "rows"
  > & { report_date: string; timezone: string };
  // Keep the Supabase client method bound to its instance. Detaching `db.rpc`
  // loses the internal PostgREST client (`this.rest`) and turns a healthy
  // read-only RPC into the generic dashboard "unavailable" state.
  const { data, error } = await db.rpc("get_payables_attention_summary" as never) as {
    data: PayablesAttention | null;
    error: { message: string } | null;
  };

  if (error) throw error;
  if (!data) throw new Error("Payables attention summary is unavailable.");

  return data;
}
