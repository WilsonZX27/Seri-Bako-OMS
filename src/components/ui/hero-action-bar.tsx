import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type HeroAction = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

export function HeroActionBar({
  eyebrow,
  title,
  description,
  actions = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: HeroAction[];
}) {
  return (
    <section className="sb-hero-action-bar" aria-labelledby="hero-action-title">
      <div className="min-w-0">
        <p id="hero-action-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">{eyebrow}</p>
        <p className="mt-1 text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-white/70">{description}</p>
      </div>
      {actions.length ? <div className="sb-hero-action-bar__actions">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return <Button key={action.href} asChild size="sm" variant={index === 0 ? "secondary" : "ghost"} className={index === 0 ? "bg-white text-[var(--sb-green-950)] hover:bg-white/90" : "text-white hover:bg-white/10 hover:text-white"}><Link href={action.href}>{Icon ? <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" /> : null}{action.label}</Link></Button>;
        })}
      </div> : null}
    </section>
  );
}
