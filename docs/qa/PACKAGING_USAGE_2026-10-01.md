# Packaging Usage redesign — 2026-10-01

The owner requested only latest outlet stock and usage trends, sourced directly from Outlet Daily Records. SKU mapping, warehouse reconciliation, long explanatory copy, repeated outlet/product tables and the empty action rail were removed from this report. Existing mapping schema and data remain intact.

Application commits: `3e193335` (UI/query redesign), `50ced56d` (bounded parallel reads). Production deployment: `FciFCxFJzq8QPYqch8DFHTjKjWZu`, Ready, Production, `system.seribako.com.my`, source `50ced56d`, v9.2.72.

Validation: TypeScript and ESLint passed; final full test suite passed 1,340/1,340. Query tests exercise latest balances outside the trend window, recorded zero versus missing received values, truncated-read rejection and the four-request concurrency bound.

The actual component was tested with disposable synthetic data at 390×844, 820×1180, 1180×820 and 1440×900. Outlet and product filtering, stock disclosure, period changes and keyboard day selection were exercised. Temporary preview route and middleware exception were removed before commit.

Authenticated v9.2.71 Production checks verified ten outlet choices, seven packaging rows, actual stock coverage/dates, product and outlet filters, 30-day report, keyboard day detail and no document overflow at phone/tablet widths. Browser error logs were empty in the inspected window. Live data was mostly recorded zero; missing products/days remained explicitly absent. These balances are recorded closing balances, not verified physical stock.

After v9.2.72 became Ready, the final page refresh rendered the correct v9.2.72 login screen because the session expired. Final authenticated verification of the parallel-read deployment remains pending a renewed user login; earlier UI verification and automated query verification are separate evidence, not a claim of that final authenticated run.
