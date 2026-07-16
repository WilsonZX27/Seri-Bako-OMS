import { isMockMode, mockBranches, mockProducts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { paginateRows } from "@/lib/table-state";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type RecordRow = Database["public"]["Tables"]["outlet_daily_records"]["Row"];
type LineRow = Database["public"]["Tables"]["outlet_daily_record_lines"]["Row"];

export type OutletDailyRecordRow = RecordRow & {
  branch_name: string;
  submitted_by_name: string | null;
  total_received: number;
  total_leftover: number;
  total_wastage: number;
  wastage_percent: number;
};

const todayInKualaLumpur = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const totals = (lines: LineRow[]) => {
  const totalReceived = lines.reduce((sum, line) => sum + Number(line.morning_received_qty), 0);
  const totalLeftover = lines.reduce((sum, line) => sum + Number(line.evening_leftover_qty), 0);
  const totalWastage = lines.reduce((sum, line) => sum + Number(line.wastage_qty), 0);
  return {
    total_received: totalReceived,
    total_leftover: totalLeftover,
    total_wastage: totalWastage,
    wastage_percent: totalReceived > 0 ? (totalWastage / totalReceived) * 100 : 0,
  };
};

export async function getOutletDailyFormOptions() {
  if (isMockMode()) return {
    branches: mockBranches.filter((row) => row.status === "active"),
    products: mockProducts.filter((row) => row.status === "active"),
  };
  const db = await createClient();
  const profile = await getCurrentProfile();
  const canViewAll = await hasPermission("outlet_daily_record.view_all");
  const [{ data: branches, error: branchError }, { data: products, error: productError }] = await Promise.all([
    db.from("branches").select("id,branch_code,branch_name,branch_type,status,default_location_id").eq("status", "active").is("deleted_at", null).order("branch_name"),
    db.from("products").select("id,product_code,product_name,category,selling_unit,status").eq("status", "active").order("product_name"),
  ]);
  if (branchError) throw new Error(branchError.message);
  if (productError) throw new Error(productError.message);
  if (canViewAll) return { branches: branches ?? [], products: products ?? [] };
  const { data: assignments, error } = await db.from("staff_branches").select("branch_id").eq("staff_id", profile?.id ?? "");
  if (error) throw new Error(error.message);
  const defaultBranchId = profile && "default_branch_id" in profile ? profile.default_branch_id : null;
  const allowed = new Set([defaultBranchId, ...(assignments ?? []).map((row) => row.branch_id)].filter(Boolean));
  return { branches: (branches ?? []).filter((row) => allowed.has(row.id)), products: products ?? [] };
}

async function loadRows() {
  if (isMockMode()) return [] as OutletDailyRecordRow[];
  const db = await createClient();
  const [{ data, error }, { data: lines }, { data: branches }, { data: staffs }] = await Promise.all([
    db.from("outlet_daily_records").select("*").order("record_date", { ascending: false }).order("updated_at", { ascending: false }),
    db.from("outlet_daily_record_lines").select("*"),
    db.from("branches").select("id,branch_name"),
    db.from("staffs").select("id,full_name"),
  ]);
  if (error) throw new Error(error.message);
  const branchNames = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const staffNames = new Map((staffs ?? []).map((row) => [row.id, row.full_name]));
  return ((data ?? []) as RecordRow[]).map((record) => ({
    ...record,
    branch_name: branchNames.get(record.branch_id) ?? "Unknown outlet",
    submitted_by_name: record.submitted_by ? staffNames.get(record.submitted_by) ?? null : null,
    ...totals(((lines ?? []) as LineRow[]).filter((line) => line.record_id === record.id)),
  }));
}

export async function getOutletDailyRecords(filters: Filters = {}) {
  const allRows = await loadRows();
  const rows = allRows.filter((row) =>
    (!filters.date || row.record_date === filters.date)
    && (!filters.branch || filters.branch === "all" || row.branch_id === filters.branch)
    && (!filters.status || filters.status === "all" || row.status === filters.status));
  const today = todayInKualaLumpur();
  const todayRows = allRows.filter((row) => row.record_date === today && row.status !== "void");
  return {
    ...paginateRows(rows, filters.page, 15),
    summary: {
      today,
      today_records: todayRows.length,
      today_received: todayRows.reduce((sum, row) => sum + row.total_received, 0),
      missing_evening: todayRows.filter((row) => ["draft", "morning_recorded"].includes(row.status)).length,
      needs_review: allRows.filter((row) => row.status === "evening_completed").length,
    },
  };
}

export async function getOutletDailyRecord(id: string) {
  if (isMockMode()) throw new Error("Outlet daily records require migration 064.");
  const db = await createClient();
  const [{ data: record, error }, { data: lines, error: linesError }, { data: branches }, { data: products }, { data: staffs }] = await Promise.all([
    db.from("outlet_daily_records").select("*").eq("id", id).single(),
    db.from("outlet_daily_record_lines").select("*").eq("record_id", id),
    db.from("branches").select("id,branch_name"),
    db.from("products").select("id,product_code,product_name,category,selling_unit,status"),
    db.from("staffs").select("id,full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const typedRecord = record as RecordRow;
  const typedLines = (lines ?? []) as LineRow[];
  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  return {
    record: {
      ...typedRecord,
      branch_name: branches?.find((branch) => branch.id === typedRecord.branch_id)?.branch_name ?? "Unknown outlet",
      submitted_by_name: staffs?.find((staff) => staff.id === typedRecord.submitted_by)?.full_name ?? null,
      reviewed_by_name: staffs?.find((staff) => staff.id === typedRecord.reviewed_by)?.full_name ?? null,
      ...totals(typedLines),
    },
    lines: typedLines.map((line) => ({ ...line, product: productMap.get(line.product_id) })),
  };
}
