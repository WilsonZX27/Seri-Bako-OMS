import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteDocumentSequence } from "@/server/actions/foundation";
import { getDocumentSequences } from "@/server/queries/foundation";

export default async function DocumentSequencesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const filters = await searchParams;
  const sequences = await getDocumentSequences(filters);

  return (
    <>
      <PageHeader title="Document Sequences" description="Document numbering rules for PO, GRN, invoice, stock count, production job, and payment schedule." action={{ href: "/document-sequences/new", label: "New sequence" }} />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search document type, prefix, or preview number" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead className="text-right">Padding</TableHead>
                  <TableHead className="text-right">Current Number</TableHead>
                  <TableHead>Reset Rule</TableHead>
                  <TableHead>Preview Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((sequence) => (
                  <TableRow key={sequence.id}>
                    <TableCell className="font-medium">{sequence.document_type}</TableCell>
                    <TableCell>{sequence.prefix}</TableCell>
                    <TableCell className="text-right">{sequence.padding}</TableCell>
                    <TableCell className="text-right">{sequence.next_number}</TableCell>
                    <TableCell className="capitalize">{sequence.reset_frequency}</TableCell>
                    <TableCell className="font-mono">{sequence.preview_number}</TableCell>
                    <TableCell><Badge variant={sequence.status === "active" ? "success" : "secondary"}>{sequence.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm"><Link href={`/document-sequences/${sequence.id}`}>Edit</Link></Button>
                        <form action={deleteDocumentSequence.bind(null, sequence.id)}><Button variant="ghost" size="sm">Archive</Button></form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!sequences.length ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No document sequences found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
