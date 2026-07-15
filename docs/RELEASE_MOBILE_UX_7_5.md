# Sprint 7.5 Mobile UX and Staff Permission Overrides

Status: released locally as `v0.2.15 / Sprint 7.5`; migrations 052–054 and RC-2 verification passed

Audit date: 2026-07-15

## Scope and root cause

Sprint 7.5 refines the current application rather than replacing its workflows. The mobile shell previously exposed only a generic context drawer, filters could wrap into several rows, local pages retained too many table columns, date controls could force grid overflow, and several right-console text blocks used a larger local scale.

The permission root cause was structural: production authorization used a hard-coded application role matrix before consulting the database, and the repository-root middleware was not registered by the `src/app` Next.js layout. That made direct URLs bypass the otherwise-correct effective-permission model. Migration `052_sprint_7_5_staff_permission_overrides.sql` adds catalogue-linked tri-state overrides; the application now registers `src/middleware.ts` and routes middleware, navigation, layouts, server pages, and actions through the shared effective-permission resolver.

## Mobile interaction changes

- Added a shared bottom action bar below `xl` with one contextual primary action and a separate Actions & context trigger. The bar respects safe areas and content bottom padding; destructive actions stay inside guarded context panels.
- Reworked shared list filters into a two-row mobile pattern: search first, compact horizontally scrollable controls second.
- Reduced page-header height because breadcrumb and active navigation already establish location.
- Prioritized essential mobile table columns for Items, Purchase Requests, Purchase Orders, Staff, and Recipes while keeping row actions last.
- Hardened date/input/select containment with `min-width: 0` and native-date overflow rules.
- Standardized topbar icon/badge sizing and right-console typography.
- Updated dashboard KPI rows to place icon/title left and the primary number right.
- Moved Recipes under Inventory and added only implemented operational routes to navigation.

## Browser comment resolution

1. Staff action-console instructions, status metadata, Auth Setup, permission summary, branch access, and activity blocks now use the shared compact scale.
2. The no-active-recipe production warning now uses standard compact alert text.
3. Create draft production job is rendered in the right console and becomes the mobile primary action.
4. New recipe is rendered in the right console and becomes the mobile primary action.
5. Page headers are compact; descriptions collapse on mobile and no business action is placed in the topbar.

## Staff permission overrides

- Role permissions remain defaults. Each catalogue permission can inherit, allow, or deny for an individual staff member.
- Effective access is role grants plus explicit allows minus explicit denies; deny wins across mapped aliases.
- Navigation and direct-route checks use the same database resolver as server authorization. Server actions and RLS remain enforced.
- Only actors with `roles.update` can mutate overrides. They cannot grant a permission they do not possess, modify another company, or override Super Admin/Owner access.
- Override replacement and its activity-log entry are atomic.
- The role screen explicitly explains that individual staff overrides can change effective access.

## Shared authorization pipeline

- `src/middleware.ts` is the single registered Next.js middleware entry and delegates to the session/route guard.
- `src/server/auth/route-permissions.ts` maps every protected Operations, Procurement, Inventory, Production, Recipes, Suppliers, Reports, Administration, Roles, Staff, Company, and Documents route family to catalogue permissions.
- `resolveEffectivePermission()` is shared by middleware and `hasPermission()`; navigation, global search, Quick Tools, server pages, protected route handlers, and server actions consume that same result.
- Explicit deny is checked before the compatibility role-default fallback. Established role-only users keep inherited access, while a staff override can still deny it.
- Manager with `reports.view = deny` is redirected from direct `GET /reports` to `/dashboard?error=...`; resetting the override restores role inheritance.
- Next.js production build reports `ƒ Middleware`, confirming that the route guard is registered.

## Historical mockup handling

Historical mockups were used only for the deep-green identity, warm neutral workspace, compact rectangular controls, amber/brown accent, and restrained operational tone. Their old page structures, navigation grouping, topbar actions, optional right rail, fabricated metrics, oversized headings, fixed desktop layouts, and typography pairing were rejected. Current workflows, `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`, reusable components, and the validated fixed-sidebar/topbar/workdesk/right-console shell take precedence.

## Verification matrix

Target viewports: 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900, and 1920×1080.

Focused coverage lives in `tests/e2e/release-mobile-ux-7-5.spec.js` and checks:

- primary action/context separation;
- filter row count;
- essential mobile table columns and final row actions;
- browser-comment typography/action regressions;
- shell, date, and control containment at all target widths;
- catalogue-driven permission UI and owner protection;
- isolated allow/deny direct-route behavior, read-only unauthorized UI, and cleanup back to role defaults when `RUN_PERMISSION_OVERRIDE_MUTATION_TESTS=true`.

