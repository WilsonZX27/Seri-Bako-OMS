# Preview16501bb audit corrections — 2026-11-04

Source: current Owner/WILSON authorized Preview at paylllu98, mapped by Vercel metadata to16501bb80b990a72bd954434ccf0cd7efa23c520. Screenshots first, no real writes. Independent archived source workspace.

Confirmed issues: PO and GR desktop tables824px within810px canvas clip the rightmost value initially. GR region remains keyboard-scrollable (ArrowRight scrollLeft12.5); issue is initial visibility/affordance, not inaccessible data. Supplier144px columns plus51rem minimum exceed canvas. Dashboard schedule cards have branch_name available from existing scoped query but omit it, making three same-week targets indistinguishable.

Change scope: reduce only supplier columns to128px and table minimum to50rem; preserve other columns, date, status, numeric precision and tablet scroll; opt into house visible scrollbars for smaller canvases. Render existing branch_name on schedule cards only. No query, permission, server-action or business-rule change. Keep unknown branch explicit.

Verification planned: existing procurement/dashboard tests, rendered schedule labels with distinct branches, source table column bounds and local browser geometry. Authenticated changed Preview pending; no deployment.

## Local results and handoff

18 relevant tests pass; targeted ESLint and full TypeScript noEmit pass. Static table fixtures use captured PO/GR markup plus exact source class edits and house compiled styles: each table/canvas/scrollWidth810px at1440. These are geometry checks, not hydrated after-Preview acceptance. Schedule branch labels tested through actual Dashboard component rendering, including unknown fallback and preserved links. No full build/all-suite claim.

Current authenticated coverage: Dashboard; Daily list/detail/beverage; Planning empty; Production Jobs empty; GR; PR; PO; Asset overview/checklist/maintenance; Inventory.13surfaces/states,11route/view targets,1440/390 first-view samples; detailed report and exact screenshots outside source at `/Users/seribako/Documents/Codex/2026-11-04/task/preview-16501bb/AUDIT.md`. Original Daily72px,末列和long-location corrections were verified in exact16501bb live samples. All unvisited modules, tablet widths, detailed business flows and other roles remain pending.

Patch based on16501bb; deployment/changed authenticated Preview/actual acceptance not performed. No blocker to current Preview access. No new business rules; original tree untouched.

## Integration verification

Applied cleanly on 0d540080f074617ca0bc131ac73dc2be4bfb291f, retaining MC07 label corrections. New test uses ES imports with the existing CommonJS fixture default export; assertions are unchanged. 18 targeted tests pass, including MC07 and unaffected dashboard/mobile contracts. Changed-file ESLint, TypeScript noEmit and diff whitespace checks pass. No deployment or new authenticated visual acceptance performed.
