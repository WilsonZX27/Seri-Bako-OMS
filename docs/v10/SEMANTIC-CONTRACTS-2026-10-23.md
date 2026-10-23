# Presentation semantics without claiming visual acceptance

Base: READY 9.2.130 `7a93b982ced66093ec687a4619bab13cf5c020a6`.

This bounded batch addresses three of the thirteen remaining failures. It changes tests and release records; production source is identical except the displayed release version/title.

1. `purchase registers use the requested two-line information order`: the old literal expected `label="PR number / Priority"` and one `Location / Requested by` text node. The accepted implementation has PR number + Priority separated by a br, and Location + Requested by in separate block spans. The new fixture extracts the actual page's header and row JSX templates using TypeScript AST, renders the actual shared Table/SortableHead/DocumentNumber/PriorityBadge/StatusBadge components, and checks all eight columns and eight values in exact order. It verifies request number, urgency, dates, canonical branch, submitter, supplier, status, line count and RM amount, plus the actual detail link. The existing PO order-value check remains.
2. `August 19 annotation closure groups PR data, simplifies loading, and standardizes outlet analytics`: replace only the stale single-text-node header assertion with the same full rendered header schema. Every other loading, pagination, analytics and tablet/CSS contract remains, so a passing header cannot conceal failures in those requirements.
3. `product and design baselines identify released authority and the current forward patch`: recognise the programme's accepted Preview candidate label and execute the actual release guard. The guard verifies package, lockfile, footer constant, latest PRODUCT/DESIGN headings and unique matching notes. Historical released authority and schema/metric assertions are retained. This is stronger than accepting a header regex alone; it does not label a candidate as accepted Production.

Additional SSR cases verify all sorting links retain search/status, reset page to 1, and use the correct sort/direction. A zero-lines/zero-amount row and unresolved supplier remain explicit rather than becoming blank or misleading. Fixtures contain synthetic values only; no server queries, auth or actions execute. Bulk checkbox and row wrappers are isolated scaffolding; their interaction is not tested here.

Evidence is server-rendered markup, not screenshots, CSS layout, browser focus or live-role acceptance. Remaining color, right-rail behavior, overlay and external-submit/browser-lifecycle contracts must not be marked correct from this helper. No old assertion was replaced with whichever class names the current source happens to contain.

Live metric and Browser capability gaps remain unchanged. No unavailable connector was reprobed, and no cache, logging, database, permission or infrastructure setting changed. The original five-file fixture patch was already integrated in 9.2.130 and was not reapplied.

## Final comparison and remaining scope

Official Node 22.23.4 full suite: 9.2.130 baseline 1,719 / 1,706 pass / 13 fail; this candidate 1,721 / 1,711 / 10. No added failure. The exact three named contracts above pass and two additional SSR regression cases execute. Typecheck and release increment/consistency checks pass. No unchanged local full compilation was repeated for this test/document/version-only batch; exact hosted compilation remains a publication gate.

Remaining ten failures: Dashboard panel/compact-summary hierarchy; Daily posting copy; Dashboard role/finance composition; role workdesk permitted links; responsive query ownership; Daily phone pinned controls; tablet console smoke; semantic overlay layers; external-submit/browser lifecycle. Some role/copy requirements can be investigated with a dedicated SSR fixture batch; actual layout, focus, bfcache and stacking require a browser. None is silently waived or counted as a rendered pass. Browser and live-performance access limits remain those in PERFORMANCE-CACHE.md.
