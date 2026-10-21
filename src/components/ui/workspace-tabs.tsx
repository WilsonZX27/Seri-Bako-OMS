import Link from "next/link";
import { WorkspaceTabsScroll } from "@/components/ui/workspace-tabs-scroll";
import { IntentPrefetchLink } from "@/components/ui/intent-prefetch-link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceTab = { id: string; href: string; label: string; icon: LucideIcon };

export function WorkspaceTabs({ label, current, items, className, onNavigate, prefetchOnIntent = false }: { label: string; current: string; items: WorkspaceTab[]; className?: string; compact?: boolean; prefetchOnIntent?: boolean; onNavigate?:(href:string)=>void }) {
  const TabLink = prefetchOnIntent ? IntentPrefetchLink : Link;
  return <nav aria-label={label} className={cn("sb-workspace-tabs sb-work-surface grid min-w-0 gap-1 overflow-x-auto p-1", className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(max-content, 1fr))` }}>
    <WorkspaceTabsScroll current={current} />
    {items.map(({ id, href, label: text, icon: Icon }) => <TabLink key={id} href={href} onClick={onNavigate?event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onNavigate(href);}:undefined} prefetch={false} aria-current={id === current ? "page" : undefined} className={cn("h-11 min-h-11", "inline-flex min-w-0 items-center justify-center gap-2 rounded-[var(--sb-radius-control)] px-3 text-xs font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-xs", id === current ? "bg-[var(--sb-green-100)] text-[var(--sb-green-900)] shadow-[inset_0_0_0_1px_var(--sb-green-200)]" : "text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-text)]")}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="whitespace-nowrap">{text}</span>
    </TabLink>)}
  </nav>;
}
