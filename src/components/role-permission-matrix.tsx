type Permission = { id: string; permission_code: string; module: string; action: string; description: string | null };

const moduleLabels: Record<string, string> = {
  purchase_request: "Purchase Requests", purchase_order: "Purchase Orders", goods_receiving: "Goods Receiving", purchase_return: "Purchase Returns", supplier_invoice: "Supplier Invoices", suppliers: "Suppliers", supplier_items: "Supplier Items", items: "Items", products: "Products", recipes: "Recipes", stock_balance: "Stock Balance", stock_ledger: "Stock Ledger", stock_transfer: "Transfers", stock_count: "Counts", stock_wastage: "Wastage", production: "Production", reports: "Reports", documents: "Documents / Attachments", attachments: "Documents / Attachments", imports: "Imports", staffs: "Staff", branches: "Branches", locations: "Locations", company: "Company", roles: "Roles & Permissions",
};

const actionLabels: Record<string, string> = { read: "View", view: "View", create: "Create", update: "Edit", manage: "Edit", delete: "Delete", approve: "Approve", export: "Export", import: "Import", post: "Post / Receive", receive: "Post / Receive", send: "Post / Receive", submit: "Approve", cancel: "Edit" };

function labelForModule(module: string) { return moduleLabels[module] ?? module.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function RolePermissionMatrix({ permissions, selectedPermissionIds, action }: { permissions: Permission[]; selectedPermissionIds: Set<string>; action: (formData: FormData) => Promise<void> }) {
  const groups = Array.from(permissions.reduce((map, permission) => map.set(permission.module, [...(map.get(permission.module) ?? []), permission]), new Map<string, Permission[]>())).sort(([a], [b]) => labelForModule(a).localeCompare(labelForModule(b)));
  return <form id="role-permissions-form" action={action} className="space-y-4">
    {groups.map(([module, modulePermissions]) => <section key={module} className="overflow-hidden rounded-[2px] border"><div className="border-b bg-secondary/30 px-3 py-2"><h3 className="text-sm font-semibold">{labelForModule(module)}</h3></div><div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-2">Capability</th><th className="px-3 py-2">Allowed</th><th className="px-3 py-2">Details</th></tr></thead><tbody>{modulePermissions.map((permission) => <tr key={permission.id} className="border-b last:border-0"><td className="px-3 py-2 font-medium">{actionLabels[permission.action] ?? permission.action.replaceAll("_", " ")}</td><td className="px-3 py-2"><input type="checkbox" name="permission_id" value={permission.id} defaultChecked={selectedPermissionIds.has(permission.id)} aria-label={`Allow ${labelForModule(module)} ${permission.permission_code}`} className="h-4 w-4 rounded border-slate-300" /></td><td className="px-3 py-2 text-muted-foreground"><details><summary>{permission.description ?? "Catalogue permission"}</summary><code className="mt-1 block">{permission.permission_code}</code></details></td></tr>)}</tbody></table></div></section>)}
  </form>;
}
