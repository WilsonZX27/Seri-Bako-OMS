export const outletDailyStatusOptions = [
  { value: "in_progress", label: "In progress" },
  { value: "ready_to_post", label: "Ready to post" },
  { value: "posted", label: "Posted" },
  { value: "attention", label: "Attention" },
  { value: "void", label: "Void" },
];

export function outletProgress(row: { status: string; sales_review_status?: string | null }) {
  const status = row.status === "reviewed"
    ? row.sales_review_status === "needs_review" ? "attention" : "posted"
    : row.status === "evening_completed" ? "ready_to_post"
    : row.status === "void" ? "void" : "in_progress";
  return { status, label: outletDailyStatusOptions.find((option) => option.value === status)!.label };
}
