# OMS isolated integration — 2026-10-13

Status: **local integration candidate, not full release acceptance**. No push, deployment, production migration, real schedule import or inventory write.

## Baseline and ownership

Worktree: `outputs/oms-integration-2026-10-13`; branch `codex/oms-integration-20261013`. Baseline `2dc8c0f441fe43ee02c285d8397e6dd0cc3d6b3c`, recorded as deployed by maintenance release manifest (`dpl_9rTTUyGc4ET2VYHFcrguFcrhDb71`). This is repository delivery evidence, not a new live deployment check. Existing worktrees preserved. This tree is the sole integration writer.

Included minimal source commits: maintenance `a79e9870`; checklist `b28554e0`, `7a22336e`; importer prerequisite `1384545d`; schedule matching/notes/batch/refresh/signatures `097eb7db`, `5f1a2ee1`, `4646273a`, `af9af55f`, `cbe1eafd`, `f4b08aae`. Final signature implementation is **v2**, superseding v1. Stock storage recovery applied from `/tmp/oms-stock-count-storage-fix.patch` (five files); its source worktree remains unchanged. Manifest records patch and migration hashes.

New migrations are **346–351**. Baseline343/344 stay byte-for-byte unchanged;345 is excluded. Final employee confirmation/export integration and runtime corrections are described below.

Documentation header conflicts preserved both module records; shared database types merged without losing either module. Maintenance and importer CSS patches coexist. No package/dependency changes; version remains 9.2.106 for this undeployed candidate. Release version assignment remains a release-stage decision.

## Current UI changes

- Date and Preview import share a desktop toolbar baseline; below the existing `sm` breakpoint they stack to retain usable controls.
- Required source issues precede the outlet summary. Recognised assignments and source notes remain disclosures; required errors are visible.
- Outlet rows use fixed count/status columns, right-aligned counts and wrapping names. Existing-day information is neutral; blocked/partial status uses warning colour.
- Counts distinguish recognised, available and selected assignments; pending selections exclude completed imports.
- No empty expanded matched-employee section when everything matches; matched rows remain available through an explicit disclosure action.
- Existing 48rem centred dialog, single scrolling body and fixed header/footer retained. No preview-only attributes copied into source.

## Integrated verification — 2026-10-14

Confirmation/export worker commits `4c39164a`, `69901574` are integrated as `d6a04ba7`, `63185a60`. New migrations are **346–351**; 343/344 remain unchanged and 345 remains absent. Version stays 9.2.106; no deployment or production writes.

Dedicated synthetic stack `oms-integration-20261014` uses API58321/DB58322, app3190. Fresh bootstrap through349 and then350/351 succeeded. Ignored bootstrap copies296/333 use the existing synthetic no-ops for historical production-catalog corrections. Final350/351 function corrections were applied individually and exercised. Then a second independent empty stack `oms-integration-replay-20261014` replayed the final346–351 files successfully from bootstrap; all six file hashes match byte-for-byte and its migration ledger contains346–351 (`/tmp/oms-integration-final-replay.log`, `outputs/qa/integration-ui/final-migration-replay.json`). No existing shared stack was migrated.

### Behavioral evidence

