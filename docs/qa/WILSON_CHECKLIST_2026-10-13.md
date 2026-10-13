# Wilson checklist maintenance — local candidate

Base: a79e987078b4061bc3b983544dcdc28a2b3c4393 (codex/maintenance-release-20261013).
Branch: codex/wilson-checklist-20261013.
Independent worktree: outputs/wilson-checklist-2026-10-13, in the candidate repository.
No AGENTS.md found in this checkout or ancestor directories. Applied local impeccable product guidance and Vercel react-best-practices skill. The app-managed worktree tool was unavailable for this delegated environment; Git worktree was used against the release package's owning repository.

## Existing capability and minimum change

346 already supports optional asset IDs, authenticated location scope, private asset-documents photos, exact-payload/actor request replay, photo reservation and upload recovery. Existing checklist only wrote inspections. Existing My Actions covered procurement, schedules and outlet records; it had no maintenance source.

- Daily location checklist adds a collapsed Other issues / General repair section, rendering the existing GeneralMaintenanceForm as a sibling (no nested form). Lighting/fittings/unregistered facilities need no fabricated asset.
- Registered checklist exceptions create a maintenance request atomically with the inspection. Checked rows do nothing. One source key per inspection and the existing checklist replay path prevent duplicate requests/notifications.
- Checklist submission key survives the scoped browser draft, including lost-response/reload retry. Old drafts without a key are rejected rather than replayed with an invented identity.
- Notifications use individual recipient_staff_id only; branch_id, recipient_role_id and company-wide broadcast are not populated. Recipient rules mirror 339 assigned branch/default branch and management roles, plus 090 active/effective roles and allow/deny permission rules. Required permissions: assets.view and assets.maintenance. Unassigned executives are excluded. Event locations have no mapped responsible branch and receive no guessed recipient.
- My Actions rechecks current responsibility and access; closed/resolved/cancelled requests disappear, and their personal alerts are dismissed in the same database transaction. Status action invalidates the shared layout.
- No new business ledger, grant expansion, storage visibility change, permission assignment or migration applied outside the in-memory fixture.

Reference: MaintainX official notification-settings groups work by creator/assignee/team and supports overdue/status events (https://help.getmaintainx.com/notification-settings); users-and-teams distinguishes users/teams and permissions (https://help.getmaintainx.com/about-users-and-teams). These are product references, not authority to alter OMS permission scope.

## Evidence

- 44 PGlite assertions: report with no asset, attachment private parent reservation/replay, cross-branch/company denial, invalid file policy, actor replay denial, checklist all-clear no notification, exception once, retry dedupe, close/empty My Actions, no unassigned executive, deny override, inactive/expired/cross-company roles, notification failure rollback/retry, helper RPC inaccessible to authenticated users.
- 23 Node tests: asset-checklist-submit, asset-draft-recovery, asset-attachment-actions/content/reconciliation, pending-actions-null-read-fail-closed-contract. Includes actual server action photo upload failure/verification mocks and invalid photo preventing request creation.
- TypeScript typecheck, targeted ESLint and git diff --check pass.
- Four Playwright component checks with actual TSX/project CSS at 320, 390, 820 and 1440: no horizontal overflow, no nested forms, visible private-photo input and >=44px phone/tablet submit. Screenshots: outputs/wilson-qa/component-{width}.png; ui-results.json.
- PGlite creates a fresh in-memory database, with explicitly synthetic auth/scope stand-ins. No DB process/port, credentials, existing fixture or other task's DB used. Browser setContent uses no HTTP server. Dependency installations were reused read-only.

Reproduce:

```sh
PGLITE_MODULE=/tmp/oms-schedule-eligibility-runtime/node_modules/@electric-sql/pglite/dist/index.js node scripts/v9/test-wilson-checklist-db.mjs
node --test tests/asset-checklist-submit.test.js tests/asset-draft-recovery.test.js tests/asset-attachment-actions.test.js tests/asset-attachment-content.test.js tests/asset-attachment-reconciliation.test.js tests/pending-actions-null-read-fail-closed-contract.test.js
npm run typecheck
node node_modules/tailwindcss/lib/cli.js -i src/app/globals.css -o outputs/wilson-qa/tailwind.css --minify
node scripts/v9/test-wilson-checklist-ui.cjs
```

## Remaining verification and approval boundary

Not a full Supabase/storage/authenticated-shell end-to-end run. Synthetic scope functions isolate mutation/RLS behavior but do not validate the complete production policy stack. Chromium used elevated execution for macOS bootstrap sandbox restrictions; it rendered local synthetic content only. Real upload transport and concurrent multi-session requests require a dedicated full-stack test instance. Component screenshots stub the right-console host and do not prove the complete app's fixed mobile bottom rail. Parent verified attachment identity (assetchecklist image(20261013-161759).png); pixels were not provided to this task, so no pixel matching is claimed. No schedule screenshot was used.

Before release: independently review/apply 346 and 347 in a dedicated staging instance, verify all policy interactions and real private photo transport, authenticated My Actions refresh, 320/390/tablet/desktop shell and mobile bottom actions, then request explicit production approval. 347 adds three internal functions, one authenticated read RPC, two transaction triggers and one restrictive notification SELECT policy. 346's permission/RLS changes remain separately unapproved. Do not cherry-pick application changes without the migrations: the new My Actions RPC deliberately fails closed if absent. No push, merge, deploy, production migration, real ticket or notification was performed.
