# Manager Items navigation correction

Real Malaysia Manager acceptance on d03c331e found readable Items list but rows still opened the protected edit page. The existing /items/[id] route is EditItemPage guarded by items.update/allowed editing roles, not a read-only detail page. No new detail design or permissions are introduced.

ItemsPage now requests its existing items.update permission. Without it, desktop rows are ordinary TableRows, pencil links and double-click guidance are absent, and phone OperationalListRow has no href or Open label. Same cell content, columns, filters, pagination and layout remain. With items.update, existing row/pencil/phone navigation and guidance remain. No shared component, server write, role grant, migration or other page changed.

Two tests execute actual ItemsPage with synthetic query/permission values: false or missing update permission removes all edit navigation while retaining fields; true preserves desktop, pencil and phone links. These are source-render branch tests, not Owner auth/RLS acceptance. Real Manager prior baseline verifies list826records/noNewAction, /items/new and /items/[id] GET route denial; final post-deploy checks recorded externally. Original notification-first route remains distinct from the successful Manager Dashboard queue first-entry check.
