# Isolated maintenance release package — ready for review, not deployed

## Verified baseline

On 2026-10-13 the authenticated Vercel CLI resolved `system.seribako.com.my` to READY production deployment `dpl_9rTTUyGc4ET2VYHFcrguFcrhDb71`, URL `seri-bako-oms-official-lq9u9ewky-seribako.vercel.app`, Git SHA `2dc8c0f441fe43ee02c285d8397e6dd0cc3d6b3c`. The connector returned 404; the existing authenticated CLI's same deployment API returned the SHA and alias. No deployment command was used.

Live `git ls-remote` and fetch verified main at `cbf531c612b686a574527ba9346aa72880bab4f0`. Production is not main. This independent worktree/branch `codex/maintenance-release-20261013` starts at the verified production SHA, preserving existing deployed schedule behavior rather than reverting or adding schedule work. Existing mixed candidate and primary checkout are preserved.

## Exact scope

`MAINTENANCE_RELEASE_MANIFEST_2026-10-13.json` lists included source/test/script files and SHA-256. The generated patch is the exact local commit delta from production; it is not the old feature branch's main diff.

Core: new general maintenance route/form; actor/location-scoped report options and own-request reads; optional asset and photo; saved-ticket/photo-retry; transport failure recovery with stable request keys; nullable attachment/read/detail/type support; existing workspace entrypoints.

Bounded UI fixes: phone asset identity and empty fields; redundant action-rail removal; correct mobile titles; narrow search/focus styles; visible attachment-picker keyboard focus; accessible names; missing-kitchen empty state; Health API normal anchor; enum-safe Stock Count/Transfer/Wastage search. Route expectations follow existing migration 314 and planning permissions; no runtime compliance grant expansion.

Excluded: all new attendance/schedule/workbook changes; 345; production-demand/business calculation changes; unrelated candidate files. `343` and `344` are unchanged files already present in the verified production source baseline, not new migrations or authorization to execute them. Only new SQL file is **346**. No package/dependency/lockfile changes.

## Dependencies and migration boundaries

346 uses the existing asset foundation tables, policies, functions and private bucket. The isolated SQL test loads 337, 339 and 346, showing this reporting migration does not require 343/344/345. Target database ledger and actual objects must still be checked read-only before an approved application; source files do not establish which production migrations ran.

346 adds assets.report permission records and role mappings (Owner/Manager/Supervisor/Staff/Kitchen); reported_by foreign key and reporter index; permits null asset IDs; adds an attachment parent check; changes maintenance/attachment SELECT RLS; replaces attachment parent guard, report RPC and attachment reservation RPC. Existing SECURITY DEFINER functions retain existing execute ACLs. No new provider, secret, cron, email or public bucket. Existing asset-documents must stay private, with existing storage policies and JPEG/PNG/WebP capability; app limit 10 MB.

There is no historical reporter backfill, asset reassignment or file migration. Existing reports retain null reported_by. BEGIN/COMMIT makes an uncommitted failure transactional; after successful application and new general tickets, do not restore NOT NULL or discard tickets to roll back. The migration is not an idempotent rerun or a supplied down migration.

## Fresh verification of this package

A new synthetic tenant `UAT-RELEASE-1013` in loopback Supabase was used; none of the old candidate's screenshots/results is counted as new-package evidence. Port 3187 serves this worktree's own production-mode build.

- Full repository suite: **1536 passed, zero failures**. This differs from the mixed candidate's 1540 because unrelated schedule tests were excluded.
- Full `npm run lint`, `tsc --noEmit`, production-mode build and diff whitespace checks passed.
- Actual migration SQL: **24 isolated assertions**, foundation 337/339 + 346.
- Real Auth/DB/Storage: linked/unlinked reporting, double-click one ticket, cancel/stay/reload key retention, actual MIME rejection and verified photo retry, signed private retrieval, manager update and employee history, other reporter/location read/write/photo denial.
- Eight concurrent request replays produce one ticket. Open → Assigned → Resolved → Closed and cancellation visible to reporter. Concurrent status replay creates one history. Stale status and reporter edits denied.
- Real browser pre-send failure and committed/lost-response failure both recover inline, preserve inputs/key and leave one ticket after retry.
- **21 focused UI checks**, widths 320/390/820/1440 and root font 200%, Back/Stay/Discard and filter Escape focus.
- Health acknowledgement/no unsolicited diagnostic prefetch; source transfer approve/dispatch and destination receipt/holding; invalid login passed.
- **25 populated detail routes × four widths = 100 new captures**; no captured fatal/overflow findings. Not a new claim of whole-system 128-route acceptance. Request, narrow filter and failed-response screenshots visually inspected again.
- **40 semantic routes**: no unnamed visible controls, missing image alt or root overflow. **25 routes / 148 controls**: no geometric focus obstruction or root-text overflow.
- **12 shared lists**: completed no-match state, search query preservation and navigation reset. **175 detail-role observations**: no role expectation mismatch.

Evidence lives in ignored `outputs/qa/general-maintenance-2026-10-13/`. Credentials, browser profile, .env, node_modules and build output must never be added to the release commit.

## User acceptance

A dedicated visible Chromium window is already signed in as synthetic Staff and verified at `http://localhost:3187/asset-management/maintenance/new`. Use that window directly; no password needs to be sent in chat. It is a separate browser profile, not the user's existing Codex browser login. Existing in-app browser authentication was not changed. Local services/window must stay running. If the session expires, rerun the local sign-in helper using the private fixture; do not use production credentials.

## Proposed release order — requires separate authorization

1. Review the exact local commit/patch and confirm production baseline has not advanced. If it has, rebase/verify locally without publishing.
2. Select isolated hosted preview or production explicitly. Vercel preview cannot connect to localhost Supabase; a complete hosted preview needs its own isolated compatible database/Auth/Storage and approved 346. Preview code connected to a database lacking 346 is not a complete working report feature.
3. Read target database ledger/object/ACL/private storage state. Approve **346 only** for that named target; no blanket db push and no 343/344/345 execution.
4. Apply approved 346 transactionally, check schema refresh/RLS/private attachment flows, deploy the selected app build to a staged target, run reporter+manager and cross-location smoke tests, then separately promote if authorized.
5. Roll back UI if necessary while preserving general tickets/attachments; review a data-preserving schema rollback separately.

## Residual risks and limitations

RLS/shared attachment changes require target smoke tests. Unknown historical reporters are not exposed by guessed identity. Same-key recovery works in the same browser; disabled storage/new device/new key cannot recover another session's draft automatically. Editing a payload after an uncertain save intentionally produces key conflict rather than silently changing a ticket. No physical phone/camera/soft-keyboard or manual screen-reader certification; 200% root-font checks are not universal zoom certification. No unrelated financial posting, inventory reversal, roster publication or production operation was exercised or changed.

No push, merge, deployment, production migration or production data write has occurred.
