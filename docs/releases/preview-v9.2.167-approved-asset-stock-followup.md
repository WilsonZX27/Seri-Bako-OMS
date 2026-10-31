# v9.2.167 — Approved transfer display, current-count items and maintenance grouping

Document-scoped endpoint/requester display through approved376; current stock-count added items saved through approved377; same asset ID maintenance grouping before pagination with original requests/history preserved. No basket, login, Asset Settings or ODR changes. SQL installed separately on 2026-10-31; no production business-write QA.

User approved SQL and matching app plus maintenance grouping at 06:19 UTC. Base166 SHA648b8729377f432737797f448afdadd2134181d3. Final merged tests and build required. Rollback app to166 first; preserve drafts, audit and numbers; revoke/drop only new functions if needed. Actual Chef and business submission acceptance remain separate.
