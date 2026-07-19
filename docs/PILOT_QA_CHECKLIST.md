# v1.0 Pilot QA Checklist

Record tester, date/time, environment, branch, role, and evidence for each applicable check. Mark `N/A` only with a reason.

## Authentication and permissions

- [ ] Login succeeds for each pilot role; logout ends access.
- [ ] Password reset and the supported invitation/account-setup path complete safely.
- [ ] Mobile login remains usable without keyboard or viewport overflow.
- [ ] Unauthenticated protected URLs redirect to login.
- [ ] Role defaults, staff explicit allow, and staff explicit deny each produce the expected effective access.
- [ ] Navigation, direct URL, server action, and data access agree; direct-route denial exposes no content.
- [ ] Branch / Outlet and company scope is enforced; final Super Admin safety and owner-class access remain available.

## Procurement

- [ ] Supplier/item lookup uses stable codes and searchable records.
- [ ] PR create, submit, approve/reject/return, and Ready-to-Convert states work.
- [ ] PR-to-PO creates one complete PO; repeat entry does not duplicate it.
- [ ] PO detail, send/status actions, GRN full/partial receiving, and purchase return work.
- [ ] Failed actions leave no partial header, lines, or misleading status.

## Inventory

- [ ] Opening stock preview/posting uses the correct Branch / Outlet.
- [ ] Stock balance and ledger agree for sampled items.
- [ ] Receiving, transfer, count/reconciliation, wastage, and manual transaction flows post once.
- [ ] Low-stock view and UOM conversion behavior are correct.

## Production and finance handoff

- [ ] Product and Recipe/BOM setup uses valid items, UOMs, yields, costs, and recipe activation.
- [ ] Production job draft/submit/approve/post deducts ingredients and adds finished output.
- [ ] A failed production post rolls back without partial ledger movement.
- [ ] Supplier invoice links to the expected PO/GRN where supported; payment record and balance update work.

## Documents, activity, and attachments

- [ ] Document numbering, status, links, comments, timeline, and audit actor/time are correct.
- [ ] A file below 10 MB uploads, renders, views, and downloads.
- [ ] Oversize validation is clear and creates no object/metadata.
- [ ] Unauthenticated and cross-company attachment access is rejected; bucket remains private.

## Mobile and responsive operation

- [ ] 320 px view has no page/date/control overflow or action-bar overlap.
- [ ] 360 px view has no horizontal page overflow.
- [ ] 390 px view keeps forms and keyboard interaction usable.
- [ ] 430 px view keeps compact filters, headers, and actions usable.
- [ ] Mobile primary action is one tap; context and destructive actions remain separate.
- [ ] Filters remain compact, essential table fields/action remain reachable, and dialog content scrolls safely.
- [ ] Sidebar, topbar, workdesk, and contextual console/drawer preserve current workflow placement.

## Performance and release acceptance

- [ ] Login returns normally; protected redirect and primary list/detail routes are responsive.
- [ ] Mutations show immediate pending feedback, have no dead click, and prevent duplicate submission.
- [ ] No indefinite loading occurs; first render after mutation shows updated state.
- [ ] List/detail navigation works without obvious repeated full-page loads.
- [ ] Loading, empty, error, and success states are clear and contain no dummy records.
- [ ] Typecheck, lint, production build, diff check, focused suite, full Playwright, and production smoke pass.
- [ ] No migration, real-data mutation, secret, or unresolved pilot stop condition was introduced by baseline preparation.
- [ ] Pilot owner signs acceptance or records the remaining blocker.