- Checklist → general repair → actual private photo upload failure/retry → exact scoped notifications/My Actions → manager closure passed. Healthy checklist creates no repair. Eight concurrent submissions create one ticket/notification. Lost-response retries preserve the key. Other staff/branch access denied. Screenshots at320/390/820/1440. Logs `/tmp/oms-integration-{checklist-e2e,maintenance-concurrency,maintenance-network,checklist-responsive}.log`; evidence `outputs/wilson-qa/full-stack/`.
- Real stock form: both SecurityError and QuotaExceededError on local storage, server-save response loss, online retry, reload and persisted quantity passed. Mobile autosave status was hidden and is now visible. `scripts/integration/verify-stock-storage-local.cjs`, log `/tmp/oms-integration-stock-e2e.log`.
- Real two-outlet workbook: first succeeds, second injected503, identical retry skips successful outlet; each actual save automatically calculates one staff day from immutable punches. Queue ready and v2 attendance projection verified. Money-only changes retain hash, attendance changes alter it. `scripts/integration/verify-schedule-live-chain-local.cjs`, log `/tmp/oms-integration-schedule-live.log`.
- Real authenticated People prepare → Staff check → Supervisor verify → Manager approve → People calculate/approve/release passed. Owner/Finance cannot prepare or administer payroll; unrelated manager cannot read/approve this confirmation; employee sees only own released slip. Wrong hash/version, duplicate action, skipped step and early release rejected. Published payroll rejects source mutation atomically; automatic refresh marks needs_review without changing results. `scripts/integration/verify-confirmation-workflow-local.cjs`, `/tmp/oms-integration-confirmation-workflow.log`, JSON/screenshots in `outputs/qa/integration-ui/`.
- Independent PostgreSQL sessions: six prepares produce one version; six checks one event; changed attendance supersedes signatures; pay-only change preserves attendance confirmation but invalidates payroll; release/source-update race serializes. Review/refresh lock ordering no longer deadlocks. `scripts/integration/verify-confirmation-concurrency-local.mjs`, `/tmp/oms-integration-confirmation-concurrency-final.log`.
- Final integrated SQL append/idempotency/non-overwrite and scoped refresh tests passed with ROLLBACK: `/tmp/oms-integration-{append,refresh}-final.log`.
- Contract suite **1599 passed, 0 failed**. Final ESLint, typecheck and production build passed (`/tmp/oms-integration-{lint,types,build}-final.log`). Repository-required **Node22.23.2** also passed1599 tests, ESLint, typecheck and production build (`/tmp/oms-integration-node22-{tests,lint,types,build}.log`). The standalone PGlite confirmation DB suite passed on Node22 with final350/351, including the broad generic company-access fixture (`/tmp/oms-integration-pglite-final.log`).

### Fixes found by integrated testing

1. Migration350 business rejection SQLSTATE40001 made stale API calls retry repeatedly. Changed to P0001; actual API stale-hash request now returns409.
2. Generic company branch access lets managers navigate company-wide. Confirmation now requires explicit manage/full membership for both branch-scoped reads and review actions; actual cross-branch request returns403.
3. Migration351 used queue→employee locking against review's employee→queue order. Refresh now acquires employee lock first and rereads queue eligibility under its row lock.
4. Payslip nested staff join was ambiguous because confirmation has multiple staff foreign keys. Explicit staff-id relationship restores real API results.
5. Export actions use native download anchors instead of prefetching CSV routes.
6. Controls have explicit accessible names; mobile stock autosave status is visible; workbook heading is WORKING TIME; payslip navigation identifies its actual page.

### UI evidence and limits

123 authenticated page owners scanned at1440/390/320 with actual local sessions.29 owners have expanded native disclosures and24 have long editable input screenshots. No document horizontal overflow or application error boundary found. The initial `/items` and `/suppliers` networkidle failure came from Next Link prefetching export downloads. Export actions now use native anchors; both pages and the corrected payslip navigation were rechecked successfully. All123 owners settled after the targeted fixes. Seven routes redirect to shared owners.

Artifacts: `outputs/qa/integration-routes/results.json` and per-route screenshots; mobile contact sheets00–15 inspected, with focused full-size importer, stock and confirmation/payslip views. Contact sheets show only the upper portion of long pages and are not proof of complete interaction acceptance. The static component map is updated with exact runtime evidence; untested states remain pending.

Full default/populated/expanded/error/long/narrow/200% coverage of every unique layout is **not complete**. Many catalog/production states are empty in the synthetic tenant; custom dialogs, loading transitions, other role combinations and200% browser zoom remain pending. Focused error coverage exists for importer partial failure, maintenance photo/network failure, stock storage/save failure and stale confirmation/payroll state, not every form.

## Remaining handoff items

- Complete remaining unique-layout/component-state acceptance.
- Native workbook layout user acceptance remains pending. No payroll details were added to employee-facing attendance export. PPH blank is not zero; daily OT/short-hours/holiday payroll policy awaits user rules, not inferred here.
- Real workbook/catalog verification remains owned by `01a1364f-6744-7364-830d-77a59db370a8`; no production session accessed here.
- No push, deployment, production migration or production data writes. Original worktrees preserved. Unsaved input previously lost on a real device has not been recovered or claimed recovered.
