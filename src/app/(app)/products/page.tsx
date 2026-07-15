import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginateRows } from "@/lib/table-state";
import { deleteProduct } from "@/server/actions/products";
import { getProducts } from "@/server/queries/products";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const [products, allProducts] = await Promise.all([getProducts(filters), getProducts()]);
  const productsPage = paginateRows(products, filters.page);
  const categories = Array.from(new Set(allProducts.map((product) => product.category))).sort();

  return (
    <>
      <PageHeader
        title="Products"
        description="Finished goods master data for future recipe and production modules."
      />
      <WorkspaceGrid rightRail={<ConsoleSection title="Actions"><div className="grid gap-2"><Button asChild className="w-full" data-mobile-primary-action><Link href="/products/new">New product</Link></Button><Button asChild variant="outline" className="w-full"><Link href="/imports/products">Import products</Link></Button></div></ConsoleSection>}>
        <div className="overflow-hidden rounded-lg border bg-card">
          <MasterDataFilters
            search={filters.search}
            status={filters.status}
            category={filters.category}
            placeholder="Search product code, name, category"
            categories={categories}
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <SortableHead label="Product Code" column="product_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Product Name" column="product_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Category" column="category" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Selling Unit" column="selling_unit" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsPage.rows.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.product_image_url} alt={product.product_name} className="h-10 w-10 rounded-md border object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-secondary text-muted-foreground">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{product.product_code}</TableCell>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.selling_unit}</TableCell>
                    <TableCell>
                      <Badge variant={product.status === "active" ? "success" : "secondary"}>{product.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/products/${product.id}`}>Edit</Link>
                        </Button>
                        <form action={deleteProduct.bind(null, product.id)}>
                          <Button variant="ghost" size="sm">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!products.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={productsPage.page} totalPages={productsPage.totalPages} totalRows={productsPage.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
