# Packaging Usage redesign — 2026-10-01

The owner requested only latest outlet stock and usage trends, sourced directly from Outlet Daily Records. SKU mapping, warehouse reconciliation, long explanatory copy, repeated outlet/product tables and the empty action rail were removed from this report. Existing mapping schema and data remain intact.

Application commits: `3e193335` (UI/query redesign), `50ced56d` (bounded parallel reads). Production deployment: `FciFCxFJzq8QPYqch8DFHTjKjWZu`, Ready, Production, `system.seribako.com.my`, source `50ced56d`, v9.2.72.

Validation: TypeScript and ESLint passed; final full test suite passed 1,340/1,340. Query tests exercise latest balances outside the trend window, recorded zero versus missing received values, truncated-read rejection and the four-request concurrency bound.

The actual component was tested with disposable synthetic data at 390×844, 820×1180, 1180×820 and 1440×900. Outlet and product filtering, stock disclosure, period changes and keyboard day selection were exercised. Temporary preview route and middleware exception were removed before commit.

Authenticated v9.2.71 Production checks verified ten outlet choices, seven packaging rows, actual stock coverage/dates, product and outlet filters, 30-day report, keyboard day detail and no document overflow at phone/tablet widths. Browser error logs were empty in the inspected window. Live data was mostly recorded zero; missing products/days remained explicitly absent. These balances are recorded closing balances, not verified physical stock.

After v9.2.72 became Ready, the final page refresh rendered the correct v9.2.72 login screen because the session expired. Final authenticated verification of the parallel-read deployment remains pending a renewed user login; earlier UI verification and automated query verification are separate evidence, not a claim of that final authenticated run.

## v9.2.73 workspace and interaction verification

- Restored WorkspaceGrid contextual rail and ConsoleSection actions/status using the system components. Shared FilterBar, SelectNative and InteractiveLineChart replace page-specific controls/chart.
- The server reads a bounded month once; 7/30-day, outlet and product selections only update client state. The header and report loading fallback stream before the data read completes. This avoids the previous report request on each period switch, but does not claim a faster initial database read; opening the 7-day view now also reads the bounded month.
- Local browser fixture (temporary route removed before commit): desktop 1280, tablet 1024x768 and phone 390x844. Phone/tablet document widths equalled their viewport widths (no horizontal overflow). Verified mobile actions sheet, keyboard chart selection updating the rail, single-outlet totals and period-independent latest balances.
- Local period selection automation returned in 35 ms; this is tool interaction latency on fixture data, not a production load benchmark. No before/after production timing is claimed because the authenticated production session expired and new navigation redirected to login.
- Added executable shared-chart regression checks: missing dates break paths, recorded zero retains its circle, complete charts remain continuous. Existing packaging query checks pass.
- TypeScript and ESLint passed. Full regression: 1342/1342 passed after rerunning with local-port permission (the sandbox initially blocked an unrelated server lifecycle test).
- Screenshot `/tmp/packaging-v9273-desktop.jpg` is the verified layout with synthetic fixture data, not real stock.

- Production deployment `LW34wuPhEB4sYo9UiPiNAYeRwzBD` Ready, source `e7cf3b447b8c51bbada3866647041e029e39c71f`, custom domain `system.seribako.com.my`, release v9.2.73. Reloaded the formal-domain login page and verified its footer is v9.2.73. Login remained expired, so authenticated production report rendering and initial-load measurements remain pending user sign-in.
- Production proof screenshot: `/tmp/packaging-v9273-production-ready.jpg`.
