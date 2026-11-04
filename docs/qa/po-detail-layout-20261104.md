# PO detail desktop layout correction — 2026-11-04

Source: current authorized Owner Preview16501bb PO-000358 screenshot25-po-detail-1440. Ordered Items has ten auto-sized columns; item/comments consume intrinsic width and ending Unit Price/Comment/Line Total are outside the initial canvas. Independent sourcef28785c.

Fix: retain all ten columns and same row data, add bounded proportional columns with the existing semantic table/visible scrollbar. Table remains at1280 breakpoint; smaller canvases scroll at a readable minimum. Index padding is compact; long item/comment text wraps. No monetary/quantity calculations, query, permission, mobile card or server action change.

Verify existing purchase-order/comment contracts, source column total, static same-markup geometry and long amount/comment cases. Changed authenticated Preview remains pending integration; no deploy or real writes.

## Results

Six targeted checks pass; targeted ESLint and full TypeScript noEmit pass. Static same-markup browser fixture uses current authorized PO-000358 table output with exact source classes/column widths and house compiled CSS; real server/actions are absent. Table/canvas770px, no header/cell horizontal clipping. Synthetic RM1,234,567.89 retains one line with123px monetary columns; long comments wrap rather than truncate.610px canvas keeps736px minimum with thin visible scrollbar and tabIndex0. Mobile cards unchanged. These are local geometry checks, not deployed/hydrated after-Preview acceptance.

Evidence and logs outside source: `/Users/seribako/Documents/Codex/2026-11-04/task/preview-16501bb/po-lines-local-fixed.png`, `po-lines-edge.png`, po-detail-tests/lint/types.log. Only the final saved screenshots represent the accepted local widths; earlier trial captures were overwritten. No full build/all-suite claim.

Continuation audit added Stock Balance, Items, Products, Stock Transfers, Stock Wastage and Low Stock. Navigation to supplier-invoices redirected to login; invoice content and subsequent Suppliers remain unreviewed. No repeated login/role switch attempted; browser login tab retained and viewport reset. Third-batch report in the same evidence folder.

## Integration verification

Applied cleanly on f28785cddcf65e9ea359e3e8163faad1fb5eebd3. New test imports converted to ES syntax without changing assertions. 13 targeted checks pass, including PO comments/mobile and prior audit/MC07 regressions. Changed-file ESLint, TypeScript noEmit and whitespace checks pass. Author static geometry evidence retained; integration has not repeated browser geometry or authenticated Preview acceptance. No deployment or real-data writes.
