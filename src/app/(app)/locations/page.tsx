import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteLocation } from "@/server/actions/foundation";
import { getLocations } from "@/server/queries/foundation";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  const filters = await searchParams;
  const locations = await getLocations(filters);
  return (
    <>
      <PageHeader title="Locations" description="Inventory storage areas under branches: dry store, chiller, freezer, packaging and receiving." action={{ href: "/locations/new", label: "New location" }} />
      <div className="space-y-4 p-5">
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-emerald-700"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <div className="overflow-hidden rounded-lg border bg-card">
        <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search location, branch, or type" />
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Location</TableHead><TableHead>Branch</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="w-36 text-right">Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell>{location.location_code}</TableCell>
              <TableCell className="font-medium">{location.location_name}</TableCell>
              <TableCell>{location.branch_name ?? "-"}</TableCell>
              <TableCell className="capitalize">{location.location_type.replaceAll("_", " ")}</TableCell>
              <TableCell><Badge variant={location.status === "active" ? "success" : "secondary"}>{location.status}</Badge></TableCell>
              <TableCell><div className="flex justify-end gap-2"><Button asChild variant="outline" size="sm"><Link href={`/locations/${location.id}`}>Edit</Link></Button><form action={deleteLocation.bind(null, location.id)}><Button variant="ghost" size="sm">Archive</Button></form></div></TableCell>
            </TableRow>
          ))}
          {!locations.length ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No locations found.</TableCell></TableRow> : null}
        </TableBody></Table></div>
      </div></div>
    </>
  );
}
