# v9.2.136 Integrated UI Preview

Preserves all9.2.134 UI updates and restores Production2d89524c product saves, employee forecasting, saleable carryover, safe allocation, backup dataset and Daily saleable input/audit contracts. Historical369/370 migration files restored byte-for-byte; no migrations executed. No Chef SQL or access changes. Production remains unchanged.

## Evidence and limits

Actual Production provenance:2d89524c /dpl_ECf4TPgezkaP4KiRbzvv68ifbWEf. Base of this candidate:774810692007f043ca2791170a5e34e87f41b143. All new UI changes retained, including the tablet planning rail. Product/Daily/planning business actions, planning data loader, backup dataset and historical migration369/370 files match Production byte-for-byte. Additional forecasting table TypeScript declaration follows369; no schema execution.

Node22.23.4:77 product/forecast/carryover focused checks,12 reconciliation checks,2 actual Daily schema/audit fixtures pass. Final full suite1784total1779pass5fail, same five names as134; no additional failure. Four historical layout-contract failures and one browser submit-lifecycle contract remain open, not dismissed as harmless. Production product failed-form feedback and permission/tenant checks retained. No real business submission used for tests.

Previous integrated full suite had9fail; planning tablet rail was restored, missing forecast table type/docs reconciled, and stale PenangChrysanthemum expected-null corrected to the verifiedProduction32 with non-steamed-code negative coverage. Assertions were retained and strengthened.

Core restored behavior is exercised by isolated fixtures; live write outcomes, other roles, browser lifecycle/bfcache and performance remain unverified. Preview smoke is separate from build success. Chef roster SQL and other new business features remain excluded.

Final typecheck0, whole-source ESLint0, synthetic-config Next build0. Remote hosted build and authenticated screenshot smoke pending at commit time.
