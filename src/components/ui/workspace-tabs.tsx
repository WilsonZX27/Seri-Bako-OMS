import Link from "next/link";
import { IntentPrefetchLink } from "@/components/ui/intent-prefetch-link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceTab = { id: string; href: string; label: string; icon: LucideIcon };

export function WorkspaceTabs({ label, current, items, compact = false, onNavigate, prefetchOnIntent = false }: { label: string; current: string; items: WorkspaceTab[]; compact?: boolean; prefetchOnIntent?: boolean; onNavigate?:(href:string)=>void }) {
  const TabLink = prefetchOnIntent ? IntentPrefetchLink : Link;
  return <nav aria-label={label} className="sb-work-surface grid min-w-0 gap-1 overflow-x-auto p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map(({ id, href, label: text, icon: Icon }) => <TabLink key={id} href={href} onClick={onNavigate?event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();onNavigate(href);}:undefined} prefetch={false} aria-current={id === current ? "page" : undefined} className={cn(compact ? "h-9 sm:h-8" : "h-11", "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-[var(--sb-radius-control)] px-2 text-[11px] font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-xs", id === current ? "bg-[var(--sb-green-100)] text-[var(--sb-green-900)] shadow-[inset_0_0_0_1px_var(--sb-green-200)]" : "text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-text)]")}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>{text}</span>
    </TabLink>)}
  </nav>;
}
