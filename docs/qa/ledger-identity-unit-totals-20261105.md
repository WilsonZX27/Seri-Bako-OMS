# Movement Ledger identity and quantity totals — 2026-11-05

Base eaa8e6b. Actual Owner Production: 1,673 filtered records (7 Oct–5 Nov), current page includes PACK and KG. Desktop Valuation shows unitless Quantity in 41.31 / Quantity out 1,703.89, reduced only over ledger.rows (the current page). Screenshot 04-ledger-desktop.png in production-audit-20261105-batch19. These are incompatible quantities and also lack page scope.

Actual transaction ST-SC/NOV26/006-20625 phone detail has item, branch and −15 PACK, but omits transaction number while the desktop header and rail show it. Screenshots 02-ledger-detail-phone.png and 03-ledger-detail-desktop.png.

Changes: detail opts into existing PageHeader showMobileIdentity; ledger quantity labels explicitly say Page quantity and require a selected item, appending its base unit. All-item view shows dashes and guidance. Monetary valuation, row numbers, filters, query, permissions and posting logic are unchanged.

37 checks pass, including 3 actual page SSR tests with data/UI fixtures: mixed KG/LITRE not totalled, single-item page total carries unit, unavailable ledger never yields zero. 34 existing mobile/action contracts pass. Focused lint passes; type result in batch log. No original annotation matching or integrated after screenshot claimed. No real data writes.

Integration verification: 15 focused render/mobile-action/bounded-ledger/stock-summary tests pass, plus focused ESLint and TypeScript --noEmit --incremental false. The bounded query filters the item before pagination; the displayed quantity reductions use ledger.rows, correctly labelled as page totals. Monetary valuation and permission checks remain unchanged. Converted new render test to ESM for project lint compatibility. Preview readiness and changed-version visual acceptance remain pending.
