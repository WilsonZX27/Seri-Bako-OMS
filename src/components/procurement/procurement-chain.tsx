import Link from "next/link";
import { ArrowRight, FileText, PackageCheck, ReceiptText, ShoppingCart } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ProcurementChainNode } from "@/server/queries/procurement";

const icons = { PR: FileText, PO: ShoppingCart, GRN: PackageCheck, Invoice: ReceiptText };

export function ProcurementChain({ nodes }: { nodes: ProcurementChainNode[] }) {
  return (
    <section aria-labelledby="purchase-chain-title" className="document-surface rounded-[var(--sb-panel-radius)] border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Linked documents</p><h2 id="purchase-chain-title" className="text-[14px] font-semibold">Purchase chain</h2></div>
        <span className="text-[11px] text-muted-foreground">{nodes.length} document{nodes.length === 1 ? "" : "s"}</span>
      </div>
      <ol className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {nodes.map((node, index) => {
          const Icon = icons[node.kind];
          return <li key={`${node.kind}-${node.id}`} className="min-w-0">
            <Link href={node.href} className="group flex min-h-16 min-w-0 items-center gap-2 rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)] bg-secondary/20 px-3 py-2 transition-colors hover:border-[var(--sb-green-600)] hover:bg-[var(--sb-green-50)] motion-reduce:transition-none">
              <Icon className="h-4 w-4 shrink-0 text-[var(--sb-green-700)]" aria-hidden="true" />
              <span className="min-w-0 flex-1"><span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{node.kind}</span><span className="block truncate text-[12px] font-semibold" title={node.number}>{node.number}</span></span>
              <StatusBadge status={node.status} />
              {index < nodes.length - 1 ? <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground xl:block" aria-hidden="true" /> : null}
            </Link>
          </li>;
        })}
      </ol>
      {nodes.length === 1 ? <p className="mt-3 text-[12px] text-muted-foreground">The PO, receiving, and invoice links will appear here as this purchase progresses.</p> : null}
    </section>
  );
}
