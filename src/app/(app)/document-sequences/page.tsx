import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableActionLink } from "@/components/ui/table";
import { hasPermission } from "@/server/auth/permissions";
import { getDocumentSequences } from "@/server/queries/foundation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { documentTypeLabel } from "@/lib/document-types";
import { hasActiveFilters } from "@/lib/table-state";

export default async function DocumentSequencesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  const filters = await searchParams;
  const [sequences, canCreate, canUpdate] = await Promise.all([getDocumentSequences(filters), hasPermission("document_sequences.create"), hasPermission("document_sequences.update")]);
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader title="Document Sequences" description="Controlled numbering for operational documents." />
      <WorkspaceGrid rightRail={<>{canCreate ? <ConsoleSection title="Actions"><Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/document-sequences/new">New sequence</Link></Button></ConsoleSection> : null}<ConsoleSection title="Sequence Summary"><p className="text-xs text-muted-foreground">{sequences.length} numbering {sequences.length === 1 ? "sequence" : "sequences"} in the current view.</p><p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Opening Balance:</span> the cursor is not a stock-record count. Posting skips every existing Ledger and document number automatically.</p></ConsoleSection></>}>
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search document type, prefix, or preview number" resultCount={sequences.length} filtered={filtered} resetHref="/document-sequences" />
            <Table aria-label="Document sequences" stickyColumn={canUpdate ? "second" : "first"}>
              <TableHeader>
                <TableRow>
                  {canUpdate ? <TableHead className="w-12 text-center">Action</TableHead> : null}
                  <TableHead>Document Type</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Next Format</TableHead>
                  <TableHead>Reset Cycle</TableHead>
                  <TableHead>Current Period</TableHead>
                  <TableHead className="text-right">Next Number</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((sequence) => (
                  <TableRow key={sequence.id}>
                    {canUpdate ? <TableCell className="text-center"><TableActionLink href={`/document-sequences/${sequence.id}`} label={`Edit ${sequence.document_type}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell> : null}
                    <TableCell className="font-medium">{documentTypeLabel(sequence.document_type)}</TableCell>
                    <TableCell>{sequence.prefix}</TableCell>
                    <TableCell className="font-mono">{sequence.preview_number}</TableCell>
                    <TableCell className="capitalize">{sequence.reset_frequency === "never" ? "Never" : sequence.reset_frequency}</TableCell>
                    <TableCell className="font-mono">{sequence.preview_number.split("/")[1] ?? "-"}</TableCell>
                    <TableCell className="text-right">{sequence.next_number}</TableCell>
                    <TableCell><Badge variant={sequence.status === "active" ? "success" : "secondary"}>{sequence.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {!sequences.length ? <TableRow><TableCell colSpan={canUpdate ? 8 : 7} className="text-center text-muted-foreground">No document sequences found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
        </div>
      </WorkspaceGrid>
    </>
  );
}
