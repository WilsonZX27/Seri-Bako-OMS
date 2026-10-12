"use client";
import { useRouter } from "next/navigation";
import { InteractiveLineChart } from "@/components/ui/interactive-line-chart";
import { formatDateOnly } from "@/lib/utils";

export function AssetHistoryTrend({ points, kind }: { points: { date: string; count: number | null; checked?: number }[]; kind: "maintenance" | "checklist" }) {
  const router = useRouter();
  return <div className="h-[200px] min-w-0 [&_svg]:min-h-0"><InteractiveLineChart width={700} height={200} inset={{ top: 20, right: 20, bottom: 35, left: 35 }} maximum={Math.max(1, ...points.map(point => point.count ?? 0))} ariaLabel={kind === "maintenance" ? "Recorded maintenance requests by day" : "Recorded asset exceptions by day"} maximumFractionDigits={0} tone={kind === "checklist" ? "danger" : "primary"} points={points.map(point => ({ id: point.date, label: formatDateOnly(point.date), value: point.count, previewValue: point.count === null ? "No checks recorded" : `${point.count} ${kind === "maintenance" ? "requests" : "exceptions"}`, previewDetails: kind === "checklist" ? [`${point.checked ?? 0} asset checks recorded`] : ["Select to open requests"] }))} onSelectPoint={date => router.push(`/asset-management?view=${kind}&date=${date}`)}/></div>;
}
