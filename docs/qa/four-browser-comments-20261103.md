# Four browser comments, 2026-11-03

Source: four user screenshots on immutable axap67905 (v9.2.168), not the current 2c0f9dd5 candidate. Keep these IDs separate from previous batches.

1. PO compact list: reuse receiving/PR supplier, quantity, location and date metadata classes and full-width detail tracks. Preserve document and linked PR navigation, delivery date, totals and statuses.
2. White/green alternating rows: current base has already removed even-row stripes; no duplicate CSS override added. User's old deployment still shows them. Current candidate authenticated render could not be checked: navigation reached login. Remains live verification pending.
3–4. Account-menu attendance: workspace tabs and empty-state Review link must obey existing route role and permission checks. Hide inaccessible links, preserving authorised paths. Do not grant Purchasing schedule/attendance access or fabricate personal records. Prepared confirmation snapshots already display planned times and actual punches; absence of a prepared confirmation does not prove absence of raw attendance. Account-menu destination itself unchanged.

Actual Chef session found in existing old-host tab: TEST CHEF/Chef. Schedule loads a published week, eight staff, own TEST CHEF row unassigned, published controls disabled. This is old-host real evidence, not candidate Chef acceptance. Candidate host previously Purchasing now reaches login on navigation. No account switching, authentication copying, or real writes.

Local: typecheck passed; lint/diff check recorded at delivery. No new tests requested/run in this pass. New layout and nav require rendered responsive/role verification before being considered accepted. No push, SQL or Production changes.

## Follow-up verification and combination

- Applied transfer-width commit b062c31b cleanly as a3081946; no overlapping source. Keeps UUID links and does not enable numbering.
- Twelve targeted checks passed: PO four, transfer four, attendance route access four (Purchasing/Chef/Outlet/Owner synthetic permission maps running actual route policy).
- Typecheck passed after PO refinement. PO delivery date now shares metadata row with linked PR rather than extending identity block.
- Actual row templates rendered with synthetic data and baseline compiled CSS (styles unchanged). Viewed 390/820/1440 screenshots in /tmp/oms-four-comments-evidence. These are isolated row-component renders, not full pages; PO desktop table remains unchanged and is not represented by the row fixture. GRN sampled rows share transparent backgrounds over the same white surface. 820 scrollWidth equals820.
- Actual attendance nav component rendered for four synthetic roles. At1280 correct permitted links shown. Attempted390 viewport override did not take effect (DOM innerWidth remained1280); do not label that screenshot mobile acceptance. No full-page attendance responsive acceptance claimed.
- Actual Chef old-host v168 Products:55 records, MC search0. Purchasing current candidate previously63/MC7. Different deployments: this does NOT prove role-caused filtering. Current candidate getProductsWorkspace explicitly includes outside-supply-period products; same-candidate Chef comparison remains required.
- Current candidate session reached login; old-host Chef remains valid. No credential transfer or real data writes.
