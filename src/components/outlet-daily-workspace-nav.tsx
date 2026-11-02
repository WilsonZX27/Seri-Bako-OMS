import { ClipboardList, ChartNoAxesCombined, Truck, Settings } from "lucide-react";
import { WorkspaceTabs } from "@/components/ui/workspace-tabs";

export function OutletDailyWorkspaceNav({ current }: { current: "records" | "insights" | "deliveries" | "settings" }) {
  return <WorkspaceTabs prefetchOnIntent className="sb-outlet-daily-workspace-tabs" label="Outlet Daily Records workspace" current={current} items={[
    { id: "records", href: "/outlet-daily-records", label: "Daily Records", icon: ClipboardList },
    { id: "insights", href: "/outlet-daily-records/insights", label: "Insights", icon: ChartNoAxesCombined },
    { id: "deliveries", href: "/outlet-daily-records/delivery-orders", label: "Delivery Orders", icon: Truck },
    { id: "settings", href: "/outlet-daily-records/settings", label: "Settings", icon: Settings },
  ]} />;
}
