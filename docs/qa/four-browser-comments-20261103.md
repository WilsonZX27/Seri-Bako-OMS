# Four browser comments, 2026-11-03

Source: four user screenshots on immutable axap67905 (v9.2.168), not the current 2c0f9dd5 candidate. Keep these IDs separate from previous batches.

1. PO compact list: reuse receiving/PR supplier, quantity, location and date metadata classes and full-width detail tracks. Preserve document and linked PR navigation, delivery date, totals and statuses.
2. White/green alternating rows: current base has already removed even-row stripes; no duplicate CSS override added. User's old deployment still shows them. Current candidate authenticated render could not be checked: navigation reached login. Remains live verification pending.
3–4. Account-menu attendance: workspace tabs and empty-state Review link must obey existing route role and permission checks. Hide inaccessible links, preserving authorised paths. Do not grant Purchasing schedule/attendance access or fabricate personal records. Prepared confirmation snapshots already display planned times and actual punches; absence of a prepared confirmation does not prove absence of raw attendance. Account-menu destination itself unchanged.

Actual Chef session found in existing old-host tab: TEST CHEF/Chef. Schedule loads a published week, eight staff, own TEST CHEF row unassigned, published controls disabled. This is old-host real evidence, not candidate Chef acceptance. Candidate host previously Purchasing now reaches login on navigation. No account switching, authentication copying, or real writes.

Local: typecheck passed; lint/diff check recorded at delivery. No new tests requested/run in this pass. New layout and nav require rendered responsive/role verification before being considered accepted. No push, SQL or Production changes.
