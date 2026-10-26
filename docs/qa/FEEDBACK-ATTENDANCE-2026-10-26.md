# Direct user batch: six browser comments plus attendance requests

Separate from release154. No new Preview/Production publication, business SQL, historical recalculation, role activation or stock writes executed.

| Request | Owning source / local implementation | Activation / evidence limit |
|---|---|---|
| C1 Dashboard descriptions lighter | dashboard-workspace marker; shared secondary ink400, document heading unchanged | Four-width synthetic actual component |
| C2 Manager Items | Only /items IA entry adds manager; /items child mutation roles unchanged; permission migration372 requires explicit approved oms.target_company_id | View only; migration NOT applied; no real Manager session tested |
| C3 Daily numeric alignment | Actual quantity row inputs text-center; payload and permission logic unchanged | Four-width actual form fixture; no record edits |
| C4 staff Status | Shared StaffIdentityFacts uses existing StatusBadge | No account/status changes |
| C5 same staff identity design/order/email | Overview and security use same component; staff code/username/locations/email/phone/status; account/last sign-in retained below | Existing server access guards unchanged |
| C6 independent packaging stores | Owner entry; separate stores/balances/immutable movements; count-first unknown opening; receipts/issues/physical counts with reason; combined known subtotal separately labels outlet/store coverage and unknowns | Pending373; no store seeded or real movement. Unknown is not zero. Owner only, no broader role grants |
| A1 ignore repeat taps within minute | TS pairing + pending371 weekly/day SQL normalizers retain first event in <60sec anchored window; 60sec boundary retained; all raw punches preserved with ignored count; wrong-source warning uses raw source evidence | Future calculation after migration only. No auto history rewrite; affected historical results need separately approved scoped recalculation/OT-claim review |
| A2 some workbook OT missing | Approved-only existing rule confirmed; 0:00 means no approved OT hours result (there may be no OT or no approval), blank means incomplete evidence/no result; pending under exceptions; legend added to export/workbook | Does not prove any supplied real workbook row cause because no workbook was provided; no OT approvals or payroll recomputation |

## Strict activation order for this batch

1. Verify exact live calculator revisions against352/354 and fail on drift. Migration371 replaces only normalization/evidence metadata, retaining tenant/permission/pay/OT logic. No bulk recalc in migration.
2. Review/approve target company UUID for372. Set `oms.target_company_id` only in the activation transaction; missing target raises. Verify only that company's Manager items.view changed; other permissions/companies unchanged. Manager list nav/route UI is included; new/edit/import remain excluded.
3. Approve373 separately: fresh absent-table/function check, apply transaction, then independent postflight of tables, immutable created_at/id cursor, tenant/Owner RPC ACLs and direct-DML revokes. No business data initialization.
4. **373 and its postflight MUST pass before deploying this application batch**, because backup datasets include ledger tables. Missing schema stops backup explicitly; never skip it or claim a complete backup. Do not deploy this batch as UI-only. Existing154 does not include these datasets/migrations.
5. After normal local/isolated verification, obtain staged release approval and legitimate role/session evidence. Real business mutations and historical payroll/attendance rewriting are separate approvals.

## Local verification

Evidence /tmp/oms-feedback-attendance-evidence-20261026. Fresh network-none/no-port/no-business-volume PostgreSQL container: helper/weekly/day functions compile; helper exercised. Ledger synthetic guards include unknown opening, repeat key, key conflict, stale version, negative stock, cross-company product/store, nonOwner, direct table reads; two concurrent version3 counts commit exactly one and retain created_at. Complete weekly/day payroll calculations were NOT executed in this fixture; existing TS regression is separate. Company-limited Manager seed proven without real role changes. Initial database role mismatch stopped before schema work, corrected to test-container owner.

Browser: four widths390/430/820/1440 actual Staff pages, DashboardWorkspace, OutletDailyRecordForm and store page, all synthetic data. Store fake ServerAction tests success→explicit full GET→fresh request key, not real ledger update. No real role impersonation or live business account changes. Optional store-read failure has independent unavailable state and leaves outlet report available. These do not replace real business UAT.

Skills: Karpathy/ponytail minimal ownership fixes; impeccable existing Operate/shared component rules; ui-ux-pro-max existing label/contrast/interaction guidance. Graphify remains unavailable (prior doctor: no CLI/graph); no graph traversal/install claimed.
