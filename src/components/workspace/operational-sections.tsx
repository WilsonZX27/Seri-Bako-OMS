import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

type Metric = { label: string; value: string | number; href: string; unavailable?: boolean };
export function OperationalOverview({id,title,action,metrics}:{id:string;title:string;action?:{href:string;label:string};metrics:Metric[]}) {
 if (!metrics.length) return null;
 return <section className="hidden overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-green-900)] bg-card md:block" aria-labelledby={id}>
  <div className="flex items-end justify-between gap-3 bg-[var(--sb-green-900)] px-4 py-3 text-white"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Today at a glance</p><h2 id={id} className="mt-1 text-sm font-semibold">{title}</h2></div>{action?<Link href={action.href} className="text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">{action.label}</Link>:null}</div>
  <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">{metrics.map(metric=><Link key={metric.label} href={metric.href} className="group flex min-h-16 items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--sb-green-100)] sm:min-h-20 sm:px-4 sm:py-3"><span className="text-xs text-muted-foreground group-hover:text-[var(--sb-green-900)]">{metric.label}</span><strong className={`font-mono text-lg sm:text-xl ${metric.unavailable?"text-[var(--sb-warning)]":"text-[var(--sb-green-900)]"}`}>{metric.value}</strong></Link>)}</div>
 </section>;
}
export function OperationalActionGrid({id,title,items}:{id:string;title:string;items:ReadonlyArray<{href:string;label:string;icon:LucideIcon;description?:string}>}) {
 if (!items.length) return null;
 return <section className="hidden overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card md:block" aria-labelledby={id}><div className="border-b px-4 py-3"><h2 id={id} className="text-sm font-semibold">{title}</h2></div><div className="grid sm:grid-cols-2">{items.map(({href,label,icon:Icon,description})=><Link key={href} href={href} title={description} className="flex min-h-12 items-center gap-3 border-b px-4 py-3 hover:bg-secondary/40 sm:border-r"><Icon className="h-4 w-4 text-primary" aria-hidden="true"/><span className="flex-1 text-sm font-semibold">{label}</span><ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true"/></Link>)}</div></section>;
}
