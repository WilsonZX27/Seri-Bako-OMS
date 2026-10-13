# Wilson checklist maintenance — authenticated local acceptance

Base: `a79e987078b4061bc3b983544dcdc28a2b3c4393` (codex/maintenance-release-20261013).
Branch/worktree: `codex/wilson-checklist-20261013`, `outputs/wilson-checklist-2026-10-13`.
Original implementation commit: `b28554e007d31e59cad18694a9a3ee35d425c744`; follow-up acceptance fixes are on this branch.
No AGENTS.md was present in this checkout or ancestors. Applied local impeccable product guidance and Vercel react-best-practices. Main dirty checkout, original release package and schedule/export worker checkouts were preserved.

## Final implementation

- Daily checklist exposes a collapsed Other issues / General repair section using the existing GeneralMaintenanceForm and private asset-documents upload flow. Unregistered lighting/fittings do not create or fabricate assets.
- Registered-asset checklist exceptions insert one existing maintenance-ledger request inside the inspection transaction. Checked rows create no requests or notifications. Source keys and original checklist serialization prevent retry/concurrent duplicates.
- Checklist draft preserves its submission key across real browser reload. Existing ordinary report idempotency remains actor/payload-bound.
- Real storage-failure testing found the existing attachment picker generated a new key on retry. Its new `retryExisting` mode keeps the original key when reselecting the original file; the database rejects changed content. The tested retry leaves one reservation, one verified photo and one request.
- My Actions reads current request status and rechecks permissions/scope. Closing/resolving/cancelling dismisses its notifications transactionally; the status action revalidates the shared layout, so the actual UI clears without reload.
- 320px asset rows now stack instead of squeezing the name beside the result control. Tablet checklist bottom-bar clearance is placed after the complete page, keeping the repair submit button clickable. Empty optional asset selector is hidden.
- My Actions permissions are batched; users without assets.maintenance do not call the new RPC. Existing procurement/schedule/outlet queries continue independently.

## Migration 347: exact approval scope

No new tables, columns, role_permissions rows, business permissions, company-wide grants or storage policies. Existing migration 346 remains a separate prerequisite and is still unapproved for Production.

347 adds:

1. `asset_maintenance_responsible(uuid) RETURNS SETOF uuid`: internal SECURITY DEFINER recipient resolver; execute revoked from PUBLIC, anon and authenticated.
2. `asset_maintenance_notify() RETURNS trigger`: internal trigger function; execute revoked from those roles. Trigger `asset_maintenance_notify` runs AFTER INSERT OR UPDATE OF status on asset_maintenance, inserts individual notifications or dismisses terminal-state notifications.
3. `asset_check_exception_request() RETURNS trigger`: internal trigger function; execute revoked. Trigger of the same name runs AFTER INSERT on asset_daily_checks; non-Checked rows create a maintenance request, unique by CHECK-inspection-id.
4. `get_my_maintenance_actions(integer) RETURNS jsonb`: authenticated read-only RPC; execute revoked from PUBLIC/anon and granted to authenticated. Security-definer function explicitly enforces current company, location access, management role, maintenance permission and current responsible membership.
5. Restrictive SELECT policy `maintenance_notification_current_access` on notifications, requiring the direct recipient plus current maintenance role/permission/location access for this entity type. Existing notification policies still apply.
6. PostgREST schema reload notification.

Notification audience is the existing assigned/default branch's active authenticated staff with an effective active same-company role in super_admin/manager/outlet_supervisor, plus assets.view and assets.maintenance under existing role/allow/deny semantics. Super-admin semantics match the existing permission function, but a super-admin must still be assigned to this branch to receive this alert. No notification recipient_role_id, branch_id or is_company_wide broadcast is populated. Unassigned executives, other branches, ordinary other employees, expired/inactive/cross-company roles and denied permissions are excluded. Event locations have no guessed branch/team recipient.

Migration filename check found no 347 in the main tree, integration candidate, original maintenance-release worktree or schedule-staff-matching-worktree. Only this worktree owns 347 (plus its ignored runtime copy). Evidence: outputs/wilson-qa/migration-conflict-check.txt. This is a point-in-time check; re-coordinate before combining workers. No other worker migration was edited or renumbered.

