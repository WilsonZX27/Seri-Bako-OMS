import { Badge } from "@/components/ui/badge";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlanningBranch, PlanningEvent, PlanningProduct } from "@/lib/production-planning/types";
import { formatDateOnly, formatNumber } from "@/lib/utils";

export function PlanningEvents({ events, outlets, products }: {
  events: PlanningEvent[];
  outlets: PlanningBranch[];
  products: PlanningProduct[];
}) {
  const ordered = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date) || a.name.localeCompare(b.name));
  const destination = (event: PlanningEvent) => event.branch_id
    ? outlets.find(outlet => outlet.id === event.branch_id)?.branch_name ?? "Outlet"
    : "Corporate event";
  const quantities = (event: PlanningEvent) => event.lines.map(line => {
    const product = products.find(candidate => candidate.id === line.product_id);
    return `${product?.product_code ?? "Product"} × ${formatNumber(line.qty)}`;
  }).join(", ");
  const status = (event: PlanningEvent) => <Badge variant={event.confirmed ? "success" : "secondary"}>{event.confirmed ? "Confirmed" : "Draft"}</Badge>;

  return <section className="sb-work-surface" aria-labelledby="scheduled-events-heading">
    <div className="border-b border-[var(--sb-border-soft)] p-3"><h2 id="scheduled-events-heading" className="text-sm font-semibold">Scheduled events</h2></div>
    {!ordered.length ? <p className="p-3 text-sm text-muted-foreground">No events scheduled in the next 90 days.</p> : <>
      <Table aria-label="Scheduled events" mobileHidden>
        <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Destination</TableHead><TableHead>Products</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{ordered.map(event => <TableRow key={event.id}>
          <TableCell className="font-medium">{event.name}</TableCell><TableCell>{formatDateOnly(event.event_date)}</TableCell>
          <TableCell>{destination(event)}</TableCell><TableCell className="whitespace-normal">{quantities(event)}</TableCell><TableCell>{status(event)}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
      <OperationalList ariaLabel="Scheduled events">{ordered.map(event => <OperationalListRow key={event.id} primary={event.name} secondary={destination(event)} detail={quantities(event)} status={status(event)} meta={formatDateOnly(event.event_date)}/>)}</OperationalList>
    </>}
  </section>;
}
