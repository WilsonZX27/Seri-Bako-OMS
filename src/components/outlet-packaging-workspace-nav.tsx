"use client";
import { usePathname } from "next/navigation";
import { Package, Settings } from "lucide-react";
import { WorkspaceTabs } from "@/components/ui/workspace-tabs";
export function PackagingWorkspaceTabs({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();
  return <WorkspaceTabs label="Packaging workspace" current={pathname.startsWith("/outlet-packaging/stores") ? "settings" : "balances"} items={[
    {id:"balances",href:"/outlet-packaging",label:"Balances",icon:Package},
    ...(canManage ? [{id:"settings",href:"/outlet-packaging/stores",label:"Settings",icon:Settings}] : []),
  ]} />;
}
