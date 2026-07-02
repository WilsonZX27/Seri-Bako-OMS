import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FileDigit,
  PackageCheck,
  Plus,
  ShoppingCart,
  Truck,
  Upload,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type ProcurementTheme = {
  panel: string;
  header: string;
  border: string;
  badge: string;
  tag: string;
  iconText: string;
};

type ProcurementAction = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  recommendedFor: string;
};

type ProcurementSection = {
  title: string;
  description: string;
  icon: LucideIcon;
  theme: ProcurementTheme;
  actions: ProcurementAction[];
};

const themes = {
  green: {
    panel: "bg-emerald-50/35",
    header: "bg-emerald-50/70",
    border: "border-emerald-100",
    badge: "bg-emerald-100",
    tag: "bg-emerald-100 text-emerald-800",
    iconText: "text-emerald-700",
  },
  blue: {
    panel: "bg-blue-50/35",
    header: "bg-blue-50/75",
    border: "border-blue-100",
    badge: "bg-blue-100",
    tag: "bg-blue-100 text-blue-800",
    iconText: "text-blue-700",
  },
  amber: {
    panel: "bg-amber-50/35",
    header: "bg-amber-50/75",
    border: "border-amber-100",
    badge: "bg-amber-100",
    tag: "bg-amber-100 text-amber-800",
    iconText: "text-amber-700",
  },
  purple: {
    panel: "bg-purple-50/35",
    header: "bg-purple-50/75",
    border: "border-purple-100",
    badge: "bg-purple-100",
    tag: "bg-purple-100 text-purple-800",
    iconText: "text-purple-700",
  },
} satisfies Record<string, ProcurementTheme>;

const procurementSections: ProcurementSection[] = [
  {
    title: "Requesting",
    description: "Raise branch purchase needs before purchasing turns them into supplier orders.",
    icon: ClipboardList,
    theme: themes.green,
    actions: [
      {
        href: "/purchase-requests",
        title: "Purchase Requests",
        description: "Create, review, and convert branch purchase requests.",
        icon: ClipboardList,
        recommendedFor: "kitchen and purchasing",
      },
      {
        href: "/purchase-requests/new",
        title: "Create PR",
        description: "Start a new branch-first request with item lines and needed-by date.",
        icon: Plus,
        recommendedFor: "all operations",
      },
    ],
  },
  {
    title: "Receiving",
    description: "Record goods received against purchase orders and post stock safely.",
    icon: PackageCheck,
    theme: themes.blue,
    actions: [
      {
        href: "/goods-receivings",
        title: "Goods Receiving",
        description: "Create and post GRNs from approved or sent purchase orders.",
        icon: PackageCheck,
        recommendedFor: "receiving",
      },
    ],
  },
  {
    title: "Ordering",
    description: "Prepare and monitor supplier orders after requests are approved.",
    icon: ShoppingCart,
    theme: themes.amber,
    actions: [
      {
        href: "/purchase-orders",
        title: "Purchase Orders",
        description: "Prepare supplier orders and follow approval status.",
        icon: ShoppingCart,
        recommendedFor: "purchasing",
      },
    ],
  },
  {
    title: "Supplier Master Data",
    description: "Maintain supplier records and supplier item costing used by purchase orders.",
    icon: Users,
    theme: themes.purple,
    actions: [
      {
        href: "/suppliers",
        title: "Suppliers",
        description: "Maintain supplier records, contacts, and terms.",
        icon: Truck,
        recommendedFor: "purchasing",
      },
      {
        href: "/supplier-items",
        title: "Supplier Items",
        description: "Supplier-specific item codes, costs, UOM, MOQ, and lead times.",
        icon: FileDigit,
        recommendedFor: "purchasing",
      },
      {
        href: "/imports/supplier-items",
        title: "Import Supplier Items",
        description: "Upload supplier pricing and item references with preview validation.",
        icon: Upload,
        recommendedFor: "admin and purchasing",
      },
    ],
  },
];

const quickInsights = [
  { label: "PRs Awaiting Approval", value: 0, icon: ClipboardList, className: "bg-blue-50 text-blue-800 border-blue-100" },
  { label: "POs Awaiting Delivery", value: 0, icon: ShoppingCart, className: "bg-amber-50 text-amber-800 border-amber-100" },
  { label: "GRNs Today", value: 0, icon: PackageCheck, className: "bg-emerald-50 text-emerald-800 border-emerald-100" },
  { label: "Low Stock Items", value: 0, icon: AlertTriangle, className: "bg-red-50 text-red-800 border-red-100" },
];

function ProcurementSectionCard({ section }: { section: ProcurementSection }) {
  const SectionIcon = section.icon;

  return (
    <section className={cn("overflow-hidden rounded-xl border shadow-sm", section.theme.border, section.theme.panel)}>
      <div className={cn("border-b px-5 py-5", section.theme.border, section.theme.header)}>
        <div className="flex items-center gap-4">
          <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", section.theme.badge, section.theme.iconText)}>
            <SectionIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-normal text-foreground">{section.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>
          </div>
        </div>
      </div>
      <div className="grid items-stretch gap-4 p-4 md:grid-cols-2">
        {section.actions.map((action) => (
          <ProcurementActionCard key={action.href} action={action} theme={section.theme} />
        ))}
      </div>
    </section>
  );
}

function ProcurementActionCard({ action, theme }: { action: ProcurementAction; theme: ProcurementTheme }) {
  const ActionIcon = action.icon;

  return (
    <Link href={action.href} className="group block h-full">
      <Card className={cn("h-full border bg-white/90 shadow-sm transition-colors group-hover:border-primary/30 group-hover:bg-white", theme.border)}>
        <CardContent className="flex h-full flex-col gap-5 p-5">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", theme.badge, theme.iconText)}>
              <ActionIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{action.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.description}</p>
            </div>
          </div>
          <div className="mt-auto">
            <Badge className={cn("rounded-full", theme.tag)}>Recommended for {action.recommendedFor}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ProcurementPage() {
  return (
    <>
      <PageHeader title="Procurement" description="Supplier, purchasing, and receiving work grouped in one place." action={{ href: "/purchase-requests/new", label: "Create PR" }} />
      <div className="space-y-5 bg-background p-5">
        <div className="grid gap-5 xl:grid-cols-2">
          {procurementSections.map((section) => (
            <ProcurementSectionCard key={section.title} section={section} />
          ))}
        </div>

        <Card className="border bg-card shadow-sm">
          <CardContent className="grid gap-4 p-5 xl:grid-cols-[180px_1fr_auto] xl:items-center">
            <div>
              <p className="text-sm font-semibold">Quick Insights</p>
              <p className="mt-1 text-xs text-muted-foreground">Safe summary placeholders until live metrics are wired.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickInsights.map((insight) => {
                const InsightIcon = insight.icon;
                return (
                  <div key={insight.label} className={cn("flex items-center gap-3 rounded-lg border p-3", insight.className)}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
                      <InsightIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none">{insight.value}</p>
                      <p className="mt-1 text-xs font-medium">{insight.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/reports" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium hover:bg-secondary">
              View all reports
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
