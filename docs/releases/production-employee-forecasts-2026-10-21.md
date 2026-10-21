# Employee forecasts and bounded production allocation

Scope: KL Production Planning. Production base: `bfe3afbbd1d1786aa94049fdd9ccc4e6a893b020`. The release checkout is the attached `codex/kl-employee-forecasts` worktree, excluding unrelated local UI and migration 368.

## Behavior

- Owner/Manager maintains distinct nullable weekday/weekend employee forecasts per kitchen/outlet/product. Zero is explicit no recurring demand; blank remains unknown. Forecasts do not become fixed minimums.
- CSV import matches exact outlet names and product codes, rejects duplicate/invalid/unmatched rows atomically, and fills empty cells. Business quantities are not bundled into public application assets or committed to the repository.
- Eligible completed history uses the preceding 30 days and matching weekday/weekend type. At least five comparable valid observations are required for employee-history adjustment. Drafts, unconfirmed receipts/waste, events and nonconserving daily rows are excluded. Multi-day/manual products retain employee input without inferring daily sales.
- Employee forecasts anchor a configurable gradual reduction limit. Possible sell-through or unknown stockout observations prevent automatic reductions. A buffered 80th-percentile movement reference protects demand. This is not product POS sales.
- Pair preference respects lower and upper quantity limits. Odd quantities remain when pairs would breach those bounds.
- Whole-tray surplus is allocated in bounded pairs only to destinations with at least five comparable observations and recorded wastage below 30%, within employee demand buffer capacity. No extra stock is assigned to unknown/high-wastage destinations to clear output.
- Unallocated quantities remain visible per product and prevent unbalanced submission through existing UI and database gates. Approval and dispatch remain separate. Existing approved snapshots are not rewritten.
- Rice bowls use exact bowl units. Supplied tray reference application is restricted to SC/RB product codes to avoid changing similarly named products in other categories.

## Data and authorization

Migration 369 creates RPC-write-only, tenant/kitchen scoped forecast storage, optimistic concurrency protection, audit entries and an atomic configuration wrapper. Existing minimums are preserved; previously unconfigured forecast destinations get an explicit zero fixed floor. The new table participates in company backup scope.

The authorized source CSV contains 140 rows: 20 products × seven KL outlets, each with original employee weekday/weekend quantities. Publika source forecasts are absent and must remain unknown. Source CSV is kept only in ignored task outputs. No product prices or old costing estimates are imported as current costs.

## Verification

- Scoped forecast, CSV, generation, server-action and review tests.
- Isolated PostgreSQL workflow: 120 checks including zero/null, stale saves, role/tenant routes and atomic rollback.
- Production-based Next.js build and lint/type checks.
- Synthetic browser import preserved an odd quantity and explicit zero.
- One pre-existing broader layout test could not load the unrelated UnifiedListHeader CSS module in its legacy test harness; the focused feature tests pass.

## Rollout observations

Migration 369 applied alone. Before rollout, the live system had 13 plans, zero production delivery orders and 692 daily records. New forecast table was empty. The unrelated hidden `MC03` Red Bean had no batch rule. An initial settings save was rejected by automatic review before any write due to that non-target draft input; the unsafe draft was discarded. The reference-yield scope guard was added before re-import.

## Activation

Production v9.2.129 promoted successfully (deployment `dpl_BqHTY3kghBDW1j3uZSMPqt6Ny6GF`). Live readback verified 140 forecast rows match the source CSV exactly; Publika remains blank. All 20 SC/RB batch rules use same-day history; four rice bowls use unit yield 1. Existing KL Hawthorn yield 28 is preserved (the supplied PNG yield is not applied to KL). MC03 remains unconfigured. All 160 destination floors are zero. Buffer and maximum decrease remain 10%; scheduled generation remains disabled.

Draft `d2c8ebad-202a-450d-aba7-1b49d75a17e9` for CK @ PJS10, 2026-10-22: 20 products, 160 allocations, 140 employee-based allocations, 948 units allocated, 1,087 output units including bowls, 139 unallocated units across 15 products. Sixteen odd destination quantities remain where bounding or existing history requires them. High-wastage employee destinations received zero surplus additions. Preview & submit is disabled while balance checks remain. No approval or dispatch was performed. These are plan quantities, not measured savings or actual waste.

Verification completed: 56 scoped JavaScript checks and 120 PostgreSQL workflow checks passed; production build succeeded. Screenshot saved in ignored task outputs as `live-production-draft.png`.

