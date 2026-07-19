# v7.23.5.3 Local Validation

Status: combined local implementation validated and ready for one local commit. The Production staff-role correction remains a guarded, rollback-by-default plan only.

## Scope verified

- Staff access forms and actions use branch IDs directly. The ambiguous inferred `locations -> branches` embed was removed.
- Staff access UI exposes Role, Default Branch, and Accessible Branches without legacy Outlet/Location labels.
- The selectable role source filters and de-duplicates the exact six canonical role codes.
- Staff Role, Default Branch, and the accepted shared FilterBar controls use the portal-based OMS select.
- FilterBars wrap without owning a vertical scrollbar; only the More Filters field region may scroll when its content exceeds the sheet viewport.
- Desktop and mobile navigation share the canonical sidebar-width token.
- Footer displays exactly `v7.23.5.3`.
- Local-only migration 075 implements the separately authorized Manager company-wide operational scope. The data-only Jack/Ashley staff-role correction remains a rollback-by-default runbook based on the completed read-only audit.

## Database validation

- Disposable local reset: migrations 001-075 passed.
- Active local canonical role counts: one each for `super_admin`, `finance`, `manager`, `purchasing`, `kitchen`, and `outlet_staff`.
- Six disposable local auth identities were recreated without business records.
- No remote migration, `db push`, Production mutation, or business-record mutation was performed.

## Authoritative Manager scope addendum

- Manager receives same-company PR visibility through the central RLS access function and `pr.view_all`; `pr.view_branch` is removed.
- Manager branch assignments are unchanged and supply default context only. No branch was added to FAYADH, TEST-MANAGER, or any other staff record.
- Dashboard queues and PR notifications use the same company-wide operational role scope.
- AP Aging, Cash Flow, payment data, supplier invoices, recipe costing/readiness, product margin, and Owner controls remain unavailable to Manager.
- Kitchen and Outlet Staff PR access resolves only through assigned branches; the legacy requester ownership escape was removed.
- The rollback-only SQL regression proves Office-only Manager access to PR-00008 at CK-PJS10 and PR-00011 at CK-ALMA, Manager Review stage authority, lower-role isolation, and unchanged Finance/Owner visibility.

## Automated validation

| Check | Result |
|---|---|
| Disposable reset through migration 075 | Passed |
| Rollback-only Manager RLS regression | Passed after the final reset |
| Typecheck | Passed |
| Lint | Passed, zero warnings |
| Production build | Passed; 89 static pages generated |
| Contract tests | 142/142 passed |
| Six-role authenticated terminal-page smoke | 6/6 passed against the final production build |
| Staff list/detail/create/edit and six-role dropdown | Passed |
| FilterBar routes at 1440, 1024, 768, 430, 390, 360 | Passed |
| More Filters backdrop, close, Apply, Escape/focus return | Passed |
| Canonical desktop/mobile sidebar sizing | Passed |

The final authenticated Playwright run passed all eight cases: six role terminal routes, the Staff list/detail/create/edit and canonical-role case, and the responsive FilterBar/More Filters case across every required route and width.

Generated screenshots, traces, Playwright output, local server logs, and `.env.test.local` remain under ignored paths and are not part of the commit candidate.

## Production boundary

The read-only audit identified only the exact Jack and Ashley records recorded in the separate guarded runbook. No Production role, branch, business record, migration, or policy was changed.