Final release evidence records migration status, typecheck, lint, production build, focused Sprint 7.5 tests, full Playwright regression, production smoke, and an empty `git diff --check`.

## RC-2 workflow blockers

- Migration `053_sprint_7_5_release_blocker_workflows.sql` adds the private `document-attachments` Storage bucket and policies, document attachment metadata, and the atomic PR-to-PO conversion RPC with one-active-PO-per-PR protection.
- Migration `054_sprint_7_5_pr_to_po_supplier_scope_fix.sql` replaces only that RPC. It removes the invalid `suppliers.company_id` predicate and changes the related supplier validation message; the global supplier model and all other tables, policies, roles, permissions, and workflows are unchanged.
- The RPC remains atomic and idempotent: a valid Ready-to-Convert request created one header and every expected line, recorded the PO link, and changed PR status only after success. Repeat and concurrent calls resolved to the same PO, while a forced failure left no partial header or lines.
- Attachment transport accepts a 20 MB request envelope, while application validation and Storage remain capped at 10 MB. A valid file uploaded, rendered immediately, and supported authorized View/Download. Oversized and invalid files produced clear validation with no Storage object or metadata row; unauthenticated and cross-company access were rejected.
- Shared table row actions use native links after the full suite proved a Next.js client-navigation abort on cached PR detail links. The server route, record, and permission path were valid; the native link preserves one-click behavior without a client-router race.

## Database verification

- Linked project: `nnvdsaftiwpqkekjfrgc` (`Seri Bako Project`). The SQL Editor application record confirms migration ceiling 054 and ledger entry `054_sprint_7_5_pr_to_po_supplier_scope_fix`.
- Live migration 052 matches the committed source statement-for-statement.
- Objects changed by 052: `staff_permission_overrides`; unique `(staff_id, permission_id)` and `allow`/`deny` check constraints; staff lookup index; updated-at trigger; read/manage RLS policies; `has_any_permission(text[])`; replaced wrapper `has_permission(text)`; `set_staff_permission_overrides(uuid, jsonb)`; authenticated grants.
- Role-only inheritance, explicit deny precedence, authorized explicit allow, reset/delete back to inheritance, duplicate rejection, invalid-effect rejection, company scope, RLS mutation rejection, and audit-log creation all passed.
- Existing users without overrides retained permissions. Application compatibility defaults are consulted only after the database resolver and cannot bypass an explicit deny.
- Wilson remains active `super_admin`. Four active owner-class accounts remain, owner overrides are rejected, and existing final-owner protections prevent reaching zero active owners.
- Migration 054 left `suppliers` without `company_id`, retained the one-active-PO-per-PR index, and did not alter the private attachment bucket or its policies. Live transaction, concurrency, private-storage, and authorization behavior matches the committed 054/053 definitions.

## Final verification status

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with no warnings or errors.
- `npm.cmd run build`: passed; 70 pages generated and middleware registered.
- `git diff --check`: passed.
- Isolated PR-to-PO mutation/idempotency/concurrency: passed, including repeat/concurrent duplicate protection, PO detail, and rollback evidence.
- Isolated attachment upload/view/download/oversize/private-access suite: passed.
- Isolated supplier-code import mapping and unknown-code rejection: passed.
- Isolated effective-permission mutation/direct-route gate: 1 passed; manager deny blocked `/reports`, reset restored inherited access.
- Focused Sprint 7.5 suites: 11 passed, 1 intentionally gated skip; the gated permission mutation passed separately.
- Full Playwright: 48 passed, 15 intentionally gated skips, 0 failed (63 discovered) in 11.1 minutes.
- Optimized production build and unauthenticated login/redirect smoke: passed. Authenticated full regression ran on a clean long-lived local server because sandboxed foreground production processes could not reach Supabase.
- Permission mutation cleanup passed: the manager fixture returned to role defaults after direct-route denial verification.
- Release metadata updated only after all required gates passed: `v0.2.15 / Sprint 7.5`.

## Pilot baseline handoff

Sprint 7.5 remains the released application baseline for the v1.0 pilot preparation milestone; no new application version or migration is introduced. Pilot operators should follow `PILOT_BASELINE.md`, use only the catalogue-matched files in `import-templates/`, reconcile with the read-only checks in `DATA_RECONCILIATION.md`, and capture acceptance in `PILOT_QA_CHECKLIST.md`.
