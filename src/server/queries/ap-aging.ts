import { createClient } from "@/lib/supabase/server";

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
  if (error) throw new Error(error.message);
  return data as unknown as ApAgingReport;
}

export async function getPayablesAttention() {
  const report = await getApAgingReport();
  return { ...report.attention, report_date: report.report_date, timezone: report.timezone };
}
