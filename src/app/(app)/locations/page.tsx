import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { archiveDuplicateLocation, fixMissingDefaultLocations } from "@/server/actions/foundation";
import { getLocations } from "@/server/queries/foundation";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  const filters = await searchParams;
  const locations = await getLocations(filters);
  return (
    <>
      <PageHeader title="Locations" description="Advanced inventory locations kept internally for ledger accuracy and future expansion." action={{ href: "/locations/new", label: "New location" }} />
      <div className="space-y-4 p-5">
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-emerald-700"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <Card className="border-primary/15 bg-[var(--sb-muted)]">
          <CardContent className="flex flex-col gap-3 p-4 text-sm leading-6 text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <p>Locations are internal stock areas. For Seri Bako current workflow, daily operations use Branch only. Locations are kept internally for ledger accuracy and future expansion.</p>
            <form action={fixMissingDefaultLocations}>
              <Button type="submit" variant="outline">Fix missing stock areas</Button>
            </form>
          </CardContent>
        </Card>
        <div className="overflow-hidden rounded-lg border bg-card">
        <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search location, branch, or type" />
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
          <TableHead>Branch</TableHead><TableHead>Internal Location</TableHead><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="w-28 text-right">Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell className="font-medium">{location.branch_name ?? "-"}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{location.location_name}</span>
                    {location.is_system_default ? <Badge variant="secondary">System Default</Badge> : null}
                  </div>
                  {location.looks_like_branch_name ? <p className="text-xs text-warning">This looks like a branch name. Consider using Branch only and keeping the default internal location.</p> : null}
                </div>
              </TableCell>
              <TableCell>{location.location_code}</TableCell>
              <TableCell className="capitalize">{location.location_type.replaceAll("_", " ")}</TableCell>
              <TableCell><Badge variant={location.status === "active" ? "success" : "secondary"}>{location.status}</Badge></TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  {location.looks_like_branch_name && !location.is_system_default ? (
                    <form action={archiveDuplicateLocation.bind(null, location.id)}>
                      <Button type="submit" variant="outline" size="sm">Archive duplicate</Button>
                    </form>
                  ) : null}
                  <Button asChild variant="outline" size="sm"><Link href={`/locations/${location.id}`}>Edit</Link></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!locations.length ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No locations found.</TableCell></TableRow> : null}
        </TableBody></Table></div>
      </div></div>
    </>
  );
}
