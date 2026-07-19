import Link from "next/link";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasActiveFilters, paginateRows } from "@/lib/table-state";
import { getProducts } from "@/server/queries/products";
import { getPermissionMap } from "@/server/auth/permissions";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const [products, allProducts, permissions] = await Promise.all([getProducts(filters), getProducts(), getPermissionMap(["production.create", "imports.run"])]);
  const productsPage = paginateRows(products, filters.page);
  const categories = Array.from(new Set(allProducts.map((product) => product.category))).sort();
  const filtered = hasActiveFilters(filters);
  const canCreate = permissions["production.create"];
  const emptyAction = filtered ? { href: "/products", label: "Reset filters" } : canCreate ? { href: "/products/new", label: "New product" } : undefined;

  return (
    <>
      <PageHeader
        title="Products"
        description="Finished goods master data for future recipe and production modules."
      />
      <WorkspaceGrid rightRail={<>{canCreate || permissions["imports.run"] ? <ConsoleSection title="Actions"><div className="grid gap-2">{canCreate ? <Button asChild className="w-full" data-mobile-primary-action><Link href="/products/new">New product</Link></Button> : null}{permissions["imports.run"] ? <Button asChild variant="outline" className="w-full"><Link href="/imports/products">Import products</Link></Button> : null}</div></ConsoleSection> : null}<ConsoleSection title="Product Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Matching</dt><dd className="font-semibold">{productsPage.totalRows}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{allProducts.filter((product) => product.status === "active").length}</dd></div></dl></ConsoleSection></>}>
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <MasterDataFilters
            search={filters.search}
            status={filters.status}
            category={filters.category}
            placeholder="Search product code, name, category"
            categories={categories}
            resultCount={productsPage.totalRows}
            filtered={filtered}
            resetHref="/products"
          />
            <Table mobileHidden aria-label="Products">
              <TableHeader>
                <TableRow>
                  <SortableHead label="Product Code" column="product_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Product Name" column="product_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Category" column="category" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Selling Unit" column="selling_unit" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="w-12 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsPage.rows.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.product_code}</TableCell>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.selling_unit}</TableCell>
                    <TableCell>
                      <Badge variant={product.status === "active" ? "success" : "secondary"}>{product.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right"><TableActionLink href={`/products/${product.id}`} label={`Open ${product.product_name}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                  </TableRow>
                ))}
                {!productsPage.rows.length ? (
                  <TableRow>
                    <TableCell colSpan={6}><EmptyState title={filtered ? "No products match these filters" : "No products yet"} description={filtered ? "Reset the filters or widen the search." : "Products appear after finished goods are created or imported."} action={emptyAction} /></TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          <OperationalList ariaLabel="Products">
            {productsPage.rows.map((product) => <OperationalListRow key={product.id} href={`/products/${product.id}`} label={`Open ${product.product_name}`} primary={product.product_name} status={<Badge variant={product.status === "active" ? "success" : "secondary"}>{product.status}</Badge>} secondary={`${product.product_code} · ${product.category}`} meta={product.selling_unit} />)}
            {!productsPage.rows.length ? <EmptyState title={filtered ? "No products match these filters" : "No products yet"} description={filtered ? "Reset the filters or widen the search." : "Products appear after finished goods are created or imported."} action={emptyAction} /> : null}
          </OperationalList>
          <PaginationControls page={productsPage.page} totalPages={productsPage.totalPages} totalRows={productsPage.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
