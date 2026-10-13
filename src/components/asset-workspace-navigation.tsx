"use client";

import { useEffect, useRef } from "react";
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
  const strip = useRef<HTMLElement>(null);
  const items = tabs.filter(tab => managementRole || (tab.id === "maintenance" && canReport) || !["overview","maintenance"].includes(tab.id));
  useEffect(() => {
    const nav=strip.current;
    if(!nav) return;
    const revealCurrent=() => {
      const selected=nav.querySelector<HTMLElement>('[aria-current="page"]');
      if(selected && nav.clientWidth) nav.scrollLeft=selected.offsetLeft-(nav.clientWidth-selected.offsetWidth)/2;
    };
    revealCurrent();
    const observer=new ResizeObserver(revealCurrent);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [current]);
  return <>
    <nav ref={strip} aria-label="Asset workspace" className="sb-work-surface relative flex gap-1 overflow-x-auto p-1 md:hidden">
      {items.map(({id,label,icon:Icon}) => <a key={id} href={`/asset-management?view=${id}`} aria-current={current===id ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--sb-radius-control)] px-3 text-xs font-semibold transition-colors ${current===id ? "bg-[var(--sb-green-100)] text-[var(--sb-green-900)]" : "text-muted-foreground hover:bg-muted"}`}><Icon className="size-4" aria-hidden="true"/>{label}</a>)}
    </nav>
    <div className="hidden md:block"><WorkspaceTabs onNavigate={(href) => window.location.assign(href)} label="Asset Management workspace" current={current} items={items.map(tab=>({...tab,href:`/asset-management?view=${tab.id}`}))}/></div>
  </>;
}
