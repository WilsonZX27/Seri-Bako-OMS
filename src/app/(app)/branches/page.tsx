import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBranches } from "@/server/queries/foundation";

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  const filters = await searchParams;
  const branches = await getBranches(filters);

  return (
    <>
      <PageHeader title="Branches" description="Central kitchen, outlets, event booths, offices, and operating units." action={{ href: "/branches/new", label: "New branch" }} />
      <div className="space-y-4 p-5">
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-emerald-700"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <div className="overflow-hidden rounded-lg border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search branch code, name, or type" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>{branch.branch_code}</TableCell>
                    <TableCell className="font-medium">{branch.branch_name}</TableCell>
                    <TableCell className="capitalize">{branch.branch_type.replaceAll("_", " ")}</TableCell>
                    <TableCell>{branch.phone ?? "-"}</TableCell>
                    <TableCell>{branch.email ?? "-"}</TableCell>
                    <TableCell><Badge variant={branch.status === "active" ? "success" : "secondary"}>{branch.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm"><Link href={`/branches/${branch.id}`}>Edit</Link></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!branches.length ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No branches found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
