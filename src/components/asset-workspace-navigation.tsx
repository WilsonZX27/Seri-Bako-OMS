"use client";

import { Box, ChartNoAxesColumn, ClipboardCheck, Wrench, ArrowLeftRight } from "lucide-react";
import { WorkspaceTabs } from "@/components/ui/workspace-tabs";

const tabs = [
  { id: "overview", label: "Overview", icon: ChartNoAxesColumn },
  { id: "assets", label: "Assets", icon: Box },
  { id: "checklist", label: "Daily Checklist", icon: ClipboardCheck },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
];

export function AssetWorkspaceNavigation({current, managementRole, canReport=false}: {current:string; managementRole:boolean; canReport?:boolean}) {
  const items = tabs.filter(tab => managementRole || (tab.id === "maintenance" && canReport) || !["overview","maintenance"].includes(tab.id));
  return <div data-asset-workspace-navigation>
    <WorkspaceTabs onNavigate={(href) => window.location.assign(href)} label="Asset Management workspace" current={current} items={items.map(tab=>({...tab,href:`/asset-management?view=${tab.id}`}))}/>
  </div>;
}