## Isolated full stack and actual coverage

Created a NEW Supabase project `oms-wilson-checklist-20261014` with separate Docker volumes, API 57321 and DB 57322. Application port 3194. Existing `oms-ux-uat-20261010` on 56321/56322 was neither reused nor reset. A single synthetic tenant/fixture with 10 local accounts was created; later runs reused it. Private credentials remain in ignored local files and are excluded from the patch.

Cold-start bootstrap encountered two historical production-data-only corrections: 296 (requires real PJS10 catalog) and 333 (requires two confirmed real KG items). Only their ignored bootstrap copies were replaced by documented no-ops. Repository migrations, all schema/security migrations and actual 346/347 were unchanged and applied to the fresh local instance. This is not proof of replaying production data repairs.

Actual authenticated browser/API/storage checks:

- Staff submits healthy daily checklist: notification count unchanged.
- Staff opens checklist ordinary report, submits no-asset issue with PNG. Actual private Storage rejects it under a temporary local bucket MIME restriction; bucket setting is restored in finally. UI retains saved request; reselect/retry verifies one photo using the same key. Reporter downloads via signed private URL.
- Exact recipients are assigned owner, branch manager and supervisor; no branch/role/company broadcast. Manager's actual Workspace Updates/My Actions link opens the request.
- Other staff and other-branch manager cannot read request or photo rows, create signed storage URL, see sensitive details on app route, or fetch attachment route. They see no request notifications.
- Manager closes through UI; database pending list and real topbar action/alert disappear without manual reload.
- Eight independently authenticated same-user sessions concurrently report the same key: one request and one manager notification. Eight sessions concurrently submit the same exceptional checklist: one inspection, one repair and one manager notification. Changed payload and stale status replay are rejected; state changes/cancellation are visible to reporter, who cannot manage status.
- Browser request aborted before send and after server commit: inputs/key retained, retry leaves one request.
- Full authenticated application screenshots at 320/390/820/1440 for checklist, photo form and manager detail. Checks include no horizontal overflow, no nested forms, and repair submit center-point hit testing above fixed navigation. Real reload preserves exceptional checklist draft and submission key without submitting another request.

Evidence directory: `outputs/wilson-qa/` (ignored, local supporting artifacts).
- `full-stack/checklist-acceptance.json`, `full-stack/responsive-acceptance.json`
- `full-stack/app-checklist-{width}.png`, `app-photo-{width}.png`, `viewport-photo-{width}.png`, `app-manager-{width}.png`
- `full-stack/manager-notification-actions.png`, `network-recovery.log`, `multisession-lifecycle.log`
- `full-tests.log`, `full-typecheck.log`, `full-lint.log`, `full-build.log`
- Original 44 PGlite assertions and focused 23-test evidence remain available as supplemental checks.

Final gates: full npm test (1537 tests), npm run typecheck, npm run lint, npm run build, and git diff --check. All passed after the last UI fixes. Final responsive verification also passed after the same build.

## Remaining limits and release boundary

The attachment was identified by the parent as assetchecklist image(20261013-161759).png; its actual pixels were not materialized here, so no original-image pixel comparison is claimed. Real local app screenshots were inspected instead. No production environment, real company data, outgoing production notification, production migration, push, merge or deployment was used.

Production approval must explicitly cover both 346's reporting/RLS change and the above 347 objects, followed by application release of this branch. Application code requires 347's RPC. Local full-stack success does not authorize production rollout or guarantee real production recipient assignments. Event locations without an assigned branch produce no guessed escalation. The task-local app and stack were stopped after verification, with local data volumes preserved; the pre-existing 56321/56322 stack remains running. The new local stack may be restarted using `supabase start --workdir outputs/wilson-stack`; it is independent of every other worker's stack. Private environment and fixture must not be committed or exported.

Official product references: https://help.getmaintainx.com/notification-settings (creator/assignee/team and overdue/status triggers); https://help.getmaintainx.com/about-users-and-teams (users/teams and permissions). These informed behavior but did not authorize changing OMS permissions.
