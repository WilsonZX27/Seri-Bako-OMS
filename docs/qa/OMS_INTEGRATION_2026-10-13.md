# OMS isolated integration — 2026-10-13

Status: **local integration candidate, not full release acceptance**. No push, deployment, production migration, real schedule import or inventory write.

## Baseline and ownership

Worktree: `outputs/oms-integration-2026-10-13`; branch `codex/oms-integration-20261013`. Baseline `2dc8c0f441fe43ee02c285d8397e6dd0cc3d6b3c`, recorded as deployed by maintenance release manifest (`dpl_9rTTUyGc4ET2VYHFcrguFcrhDb71`). This is repository delivery evidence, not a new live deployment check. Existing worktrees preserved. This tree is the sole integration writer.

Included minimal source commits: maintenance `a79e9870`; checklist `b28554e0`, `7a22336e`; importer prerequisite `1384545d`; schedule matching/notes/batch/refresh/signatures `097eb7db`, `5f1a2ee1`, `4646273a`, `af9af55f`, `cbe1eafd`, `f4b08aae`. Final signature implementation is **v2**, superseding v1. Stock storage recovery applied from `/tmp/oms-stock-count-storage-fix.patch` (five files); its source worktree remains unchanged. Manifest records patch and migration hashes.

Only new migrations are **346, 347, 348, 349**. Baseline 343/344 stay byte-for-byte unchanged; 345 and unfinished 350+ work are excluded. Static public-object reference checks resolve all four migrations against baseline plus included migrations. This does not substitute for full fresh-database replay.

Documentation header conflicts preserved both module records; shared database types merged without losing either module. Maintenance and importer CSS patches coexist. No package/dependency changes; version remains 9.2.106 for this undeployed candidate. Release version assignment remains a release-stage decision.

## Current UI changes

- Date and Preview import share a desktop toolbar baseline; below the existing `sm` breakpoint they stack to retain usable controls.
- Required source issues precede the outlet summary. Recognised assignments and source notes remain disclosures; required errors are visible.
- Outlet rows use fixed count/status columns, right-aligned counts and wrapping names. Existing-day information is neutral; blocked/partial status uses warning colour.
- Counts distinguish recognised, available and selected assignments; pending selections exclude completed imports.
- No empty expanded matched-employee section when everything matches; matched rows remain available through an explicit disclosure action.
- Existing 48rem centred dialog, single scrolling body and fixed header/footer retained. No preview-only attributes copied into source.

## Verification and evidence

- Full tests: **1,584 passed / 0 failed** (`/tmp/oms-integration-final-tests.log`).
- ESLint, TypeScript and production build passed (`/tmp/oms-integration-{lint,types,build}.log`). Build-generated config changes restored; build outputs and dependency symlinks excluded.
- Local synthetic browser: two-outlet success/failure/retry, stable retry payload, successful outlet skipped, completed selection disabled. Every import POST intercepted (`/tmp/oms-integration-batch-ui.log`).
- Matching, manual employee selection, overlapping shifts, destination correction, coloured remarks and dropdown bounds at 320/390/768/1024/1440 passed. Evidence: `outputs/qa/schedule-matching`; no actual import submitted.
- Additional ten-outlet regression checks recognised/eligible/selected counts, issues above summary and desktop toolbar baseline (`/tmp/oms-integration-layout-ui.log`).
- Twelve main routes checked at five widths for document overflow/error boundaries; visible native disclosures expanded at 1440 where present (`outputs/qa/integration-ui/results.json`). This is automated layout evidence, **not** complete visual/component/interaction acceptance. Pixel review specifically checked importer desktop/mobile and attendance review desktop.
- Local SQL append/idempotency/non-overwrite and scoped refresh regression scripts passed with ROLLBACK (`/tmp/oms-integration-{append,refresh}-sql.log`). Migration 347 also replayed transactionally with ROLLBACK (`/tmp/oms-integration-347-replay.log`). No migration ledger changed.

## Explicit remaining work / interfaces

1. **Employee confirmation and payroll workflow not integrated.** Worker owns migrations 350+: People prepares → Staff checks → Supervisor verifies → Manager approves → People calculates, validates and publishes payroll. Do not call this release complete until delivered and integrated.
2. Confirmation must bind atomically to `attendanceReviewContentVersion` v2's displayed attendance projection. Rate/money/recalculation-only changes must not invalidate unchanged employee attendance confirmation. Source revision/hash remain freshness/audit evidence. Refresh runner still needs delivered workflow's confirmed/published protections and legacy-day admission policy.
3. Real workbook/catalog verification belongs to task `01a1364f-6744-7364-830d-77a59db370a8`; this integration task has not accessed its production browser/session.
4. Local shared fixture lacks persistent migration347 RPC `get_my_maintenance_actions`; pending-actions logs report it missing even though pages render. Transactional migration replay passed but **full checklist notification integration E2E remains pending** in a fully provisioned isolated integration database. Shared fixture was not migrated to hide this gap.
5. Route/component/state matrix includes **121 route owners**. Only recorded runtime evidence counts as checked. Loading, empty, error, long-content, 200% zoom, role combinations and most routes remain pending. Dedicated importer failure tests cover importer failure only. Do not extrapolate first-page screenshots to all components.
6. Stock recovery has behavioral storage failure tests; actual affected-device incident and real record recovery remain unverified. No promise that unsaved lost input has been recovered.

See `OMS_INTEGRATION_MANIFEST_2026-10-13.json` for include/exclude hashes and `OMS_INTEGRATION_UI_MATRIX_2026-10-13.json` for route → shared component → state inventory. `scripts/integration/ui-state-inventory.py` regenerates the static inventory and intentionally resets runtime coverage; preserve/merge runtime evidence when regenerating.
