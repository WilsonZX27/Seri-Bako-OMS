## v9.2.86 (deployed) — annotated operational density correction

The owner's 2026-10-04 annotations supersede the previous 44px desktop Planning treatment: operational query and Planning controls are 36px from 768px; normal WorkspaceTabs use 36px tabs and a 46px outer surface. Phone controls retain 44px. Planning's desktop Adjust is a 23px visual command in the requested #7c9b8d with white text; other primary actions retain the OMS green. View commands share #e7f1eb / #084b37. This applies through the existing shared owners, including Daily Records and Insights; Packaging's approved compact filter composition is preserved. SAP Fiori's compact/cozy distinction is a category reference, not a copied theme: https://www.sap.com/design-system/fiori-design-web/v1-136/foundations/visual/cozy-compact.

The worksheet fixes outlet tracks at 112px rather than distributing unused width between inputs. A 32px indexed lead column and 200px product identity remain frozen; the 136px read-only summary shows unknown values as a dash, never zero. Separate borders and opaque header cells establish stable vertical/horizontal stacking. Adjust opens the existing focus-managed ModalShell, with local trays/reason editing, Apply/Automatic/Cancel; cancelling leaves production unchanged. The unsaved-switch dialog uses a 448px maximum instead of 1024px. Settings uses two vertically stacked shared surfaces in the same form and removes the annotated paragraph. Insights date is capped at 168px, count joins the action group, and Received/Wastage/Rate toggle numeric sorting with aria-sort, stable name ties and unknown values last. Only the two needed aggregate lists cross the server/client boundary.

Source verification: `01.SERI BAKO ALL KUIH ORDER.xlsx`, coded V2 sheets and matching explicit original yield column, confirms SC01/SC02/SC15/SC16 = 16, SC07 = 28, and SC03–SC06/SC08–SC14 = 32. PJS10's previously empty configuration was populated for these 16 products through the normal Manager Settings action, recorded by its audit, with demand basis manual, minima unfilled, automation disabled. Existing 2026-10-05 PJS10 v1 was found in draft with zero entered allocation/production values; normal Recalculate refreshed its yield snapshots. No new plan, formal order, approval, dispatch or inventory transaction was created. Alma and other products have no confirmed kitchen-specific source in this workbook and are not inferred. The workbook's variable daily allocations are not minimums or new demand orders. Database schema remains reviewed through 330; permission-warning closure, wider cold/tail latency and historical Packaging closing provenance remain separately tracked.

Strict TypeScript, lint, 1,406 regressions and 85 isolated PostgreSQL checks pass. Initial v9.2.86 deployment H4yqJVriUnaWeRyLhPWiV6aMzhus is READY and aliased to the formal domain, with sin1 independently inspected. Formal responsive and interaction evidence, including the final row-divider follow-up deployment, is recorded in docs/qa/OMS_PRODUCTION_REWORK_2026-10-04.md.

## v9.2.85 (deployed) — measured outlet reporting performance

Migration 330 is applied: Daily Records resolves the original authorized branch predicate once per statement; child lines inherit the same parent SELECT RLS via a set. No persistent permission cache, changed company/outlet access, write policies, operational values or stock posting. Live rollback comparison across eight active role categories returned identical parent/line/report results. Same Owner, date and 30-day Packaging EXPLAIN ANALYZE: 3,277.739ms before, 151.633ms after (95.4% reduction); this is database execution time, not full browser latency. Migration 325 remains pending and unrelated Advisor findings are not claimed cleared.

Packaging uses request-scoped React cache deduplication only, keeping fresh RLS across requests; local chart series are memoized and grouped in one pass. Insights cost and report reads run independently in parallel. Shared IntentPrefetchLink warms opted-in Planning/Daily Records/Insights tabs only on pointer or keyboard intent, with duplicate warming suppressed; no eager viewport loading of every report. Successful daily save/post/void and Planning writes invalidate Insights and Packaging route data. Forecast results continue to be persisted in plan versions; no new materialized inventory or historical confirmations are introduced. Cross-request report TTL caching is deliberately not enabled without a verified permission/freshness version key. Source convention follows Next.js request/route caching and PostgreSQL statement-level RLS semantics.

Vercel functions are configured in sin1 to colocate with the confirmed ap-southeast-1 database; build location is not used as runtime-region evidence. Deployment 2Fj2GWKnfE47gAiEAWqLgEYbghpq (af6ec8d9) is READY and aliased to https://system.seribako.com.my; inspect independently confirms serverless functions in sin1. Authenticated Packaging and Insights show v9.2.85 and load their reports without browser errors. Browser reload-to-visible observations include automation overhead and are not a precise end-to-end benchmark. Isolated scope tests cover company A/B, outlet, routed kitchen, missing assignment/identity, denied permission, immediate scope changes and orphan/anonymous denial. Final test/build counts and screenshots belong to docs/qa/OMS_PRODUCTION_REWORK_2026-10-04.md.

## v9.2.84 (deployed) — compact Planning and explicit query actions

Current release is v9.2.84; final deployment 6uZJm6wU86VskGmYcA3X79BFR2ke (commit 265580f6) completed and aliased to https://system.seribako.com.my. The scoped control-density follow-up is independently verified on the formal page: 44px controls, 200px product column and 136px system summary. v9.2.83 procurement fixes remain included. v9.2.82 also deployed successfully (AxE6dgNLNZYeBPdwapb5TTg9aEuz); its UI acceptance was superseded by the approved layout rework. This version reuses WorkspaceGrid, WorkspaceTabs, FilterBar, Table, SelectControl, Input, Button and ModalShell. No new visual foundation or decorative motion.

Planning and Insights use the backward-compatible FilterBar actions slot; fields precede a right-aligned submit action. Planning scopes 44px controls to its workspace and portal actions. Product identity (200px) and calculated summary (136px) precede outlet quantities (112px) and kitchen retention (96px). ResizeObserver groups outlets using actual container width; full overview scrolls within the worksheet. At <768px the shared responsive-field owner disables the hidden matrix and provides one-outlet cards; at 768–1023px the rail stays in More to preserve editing width; landscape tablets use the existing split rail. Search, category and group changes retain parent-owned unsaved inputs. Existing consumers retain the 1280px responsive-field default. Date/kitchen/version and workspace-tab navigation use the shared confirmation modal for save/discard/cancel.

Automatic trays = ceil((approved outlet demand + independent event quantity)/yield); retention allocates surplus and never manufactures demand. Manual override is explicit and reasoned, with Restore automatic. Migration 329 adds nullable tray_mode, recomputes automatic drafts in SQL, validates review snapshots and preserves legacy NULL modes, old clients and approved versions. Event Details and Products & Quantities are separate visible shared surfaces in one form; Scheduled Events moves to the right rail and below the form on portrait/mobile. Destination/date supply resolution is permission-gated and company-scoped; missing/conflicting effective primary routes block confirmation. Saving rechecks the route. Corporate events require explicit kitchen selection.

Repository migrations reviewed through `329`; applied Production migrations include 324, 326, 327 and the independent Goods Receiving fix 328. Migration 329 is applied with its function definitions and preserved ACLs independently verified; all 52 historical product rows keep NULL mode and unchanged quantities. 325 remains pending explicit permission approval. No local Supabase, fabricated Production orders, approvals, dispatches or inventory writes. Strict TypeScript, lint, 1,404 regressions and 85 isolated PostgreSQL checks pass; Hosted build succeeded. Authenticated Planning and Insights at 390/820/1180/1440px have no root horizontal overflow; screenshot evidence is recorded in the QA ledger. Final Events and shared-consumer acceptance remain pending after the session expired again. Login was restored for the completed checks. Initial read-only checks verified search/overview preserve zero, unsaved switching exposes all three choices, Cancel restores focus to View plan, and test values were discarded without saving. Permissions warnings, 30-day Packaging query performance and verified closing-stock provenance remain open in the QA ledger.

## v9.2.83 (deployed) — Purchase Request list chronology hotfix

Production deployment dpl_DsLmSB87WZSXxTatYTD61kEdyFnv is Ready and aliased to https://system.seribako.com.my. The default Purchase Request register shows newest creation first, before pagination. Explicit natural document-number sorting remains available. This fixes October requests appearing behind September records because month abbreviations were compared as text. No request status or business records are changed.

## v9.2.82 (deployed; acceptance superseded) — actionable plan review groups

The existing Plan checks console composes shared ConsoleSection/Button with native disclosure groups for Settings, quantities, Manager reasons and production balance. Exact product/outlet messages remain accessible, and the current-date/kitchen Settings link is shown only when configuration is incomplete. Unsaved edits never display Ready for review. Review and database gates are unchanged; no CSS, motion, permission or database changes. The business composition lives in production-planning-review-checks.tsx; generic components retain their existing ownership. Production remains v9.2.81 with 324, 326 and 327 applied, 325 pending. Formal v9.2.82 verification is not yet complete.

## v9.2.81 (deployed) — partial manual drafts / migration 327 applied

Draft save preserves unknown allocation quantities and tray counts as NULL, separately from explicit zero; submit/release remain blocked until quantities, minimums, yields and whole-tray balance are complete. Invalid numeric ranges and fractional trays are rejected at the action and database boundaries. The transactional function preserves its permission checks, locking, idempotency, audit and strict review rules. Manual-only generation skips unusable eight-week history; mixed same-day plans retain full food-record completeness checks. No grant or RLS policy change. Production is v9.2.81 with migrations 324, 326 and 327 applied; 325 remains unapproved. Guarded migration 327 applied independently after live function/source comparison, preserving ACLs, SECURITY DEFINER and owner. The old function reproduced the failure; 63 isolated PostgreSQL flow checks and 1,387 regressions pass. No local Supabase or production operational UAT writes. Deployment 8ZTxPzEZnK9tbjGiQJpb18TWrhPq completed successfully and is aliased to https://system.seribako.com.my. Authenticated Owner Planning reports v9.2.81; unknown quantities remain blank and review stays blocked. At 390/820/1180/1440px the document has no root horizontal overflow. No operational records were written.

## v9.2.80 (deployed) — selected-period Packaging reads

Packaging requests only the selected 7/30-day report once; outlet/product filters remain local. A period change performs server navigation, preserves client filter identity, and shows shared loading states instead of treating an unrequested month as missing or zero. Failures use ErrorState with the shared RetryButton, preserving the workspace URL. Latest closing stock remains independently returned by the existing report RPC, including records older than the selected period. No RLS, grant or inventory change. Deployment 2zJb5RgYqK5DR4haWDXcBwBGtrwS succeeded and is aliased to https://system.seribako.com.my. Database 324 and 326 are applied; 325 remains pending. Strict TypeScript, lint, hosted build and 1,385 regressions passed.

## 2026-10-04 current verified release — v9.2.79 / database 324 + 326 (325 pending)

Deployment `6DUNX69vZnWaH7RBRZAuisokn4WX` succeeded and the formal alias is https://system.seribako.com.my. Commit `0103a2f9` passed strict TypeScript, lint, hosted build and 1,381 regressions. Owner-authenticated checks verified the corrected Plan phone drawer, product-order guidance and focus restoration, and Packaging at 390/820/1180/1440px without root overflow. The phone inline filter card is 130px high with no empty primary row. Earlier release evidence below is historical; the larger QA goal remains open, including database performance/permissions, provenance and complete workflow/a11y acceptance.

## Database eligibility follow-up — migration 326 applied independently

Repository migrations reviewed through `326`; production ledger includes 324 and 326; 325 remains unapproved.

A disposable PostgreSQL fixture reproduced expired-but-active staff reading and configuring Planning through the legacy helpers. Migration 326 aligns planning_manager, planning_branch_access and planning_require_manager with the existing current_staff_id eligibility gate; Malaysia employment end dates remain inclusive. It changes no ACL, policy declaration or operational quantity. The fixture verifies ended/inactive/anonymous denial, eligible current-day/open-ended staff, and unchanged ACLs, SECURITY DEFINER flags and ownership. The production-planning integration suite passes 52 checks with 326. Migration 326 was applied in a guarded transaction and independently read back. Original function hashes matched preflight; ACLs, SECURITY DEFINER flags and owners were unchanged. The authenticated Owner still opens the editable draft. Production is application v9.2.79 with 324 and 326 applied; 325 remains unapproved. Future approved db push must include the earlier 325 with --include-all; do not assume a contiguous applied-through version.


## 2026-10-04 verified production authority — v9.2.78 / database 324

Deployment `D2xa7BFBHrLG57s2d9n8SHNypRhB` succeeded and is aliased to https://system.seribako.com.my. Owner-authenticated production checks covered Plan, Settings, Events, Daily Records, Insights, the canonical DO list and Packaging at 390/820/1180/1440px without root overflow. Phone Plan actions opened successfully; Escape closed the drawer and restored trigger focus. Strict TypeScript, lint, hosted build and 1,377 regressions passed. These are surface checks, not complete workflow or WCAG certification. See docs/qa/OMS_PRODUCTION_REWORK_2026-10-04.md for evidence and unclosed gates. Database remains 324; prepared 325 and the live packaging RLS experiment are pending specific permission authorization.

## v9.2.79 (deployed) — provenance and shared phone filters

Candidate removes the blank primary row from shared inline phone filters, keeps unconfirmed packaging usage blank, and orders review checks by the displayed product/outlet sequence. Actual component render tests distinguish explicit zero from absent confirmation and preserve zero result counts. No database policy, grant, quantity or inventory change is included. This candidate was deployed and verified as recorded in the current release authority above.

## Historical v9.2.78 candidate — actionable validation

Event quantity validation opens the product section, shows the shared inline error and focuses its first quantity input before any action call. Native invalid quantities also reveal the section. Shared action errors classify schema-cache diagnostics as unavailable and keep internal table names in server logs. Six added server-action tests cover invalid/no-write boundaries, role denial, explicit zero minima, empty recipients and truthful unavailable-mail feedback. Production remains v9.2.77 until deployment is verified in the QA ledger.

## Historical verified release — v9.2.77

Application deployment `HDzwJWpTrajQF5ErPL2p1vP57ciE` completed and aliased to https://system.seribako.com.my. Hosted production build, strict TypeScript, lint and 1,359 regressions passed. The production login screen independently reports v9.2.77. Authenticated workflow and remaining device acceptance are pending; database remains migration 324, with 325 prepared and unapproved. Historical candidate and acceptance entries below are retained as dated evidence, not overall closure.

### v9.2.77 (unreleased) — Operational rework in progress

Planning reads only the current tab and selected plan version. Settings uses the shared operational phone list and desktop Table; product search preserves edits. Scheduled events reuse the same owners. Routine panels omit repeated forecast/email disclaimers; optional evidence retains the prediction inputs. Settings can be saved without email recipients, while the existing release guard still requires them. Migration 325 remains prepared, not applied, pending explicit approval. Production remains v9.2.76 / database 324 until the QA ledger records a verified deployment; this is not overall closure.

## 2026-10-04 authenticated closure authority — v9.2.76

Repository migrations reviewed through `325`; forward-only migration 历史已到 `325`. Migration 325 is prepared and rollback-tested but NOT applied: explicit production permission approval is pending. Production remains applied through 324. Migration 324 repairs draft-recalculation SQL aliases without changing authorisation or workflow. Owner UAT identified the failure; the expanded isolated fixture now covers recalculation, removal of obsolete allocations and preservation of reasoned manual quantities/trays. Production v9.2.76 is deployed (8u2otQahGNK3w3XXh7hdbat2mLtx); migration 324 is applied and live draft recalculation passed. Authenticated Owner surface checks and outstanding configuration dependencies are recorded in docs/qa/OMS_FEATURE_CLOSURE_2026-10-04.md; historical entries below do not define current deployment state.

### v9.2.76 (deployed) — Authenticated acceptance follow-up

Daily Records list/form, Insights, Planning and Packaging open with Owner authentication. Release-width evidence is tracked in the 2026-10-04 QA ledger. Shared filter counts accept a semantic noun. DO actions use the shared right console and controlled-correction dialog; A4 printing resets responsive split geometry and uses bounded 20-line pages. No production UAT approvals or dispatches were created.

## 2026-10-04 closure baseline — v9.2.75 candidate

Code, applied database migrations, production deployment and authenticated acceptance are separate evidence. The first v9.2.75 upload failed; the subsequent deployment EmWcZ4wEdPU7Wqjs1P56x65SKA1L completed and aliased to the production domain. Authenticated acceptance remains pending. Repository migrations reviewed through `323`; linked Production ledger verified through `323` on 2026-10-04. Migration 323 adds reviewed per-product demand basis. Application deployment and authenticated acceptance remain separate gates.

Daily Records owns input/list, Insights and Delivery Orders tabs. Old DO list links redirect. WorkspaceGrid, WorkspaceTabs, FilterBar, Table, SelectControl, ModalShell and system-state primitives are the reusable owners; feature components compose them. No route-specific visual system is permitted. Responsive acceptance covers 390, 820, 1180 and 1440px, keyboard focus, 44px touch controls and reduced motion.

Production recommendations are a daily quantity proxy, never POS sales. Same-day eligibility must be explicitly confirmed per kitchen/product. Multi-day or unknown shelf-life requires Manager quantity; expiry wastage may exceed today's receipt with a food reason. Approval, production and dispatch remain distinct; only confirmed effective DOs populate source-locked Qty Sent. Received, Wastage and POS remain independently entered. Inventory posting stays in the existing production workflow.

Packaging uses one RLS-preserving report RPC; list and optional Insights reads stay separate. Missing, recorded zero, loading, empty and unavailable are distinct. Email needs a configured provider and recipients; an outbox entry is not proof of delivery. Hobby daily scheduling starts after 20:00 Malaysia time, within the provider's scheduling window; exact configurable execution needs a compatible scheduler rather than misleading UI promises.

### v9.2.75 (deployed; authenticated acceptance pending) — Familiar operational workspaces

- Canvas/State: Daily Records owns daily input and the existing list, while optional analytics loads only in Insights. Delivery Orders is a tab within this workspace.
- Toolbar/Surface/Action: Attendance, Daily Records and Production Planning consume one WorkspaceTabs owner. Planning reuses shared selectors, tables, ModalShell and tokenized surfaces; primary actions stay in the right console and phone action sheet.
- Density: outlet and product insights are compact tables with distinct trend and completion views. Completion restores the established QS/OE/RP/P legend and one-decimal coverage.
- Performance: one security-invoker packaging report replaces per-outlet reads; skeletons preserve the stock/trend composition.

### v9.2.74 (unreleased) — Production planning and delivery orders

- The familiar green operations shell holds the product-by-outlet allocation grid, a contextual action rail and a compact phone view. Product evidence opens on demand; approval and actual dispatch use focused dialogs.
- Printable production totals and outlet DOs preserve product order while keeping transport tray counts distinct from production batches.

### v9.2.73 (deployed) — Packaging workspace consistency

- Restore the shared contextual right console with Daily Records access, report coverage and selected-day outlet usage; mobile uses the existing actions sheet.
- Use the shared filter controls and interactive line chart. Missing dates break the line; recorded zero remains a valid point.
- Read a bounded 30-day report once, then switch period, outlet and product locally. Stream the header and loading state before the report read completes.
- No database schema, permission or stock calculation changes.

### v9.2.72 (deployed) — Packaging report read latency

- Latest-outlet reads and the trend-record read run together; monthly packaging line batches use at most four concurrent requests. Exact-count guards still reject truncated data.

### v9.2.71 (deployed) — Packaging stock and usage clarity

- Packaging Usage reads completed Outlet Daily Records directly. Latest active-outlet closing balances remain independent of the trend period and retain record dates and coverage; balances are recorded, not verified physical stock.
- Seven packaging rows replace the repeated outlet/product ledger. Outlet details and daily usage details open on demand; desktop stock and trend panels sit together, while touch layouts stack. Missing days remain distinct from recorded zero.
- Inventory reconciliation, SKU mapping, the empty action rail and unbounded history tables were removed from this report because the owner needs outlet stock and usage trends. Existing mapping schema/data remain intact; no database migration is needed.

# Seri Bako OMS Design Authority

The unversioned foundation in `docs/DESIGN_SYSTEM.md` is the current visual and interaction contract. `src/app/globals.css` owns tokens and structural compatibility; `src/app/design-system-v2.css` consumes those tokens and owns authenticated responsive composition. Versioned entries in this file are release history. They explain decisions but do not override the current foundation.

Current geometry is 12px panels, 8px controls, and 44px shared query controls at all release viewports. Touch targets remain at least 44px. Dense pointer-only row actions may render a smaller visual glyph inside that hit area. Current working-time dialogs show an unsigned scheduled span; obsolete signed comparisons against 8.5 hours are historical and must not return.

### v9.2.70 (unreleased) — Operational clarity and roster coverage

- Kitchen employees share the canonical roster eligibility path with Outlet Staff and Supervisors; tenant, branch, role-date and workflow permissions remain enforced. Migration 287 was applied and its four function bodies verified against the repository on 2026-09-14; live ALMA and PJS10 rosters show 8 and 12 staff respectively.
- Schedule completeness checks group missing dates by employee without merging identities, inventing OFF days or bypassing submission blockers. Staff codes distinguish similar names.
- Mobile document actions remain on one row with an accessible More options icon. Receiving summaries and purchase-chain links use two phone columns. PR rows display the submitter name without redundant wording.
- Posted receipts show the remaining quantity after that receipt, preserving the original pre-receipt snapshot and distinguishing it from later PO activity. Receiving document and purchase-chain reads run concurrently.

- Topbar pending actions omit unused exact counts; Dashboard totals retain exact counting and unavailable-state handling.

Repository migrations reviewed through `291`; linked Production ledger verified through `291`; authenticated Owner Preview verification passed on 2026-09-15. Production application promotion remains separate. See `docs/qa/SYSTEM_QUALITY_2026-09-15.md`.

- Follow-up verification: SQL timestamp validation dates preserve their calendar day; mobile list rows no longer prefetch every unopened document. Migration 288 indexes the ready-to-post daily queue; migration 289 aggregates inventory once per Dashboard request with identical verified results. Migration 290 reuses parent SELECT RLS for daily lines and evaluates the request-constant view permission once; verified visible rows are unchanged.
- Observability follow-up: migration 291 aligns the remaining high-frequency queue indexes with their real filters and newest-first ordering. No interface, workflow or permission behavior changes.
- Apple-style interaction review keeps the existing information architecture and task habits: press feedback begins immediately, reduced motion remains authoritative, completed imports cannot look actionable, modal selects share the modal top layer, and desktop attendance tools occupy the existing right rail. Exact post-shift evidence is displayed separately from the unchanged 30-minute OT claim rule.

## v9.2.68 (unreleased) — Faster workspace reads

- The workspace header remains available while notifications and pending actions load behind a stable, disabled bell with an explicit loading label.
- Schedule overview describes the accessible outlets instead of showing a hidden default outlet's roster state or fetching its editable planner.
- Loading and unavailable are distinct from an empty workflow queue or zero low-stock count. This patch preserves existing visual controls and business actions.

## v9.2.67 (Production verified 2026-09-14) — Cross-outlet employee-day integrity

- Completeness follows the canonical company employee-day, not the currently viewed outlet. A published OFF or leave elsewhere must not produce a contradictory empty-day blocker in a borrowed outlet roster.

## v9.2.66 (Production verified 2026-09-14) — Schedule import replay integrity

- An immutable roster owns its employee-day visibly and operationally. Import preview must project that fact into other outlets instead of creating an editable duplicate that later appears as a hidden submission conflict.
- Corrective replay keeps the familiar upload flow and the same source hash; parser-version metadata communicates the system correction without asking an operator to rename or alter the company workbook.

## v9.2.65 (Production verified 2026-09-14) — Historical schedule backfill integrity

- Historical scheduling distinguishes an unknown role-history gap from a known ineligible role. Only the unknown past gap may inherit today's schedulable status; the UI must not describe that fallback as a historical role fact.
- Preview and save use one eligibility contract. Operators see unresolved source facts before import, while verified assignments remain usable without a late database rejection.

## v9.2.64 (unreleased) — Attendance publish reliability

- An incomplete roster is a correctable business state, not an incident: feedback names the employee and date and tells the scheduler to add a local assignment or schedule the employee at the destination outlet.
- Mobile Schedule actions remain attached edge-to-edge to the bottom action surface. Responsive title actions may share a row or stack deliberately when the phone width cannot preserve readable controls.
- Working-time dialogs describe the scheduled span against the 8.5-hour reference and retain a signed `HH:MM:SS` difference for quick visual checking.

## v9.2.63 (unreleased) — Staff credential handoff clarity

- A one-time credential surface owns one concise hierarchy: state in the heading, credential and copy action as the task, then the secure-sharing and password-change consequence. A separate success banner or helper sentence must not repeat that same instruction.

## v9.2.62 (unreleased) — Partial draft schedule import

- Workbook preview now mirrors the database's date-effective schedulable-role rule instead of treating every visible employee as writable.
- One unclear spreadsheet cell no longer strands an entire outlet. Verified rows enter a clearly labelled Partial Draft; flagged cells stay empty with their source evidence visible for deliberate completion.

## v9.2.61 (deployed) — Production schedule catalog repair

- The schedule workbook catalog reads the canonical `staffs.default_branch_id` field. Production UAT exposed and closed the stale `branch_id` assumption before any roster mutation was allowed.
- The importer continues to fail closed: a missing live catalog cannot be bypassed and never falls back to guessed staff ownership.

## v9.2.60 (deployed) — Audited schedule workbook import

- Schedule owns a compact workbook entry point rather than hiding import behind a script. The modal previews one Monday–Sunday window against current OMS outlet, staff and roster state before any write.
- Preview metrics and one restrained outlet list distinguish Ready, source-blocked and already-published rosters. Only Ready outlets are imported; unclear notes, incomplete or implausible times, HR instructions and immutable workflow states fail closed with the exact employee/date context.
- Cross-outlet rows resolve from the employee's authoritative home assignment: an identical home-row copy is suppressed when one destination outlet owns the timed shift, and the canonical destination shift carries its work-site label. The layout remains bounded at phone width and uses the shared surface, control, spacing, colour and dialog tokens.

## v9.2.59 (deployed) — Roster integrity closure

- A shift has one owning outlet roster. A home-outlet planner may render an authorised, read-only `At [outlet]` projection, but it never clones the assignment or credits coverage to the origin outlet.
- Missing full-time staff days are planning errors with employee-and-date feedback. OFF and leave remain real dispositions and are never used to represent a transfer.
- Publish is a confirmed boundary. Published schedules remain correctable until Attendance is locked; every correction requires a reason and produces immutable assignment and approval evidence.
- Mobile workflow actions attach edge-to-edge to the safe-area bottom. Compact operational rows use bounded grids, direct labels and truncation rather than allowing long fallback prose to squeeze identity.

## v9.2.58 (deployed) — Operational quality closure

- Hydration-sensitive selection controls render inert until the client owns them; native form and chart controls keep identical server/client geometry and expose deterministic readiness to E2E.
- Phone purchase-request lines use two equal commercial tracks plus a control-token-sized action track. No child may silently exceed its grid column.
- Dense operational tables begin at `xl`; tablet and phone use the same touch-first list contract. Phone page identity belongs to the fixed app topbar, while document workflow actions may temporarily own the bottom safe-area slot.
- Automated screenshots preserve the authored caret state so test instrumentation cannot be misclassified as a React hydration defect.

Commit `0926f3e5` was deployed successfully and the Production custom domain rendered `v9.2.58`. Authenticated Owner UAT completed the Schedule Draft → Submitted → Published sequence with persisted reload evidence; both mutation requests returned HTTP 200 in the available Vercel runtime window.

## v9.2.57 (deployed) — Attendance stability and weekly roster refinement

- One-shot quick assignment prevents sticky modes; OFF uses the established danger palette without turning routine work states into alerts.
- The mobile day strip pairs weekday/date with a small staff-count icon, while the working-time dialog uses employee/date context and a tabular signed variance from the 8.5-hour reference.
- Cross-outlet movement is represented as a week-scoped roster addition/removal, preserving permanent assignment and the existing grid.
- Missing profile facts use a muted em dash, action headers wrap safely at tablet widths, and paired cards stretch to equal height only in the two-column layout.

## v9.2.56 (deployed) — Attendance workflow convergence

- Mobile schedule cells use the full available column width, while compact icon-only secondary decisions preserve a single action row.
- The mobile date strip removes repeated staff totals and keeps weekday/date selection compact.
- Attendance review actions share one neutral surface and reveal hover/focus feedback instead of permanently highlighting View details.

## v9.2.54 (unreleased) — Attendance action and picker correction

- Table action groups use a stable final column, white default surfaces, regular label weight and muted hover/focus feedback; inactive actions never appear selected.
- High-frequency leave states remain direct compact controls. Shift templates use one bounded selector so the palette stays recognizable without becoming a chip wall.
- A dropdown launched from a native dialog portals into that dialog so it participates in the browser top layer and remains operable.

## v9.2.53 — Attendance action and evidence polish

- Row actions use one quiet vertical icon menu; status remains with attendance evidence instead of becoming a competing button-like pill.
- Grouped dates use the product date grammar and RO state gets a bounded trace column.
- Employee documents divide available width evenly and stretch both task surfaces to the same height.

## v9.2.52 (unreleased) — Attendance review density correction

- Attendance review combines plan, actual and variance in the same clock cells so the desktop table remains legible inside the main workspace without hiding evidence.
- Settings disclosures use one quiet row grammar, with payroll rules first and device mappings collapsed until needed.
- Desktop lists begin at the desktop breakpoint; tablet and phone keep the operational list pattern.

## v9.2.51 (unreleased) — Operational UI convergence

- Shared compact Select controls own searchable outlet, staff, status and time choices; a native select is not introduced in the migrated Attendance surfaces.
- Desktop list filters remain one command row. Phones expose Search, Filter and result count, then place secondary filters in a spaced bottom sheet with explicit Reset and Apply actions.
- Attendance tables group by date on wide screens and become employee cards on phones. Payroll-only values and raw audit JSON remain available to authorised exports and database evidence, not the everyday review view.
- A workflow action reports the concrete business result and next correction. A generic failure message is only the final unexpected-error fallback.

## v9.2.50 (unreleased) — OT-to-RO weekly attendance close

- Schedule exposes the actual shift templates again and lets Supervisors attach a partial Full-time RO redemption to a shift by moving one edge in 30-minute units.
- Actual Attendance shows expected/actual punches, monthly missing-punch follow-up, OT claims and a People-owned weekly close.
- Sensitive weekly workbooks use one employee per sheet and remain restricted to People Operations and Owner after the week is locked.

## v9.2.49 — Actionable attendance operations

- Schedule warnings name the affected employee in the action rail and on the employee row without blocking submission.
- Raw punch import shows multi-week scope, daily event coverage, AM/PM timestamps and a per-week review destination.
- People Operations sees the roster population allowed by the same branch-scoped schedule-read authority as the page.

## v9.2.48 (unreleased) — Weekly Attendance operations

- Attendance uses four destinations: Overview, Schedule, Actual Attendance and Settings. Import belongs to Actual Attendance and opens directly into the weekly comparison.
- The comparison keeps one employee day per row, restrained semantic status colour, a contextual audit rail and bounded pagination for large outlet portfolios.
- Staff editing uses two balanced desktop columns, Compliance and supporting documents share one record, file actions use the established pale green treatment, and switches keep full capsule tracks.

# Seri Bako OMS responsive design standard

## v9.2.45 (unreleased) — Dense Attendance operations

- Import controls share one compact toolbar, source mappings align as Source, Location, and Actions, and editing appears only on demand.
- OFF, AL, PH, UPL, and RO keep their text labels while using separate neutral, blue, violet, amber, and teal tones.

## v9.2.39 (unreleased) — Finance PR return permission

- The visible Finance correction action now matches its database permission, so the interface does not offer an action that the server rejects.

## v9.2.38 — Nested rail spacing authority

- Right-rail section spacing is based on adjacent console sections at any wrapper depth, including transparent `display: contents` groups.

## v9.2.36 (unreleased) — Compact operational controls

- Shared buttons use 12px labels while preserving the existing control height and touch target.
- Right-console and More-action cards keep a 12px vertical rhythm at every viewport.
- Dense Purchase Order tables defer to the operational list below 1536px so browser zoom does not compress business fields into unreadable columns.

## v9.2.35 (unreleased) — Roster and attendance evidence layers

- Schedule cells express the approved plan and may carry a compact comment marker without becoming the source for same-day exceptions.
- Actual Attendance presents Planned, Actual, Approved adjustments, and Recognised attendance as separate fields, with formal submit and decision dialogs.
- Attendance pages share one mobile gutter, card border, spacing rhythm, and action area; opening Working Time focuses its heading instead of a native time control.

## v9.2.34 (unreleased) — Explicit placement reset

- Changing a grid template does not remove explicit placement inherited by its children. A responsive layout that reduces the column count must reset child `grid-column` and `grid-row` before relying on auto placement.

## v9.2.33 (unreleased) — One tablet filter authority

- A route-specific tablet layout must replace the earlier shared declaration that owns its grid tracks. Adding a second selector in another stylesheet is insufficient when the original rule continues to win the cascade.
- Outlet Daily uses two equal columns for its four filter controls, followed by a full-width command row.

## v9.2.32 (unreleased) — Equal controls and two-line metrics

- Tablet query controls in the same group use equal tracks. Search/result actions occupy their own row when forcing them beside four filters would produce unequal or truncated controls.
- Operational right rails appear at the first viewport that can support a useful main column and compact rail; Outlet Compliance uses the 768px split authority.
- Dashboard panels own their individual surfaces. A second tinted container around the full grid adds no hierarchy and must be removed.
- Compact metric tiles use two visual rows: icon and prominent value above, label below. Zero is a valid result; unavailable data uses an explicit unavailable state.

## v9.2.31 (unreleased) — Compact workflows and visible grouping

- A direct assignment dialog asks only for the decision the user owns. Derived break and paid-cap rules remain automatic, and the dialog is centered with explicit viewport transforms rather than relying on browser dialog margins.
- Workflow submission may persist current edits as part of the submit action. A separate draft action remains useful, but it must not become a mandatory intermediate step.
- Portrait-tablet filters use two readable columns before collapsing controls into ellipses. Modal filters stop above persistent navigation instead of removing it.
- Item identity pairs a substantial image area with the identity form at wide widths and stacks naturally below it. Right-rail sections use a consistent 12px vertical rhythm.
- Supplier-grouped baskets state both group size and item order. Purchase UOM is an explicit bounded selector when valid alternatives exist.

## v9.2.30 (unreleased) — Direct manipulation and stable identity columns

- Compact rows keep primary, secondary and detail identity lines in one uninterrupted left stack; status and metadata form the right stack. Redundant “Open” copy is omitted when the row affordance and chevron already communicate navigation.
- Binary permission controls use the familiar compact mobile switch grammar: a quiet neutral track when off, brand track when on, white thumb, subtle elevation and an explicit focus ring. Portrait tablets do not force dense Staff actions into a narrow side rail.
- Schedule cells own time entry. Add opens a centered working-time dialog with controlled 30-minute choices; leave and off codes remain reusable shortcuts, while a previous work time never silently carries into the next cell.
- Register headers preserve the primary business identifier before descriptive context. Calendar navigation balances equal left and right header space so the month stays on the visual centerline.

## v9.2.29 (unreleased) — Denser operational rhythm with stronger state contrast

- Permission switches retain the approved category-and-row structure while gaining a two-pixel track outline and bordered thumb. Attendance tabs use equal tracks across all available destinations; schedule outlet, week, and Today controls form one bounded row from tablet upward.
- Outlet Daily treats its seven-state key as a compact horizontal strip and gives its date-led register a one-row landscape-tablet filter composition. Dashboard priority surfaces use deep Seri Bako green for the work summary, stronger sage section headers, and one contained sage canvas behind the operational groups.

## v9.2.28 (unreleased) — Persistent navigation and role-owned finalisation

- A route loading boundary owns only the changing content canvas. The authenticated five-item mobile navigation remains mounted and visually unchanged; stale route actions, document action bars, create FABs and placeholder `More actions` controls are suppressed until real content resolves.
- A phone document action bar divides available width equally among its real actions. Primary status does not earn a double-width row, and two actions must remain a single 50/50 row.
- Repeated numeric amounts use a two-column phone grid with numeric keyboards when labels remain unambiguous. Density never removes field labels, validation, ownership or units.
- Outlet Daily finalisation is role-owned: Outlet corrects and resaves through `Ready to post`; authorised company-wide roles post; `Posted` is immutable to Outlet. Every owned finalisation appears in the assignee's shared action queue.
- Attendance phone planning is a day-at-a-time operational view with a seven-day selector, compact employee rows and local workflow actions. The desktop weekly matrix remains the pointer/tablet workspace rather than a compressed phone layout.
- Upload controls may use a 70/30 file/action row when the file picker remains the dominant task. Mobile sheets use explicit inter-card spacing; grid separators must be drawn by row and column logic, never one-dimensional sibling dividers.

## v9.2.26 (unreleased) — Annotation-derived release gates

- Annotation repair is systemic: classify each report as data truth, component vocabulary, density, workflow, responsive behaviour or release reliability, then repair the shared authority before adding a page exception.
- Every release keeps loading, successful empty, unavailable and numeric zero visually and semantically distinct. Cross-module approvals belong to the signed-in role's single action queue.
- Every changed operational surface is gated at 390×844, 820×1180, 1180×820 and 1440×900. Touch, keyboard, pointer and reduced-motion equivalents remain mandatory.
- Status colour never carries meaning alone. Pending, final, warning and unavailable states require distinct copy, accessible labels and semantic tokens.
- UI contracts are necessary but not sufficient: strict TypeScript and the real Next production compile/type-validation path are release blockers. Newly added database tables require a compile-time `Database.public.Tables` membership assertion.

## v9.2.25 (unreleased) — Action ownership and legible workflow states

- Dashboard action queues are cross-module: any current decision owned by the signed-in role belongs in `Actions awaiting you`, including submitted outlet schedules. Rows use module-specific supporting context rather than forcing every action through procurement metadata.
- File constraints are part of the picker, not an after-the-fact error page. Compliance shows accepted formats, the real 4 MB boundary, selected size and an inline correction before a request is sent.
- `Ready to post`, `Posted` and `Attention` must never share one green-neutral treatment. Pending finalisation is blue, final posted state is solid green, and follow-up attention is high-contrast amber with a warning icon. Text and accessible descriptions carry the meaning independently of colour.

## v9.2.24 (unreleased) — Honest loading and operational overview

- Loading geometry follows the destination surface, not a generic demo: heading rhythm aligns with `PageHeader`, query controls are their own sibling surface, list rows remain separate, and right-rail skeletons do not expose placeholder section titles.
- Authentication has its own compact, centred skeleton. It never renders the application workspace, data list or action rail before identity is known.
- Dashboard source failures disappear from the operational KPI grid rather than becoming large `Unavailable` values. Section headers may use the quiet brand tint to improve scanning, while controls and states retain the shared semantic palette.
- Outlet Daily warning state reads only `Attention`; the posted state remains separate. Calendar history owns both the completion matrix and the matching seven-day wastage trend.
- Schedule overview is a control board, not a second editor. One row per outlet exposes workflow state and coverage, while selection opens the existing planner without changing its behaviour.
- Site Compliance owns one current company checklist: DBKL is retired, Pest Control is required, and the rule applies equally to every active Outlet and Central Kitchen.

## v9.2.23 (unreleased) — Calm compliance and state-owned actions

- Site Compliance uses a single structured disclosure list. A closed row carries requirement identity, recorded expiry and state; opening it reveals one details surface and one attachments surface without masonry gaps or nested accordion noise.
- Date controls align by their input baseline even when labels wrap. File selection uses the established primary green action while Upload remains secondary until a file has been chosen.
- Schedule action rails show only actions valid for the current workflow state. Submitted rosters are read-only and expose Manager decision actions, while Draft editing controls disappear.
- Shared loading states retain their page and right-rail skeleton geometry without an indeterminate progress stroke floating over content.

## v9.2.22 (unreleased) — Workflow-aligned completion matrix

- Outlet Daily matrix abbreviations mirror the detail workflow exactly: `QS` for Qty Sent pending, `OE` for Outlet Entry pending, and `P` for Posted. Aggregate unfinished records are labelled Open rather than using a second status vocabulary.

## v9.2.21 (deployed) — Direct compliance upload and automatic staff matching

- Outlet Compliance is a direct document checklist: upload, replace and remove are the only actions; approval vocabulary and pending-review states are absent.
- Attendance resolves uniquely matching active employee names automatically and asks operators only for the device-to-outlet relationship the source file cannot infer.

## v9.2.20 (deployed) — Unified loading and compact operational layouts

- Every route loading boundary uses the same shared workspace skeleton: heading, primary work surface, Actions rail and Summary rail.
- Compact desktop widths switch dense operational tables to the shared row presentation before columns collide.
- Attendance mapping and shift setup preserve the existing visual language while using quieter disclosures and fewer simultaneous columns.

## v9.2.19 (unreleased) — Receiving hierarchy and direct PO identity

- AutoCount PO Number is the first required identity field for a direct PO. The workflow begins at Ready to Send and contains no approval affordance.
- Receiving lines use one visual grammar across create and draft-edit states: item identity, compact order context with Pending emphasised, primary Received/Rejected inputs, then secondary conversion and traceability.
- A missing conversion is expressed once as `1 purchase UOM = factor base UOM`; derived base quantities are not duplicated as editable fields.
- Batch, Expiry and Line remarks remain visible in a quiet Traceability row. On phones, remarks occupy the full row; tablet portrait keeps operational context in the canvas instead of duplicating a right-side PO summary.

## v9.2.18 (unreleased) — Lossless purchase order correction

- Dense PO entry gives every line a stable visible index and keeps Item, Ordered Qty, UOM, Unit Price, Comment and remove action in one desktop row. Item yields width to Comment without truncating the commercial controls.
- Branch and Supplier changes preserve the draft. Invalid combinations are explained beside the intact editor so the buyer can correct them deliberately.
- UOM at PO stage records what was ordered. Supplier/Item coverage remains authoritative, while delivery conversion and inventory-unit correction belong to GRN.

## v9.2.17 (unreleased) — Import feedback and native picker parity

- Native file selection and drag-and-drop must feed the same stable parsing input. Copy a browser `FileList` before resetting its input so re-selecting the same file remains possible without discarding the current choice.
- A completed import is the page's primary outcome and appears before source files, impact details and warnings. Supporting evidence remains below it for review.

## v9.2.16 (unreleased) — Recoverable purchase entry

- A recoverable form error returns into the mounted editor. It must not navigate away, reset uncontrolled inputs, or replace editable context with a global-only toast.
- Supplier choices use deterministic alphabetical ordering. After supplier selection, purchase UOM choices come only from that branch, supplier and item mapping so the UI cannot offer a combination the server is guaranteed to reject.
- Purchase Order lines read left to right as Item, Ordered Qty, UOM and Unit Price on tablet/desktop; compact phone entry keeps the item on its own row and aligns the three commercial controls beneath it.
- Route-owned loading states reproduce the actual document header, work surfaces and right rail. A generic list skeleton is not an acceptable placeholder for a document editor.

## v9.2.15 (unreleased) — Attendance workspaces

- Attendance landing uses Workspace Mode with one weekly identity surface, compact operational signals, import state and period lock state.
- Schedule Planner and Attendance Review use high-density matrix/list surfaces. Sticky employee/date bands and intentional inner horizontal scrolling are allowed; page-level overflow is not.
- Schedule cells remain compact, single-line and selectable. Blockers and warnings use distinct semantic states. Filter labels do not wrap.
- The planner keeps Outlet Daily Records' contained central canvas, with explicit previous/current/next week controls. Common assignment fields stay in one compact action band; advanced punch and OT rules live in Settings. PH and EL use the same compact marker grammar as OFF and leave.
- Staff dashboard shifts reuse the existing flat divided-list hierarchy and keep request actions inside Attendance.

## v9.2.14 (unreleased) — Explicit receiving exceptions

- Received and Rejected remain direct quantity inputs in both GRN creation and Draft review. Exceeding the visible PO balance uses the same warning treatment and requires a retained reason in either entry point.
- Over-receipt is an exception, not a hidden maximum or a different workflow. Quantity fields remain readable and editable; the warning sits with the affected item and names the excess in its Purchase UOM.
- Recording an exception does not imply posting authority. The Post Receiving action remains separately permission- and branch-gated.
- Sent, Approved, Received and Partial Received keep text and icon identity while using distinct related tones; status meaning never depends on colour alone.
- Required attachment labels fail at the owning field with red focus treatment, and document-console sections keep visible separation as histories grow.

## v9.2.13 (unreleased) — Clear operational ownership

- Keep transient Stock Count decisions inside confirmation dialogs; manage completed branch retirement centrally from the Items filter rather than adding badges to every count line.
- Requirement-heavy compliance work uses a responsive 1/2/3-column card grid. Cards expose identity and state first, while evidence forms expand only on intent.
- Shared modal descendants own their popup stacking context. Tablet and phone filter sheets ignore desktop anchor coordinates so they stay attached to the viewport.
- Document action rails use a direct primary, correction, separator, destructive sequence; owner recovery is hidden when the same user can perform the current review decision.

## v9.2.12 (unreleased) — Role-specific terminal landing

- People Operations enters the Employees workspace after authentication. Dashboard remains permitted, but it is not the role's primary task landing.
- A successful authentication must always resolve to at least one permitted operational route; a newly introduced role ships with an idempotent database permission repair and a finite-route contract.

## v9.2.11 (unreleased) — Sibling work cards and nested document provenance

- Summary and creation tasks are separate sibling cards. Forms are not hidden inside a summary disclosure, and authorised document surfaces always provide a visible upload path.
- Dense procurement tables place source provenance as a small italic link beneath the primary document number, returning column width to supplier identity.
- Operational table rows use a stable 64px height, top-aligned cells, and a two-line supplier clamp so mixed supplier-name lengths do not create awkward middle alignment.

## v9.2.10 (unreleased) — Familiar dialogs and exact operational boundaries

- PR matching is a discrete Purchasing task, not an inline table form. A compact icon action opens the shared centered modal, restates the requested line and supplier, and exposes only branch/supplier/UOM-valid Item Master candidates.
- Stock Count controls reserve a fixed 3.5rem UOM suffix track so steppers align across short and long units. Replace, Remove and Retire have distinct familiar icons; destructive removal requires a confirmation state before submission.
- Attachment filenames do not substitute for business meaning. The label is required, bounded and saved as the visible document name; the selected local filename remains supporting context only.
- Email addresses are identity strings, not prose. They display lower-case and never inherit generic title-case styling.

## v9.2.9 (unreleased) — Recovery stays in context

- Shared application chrome resolves authentication and active profile state before tenant permission reads. An expired or detached session must redirect to recovery rather than replacing every workspace with a generic server-render error.
- A Stock Balance PR basket owns one retry identity. Each sourcing group receives a stable derived key so double taps, interrupted multi-group creation and explicit retries converge on the same draft documents.
- Form failures return to the surface that owns the task. People Compliance upload, validation and persistence errors remain on the selected employee Compliance section with visible feedback; retired mixed-module routes are not recovery destinations.

## v9.2.8 (unreleased) — Profiles that lead to the next task

- A People Profile fact must not imply editability while hiding the edit route. Employment exposes one explicit `Edit employment & outlets` action; account management remains the full administrative workspace.
- Staff Compliance owns its evidence capture in the employee context. Authorised roles can add the record and file together; Documents lists only recorded evidence and preserves the sensitive-file permission boundary.
- Explanatory assignment, privacy and file-format copy uses the 10px helper scale with a 16px line height. Operational labels and primary values remain at the established readable scale.
- Outlet Daily Today metrics keep only the actual business labels. `Qty sent` does not need `Dispatch`, and `Total received` does not need `Receiving` repeated beneath it.
- A calendar is date-owned: expiring and renewal records with dates appear there. Missing dates and review-only queues remain in Outlet Compliance and the page description says so.
- Stock Balance uses branch sourcing first, then the Item Master default. A genuinely unmapped Item remains selectable into a separate Draft PR whose next owner is Purchasing; conflict and source-unavailable states remain blocked.

## v9.2.7 (unreleased) — Progressive capture without dead ends

- Kitchen’s fixed mobile destinations follow task frequency and the user’s requested sequence: Home, Count, Request, Stock and More. Less frequent Wastage remains discoverable inside More.
- Sales reconciliation is a completion gate, not a draft-save gate. A blank POS Total is presented as `Sales pending`; it never triggers native browser validation while the operator is saving operational progress.
- When sales infrastructure is awaiting migration, preserve the core Outlet Daily save and state exactly that sales was not recorded. Never replace a recoverable partial capability with a generic whole-record failure.
- Existing reconciliation data is preserved when a later draft save leaves the Sales section blank. Completion remains server-authoritative and requires POS Total; a non-zero difference requires a reason.

## v9.2.6 (unreleased) — Recoverable Stock Balance procurement

- Stock Balance and PR creation share the same branch supplier relationship as their sourcing authority. Item Master defaults must not appear as valid branch purchasing choices when an active branch mapping says otherwise.
- The basket shows one mapped purchase UOM instead of offering arbitrary units that the server will reject. Missing or ambiguous sourcing is blocked before submission.
- A failed creation keeps and reopens the mobile basket with a concise recovery message. All groups are preflighted before the first PR is created so a mapping failure cannot leave a partial supplier batch.

## v9.2.5 (unreleased) — Truthful Stock Count ordering

- A register's visible default-sort indicator and its server query must describe the same order. Stock Counts default to newest SC sequence first, with the SC No header marked descending.
- SC sequence uses creation order rather than `updated_at`, so later edits cannot reorder historical documents and alphabetical month abbreviations cannot corrupt chronological sequence.

## v9.2.4 (unreleased) — Recoverable submission with clear action ownership

- `Manager Review` is still a review state, not an editable form. Before Manager acts, the original requester may use `Revoke submission` to return the PR to Draft; revision and cancellation remain Draft actions.
- Revoke is requester-owned and server-authoritative. Company-wide read scope or possession of `pr.cancel` alone never permits one operator to revoke another operator’s submission; Owner remains the controlled recovery exception.
- The database row lock and status predicate decide concurrent Manager/revoke races. Whichever transition commits first wins, and the other receives a safe no-change error.
- Manager Review exposes one decision pair: approve, or return for correction. The correction action uses request-return language instead of presenting a terminal rejection.
- The original requester sees revoke in a separate `Request controls` surface. Owner-only recovery and permanent deletion sit behind collapsed `More options`; elevated capability must not make mutually exclusive actor duties look like equal next actions.
- On tablet and phone, the same controls remain reachable through the shared document action surfaces. Copy names the consequence—return to Draft—and requires one short reason for the audit trail.

## v9.2.2 (unreleased) — Complete role and action audit coverage

- The canonical release matrix contains seven roles: Owner, People Operations, Finance, Manager, Purchasing, Kitchen and Outlet Staff. Adding a system role requires updating credentials, fixture creation/cleanup, route authority, role workspaces and all four viewport shards together.
- Route visibility, permission authority and workflow actions are separate checks. A role must never receive a navigation or route classification that its server permission will reject, and adding a role must not broaden unrelated modules through a shared `ALL` or staff-management constant.
- Employee administration and document-number administration use separate role groups. People Operations and Manager may administer employees within their scope; Document Sequences remains Owner/Finance work.
- Every page that imports a route-owned server mutation must declare a responsive action owner through the shared document, record, rail, header or primary-action workspace. Desktop-only buttons and actions stranded after long mobile content are release failures.
- Static and populated-detail layout audits include the new Outlet Compliance, Outlet Calendar and People surfaces. Generic dynamic parameters are replaced with inert identifiers so the browser audits the actual route boundary rather than a literal bracket URL.
- Authenticated visual evidence still requires the four fixed viewports. Source and contract success cannot be reported as browser UAT when the disposable local Supabase fixture is unavailable.

## v9.2.1 (unreleased) — Operational stage and action continuity

Repository forward-only migration 历史已到 `230`；本节仅记录 Preview 设计与本地实现，不代表远端或 Production 已应用。

- PR, PO and GRN stages use one restrained icon/tone vocabulary. Sent is teal, partial receipt is amber, completed receipt is green, and rejection remains red; a completed state must not look disabled.
- At 1180×820 record workspaces retain the compact right action rail. At 820×1180 secondary actions and audit surfaces stay reachable without narrowing the main document into a desktop column.
- On phones the primary workflow action and Files & activity share the fixed document action bar. Do not leave audit access as an isolated control at the end of a long record.
- Linked procurement nodes use a bounded two-line identity/status layout. Document type must not be duplicated into the number, and badges must not force a node wider than its workspace.
- Missing actor data is a provenance state, not decorative punctuation. Resolve authorized display names through the audit boundary; use System or Unknown user only when the stored actor genuinely cannot be resolved.

## v9.2.0 (unreleased) — Separate operational workspaces

- Outlet Management and People are independent navigation sections; a dashboard, checklist detail, profile and calendar each own one job instead of stacking create forms beneath exception tables.
- Outlet Compliance follows the established SaaS checklist pattern: template requirement, upload evidence, pending review, approve/return, renewal and audit history. One exception band leads into the canonical Outlet register; repeated KPI and outlet-card grids are prohibited. Details expose the seven fixed requirements through progressive disclosure rather than seven permanently open upload forms.
- People Profile uses real route-backed section tabs for Overview, Employment & outlet assignments, Compliance, and Documents. It reuses the existing OMS staff identity, keeps Actions first in the rail, does not render a redundant Back link, and reveals sensitive originals only to Owner and People Operations. People Calendar is not part of this release.
- Outlet Calendar uses a real seven-column month grid with previous/next navigation. Phone cells reduce events to labelled status dots while wider cells expose compact event names; the document never widens beyond the workspace. Checklist entry captures document identity, issue/inspection date, expiry/next inspection date and evidence as one review task. Forms wrap intentionally without wrapping filter labels or creating a desktop-width control on phones/tablets.
- Outlet Daily keeps product quantities and cashless reconciliation in one workflow while visually separating their ownership. Difference and review state are derived evidence, not editable client totals.
- Attendance is absent from navigation and schema in this release. Future attendance integration must remain an external-system boundary until separately approved.

## v9.1.0 (Preview deployed; authenticated UAT pending) — Exception-led compliance

- Compliance lives in the OMS operations navigation and uses the existing dense workspace, not a separate HR application shell.
- The first screen leads with actionable expiry and missing-document bands, followed by one register and a progressive create surface. It does not use large hero metrics or repeated nested cards.
- Non-HR readers see `Valid`, `Expiring`, `Missing`, or `Restricted`; medical detail and sensitive file actions never appear as ordinary table content.
- Phone summary bands use two columns, tablet uses four, and desktop may use seven. Filter and status labels stay on one line; the register is a named keyboard-scrollable region when its business columns cannot safely collapse.
- Outlet and staff subjects reuse canonical branch/staff identities. Asset references remain external until an approved AMS integration exists.
- Migration 228 is remotely verified on the linked Production database by schema/read-back counts. The v9.1 application is still an isolated Preview branch: no `main` merge or Production application promotion has occurred, and authenticated role/mutation UAT remains pending.

## v8.65.23 (deployed) — Compact controls remain usable controls

- Dense operational UI may reduce visual chrome, but an interactive phone target remains at least 36px and shared row utilities retain the established 44px mobile target.
- Pagination may be compact, but the direct-page input must be independently operable; do not hide a 28px native input inside a larger decorative shell and call the shell the target.
- A mobile record row with two destinations uses two sibling links. Never place the source-document link inside an anchor that already owns the complete row; invalid nesting causes ambiguous activation and hydration drift.
- Intentional canonical routes must settle before visual inspection. The audit harness handles known redirects explicitly rather than ignoring execution-context errors or weakening runtime gates.
- Hidden native scrollbars remain the product decision. Reachability comes from contained, named, keyboard-focusable regions—not gradients, fades or reintroduced scrollbars.
- Production deployment evidence must remain separate from data-completeness claims. A master-only Item is a truthful incomplete sourcing state, not permission to fabricate a Supplier or branch relationship; the UI must expose the correction path and transactional workflows must fail closed until the relationship is authoritative.

## v8.65.22 (unreleased) — Preserve identity across imports

- A source-system code is an external reference, not permission to create a second Supplier with the same canonical company identity.
- Match AutoCount suppliers by OMS code, normalized active name, or recorded AutoCount creditor reference; retain every creditor code on the canonical Supplier.
- Confirmation errors must preserve the staged Preview and name the required migration or recovery action. Never ask an operator to alter a valid supplier name merely to bypass an identity constraint.
- Confirm remains atomic and company-serialized. A failed retry changes no OMS records and a successful import creates no inventory movement.

## v8.65.21 (unreleased) — Procurement object-page continuity

- Follow the established object-page pattern: show the related PR, PO, GRN and invoice as a compact linked-document chain, not as disconnected cards or duplicated records.
- A shared file surface aggregates evidence but always displays source document type and number. Required evidence remains enforced at the action boundary of its owning stage.
- Completed-document removal is Owner-only, confirmed, and implemented as archive metadata; never erase the storage object before the audit trail can explain what happened.
- Below the desktop rail breakpoint, keep the document canvas full width. Move actions, files, activity and revisions into one bounded, scrollable sheet instead of a permanently tall narrow rail.
- On mobile, the current primary action remains in the bottom action bar; linked-document navigation and full history remain reachable without competing with the main record.

## v8.65.20 (unreleased) — Ask at the action boundary

- Required supporting evidence is marked where it is owned. Do not repeat the same instruction above and below the primary action.
- If a missing document blocks posting, let the operator press the action and open one focused dialog: attach the document first, or record the permitted exception.
- Dense right-rail comments use the operational text scale and a bounded minimum height; helper copy must not dominate the document.
- Tablet pages keep one document scroll chain above fixed navigation. A nested main scroller must not trap the remaining side-rail content behind the bottom bar.
- Import selections remain editable before confirmation. Every selected file has a named remove action, and later drops merge with the current selection.
- Preview and Confirm enforce the same source-data rule. Optional Main Supplier metadata cannot become a confirmation-time blocker or an empty required Item category.

## v8.65.19 (unreleased) — Quantities and rates must not compete

- A business quantity and its derived percentage use explicit labels and separate visual lines. A large decimal quantity must never be positioned where it can be read as a percentage.
- Operational percentages use decision-appropriate precision; one decimal is sufficient for the Outlet Daily register, while the source quantity remains available at normal quantity precision.
- A period rate aggregates its numerator and denominator before division. Do not average daily percentages when daily volumes differ.
- Pagination is a workspace transition. A new list page begins at the workspace origin even when the operator selected the control from the bottom of the previous page.

## v8.65.18 (unreleased) — Search states must be truthful

- Global record search queries the canonical module table under that module's read permission. A generic document index may supplement results, but cannot be the only route to an existing PR or PO.
- Never apply text operators such as `ILIKE` to enum workflow fields. Search identifiers and deliberate text columns; status filtering belongs to typed filters.
- Searching, unavailable and genuinely empty are distinct states. A failed request cannot be presented as “No matching records.”
- Results deduplicate by canonical destination so a module row and its document index entry do not create duplicate actions.

## v8.65.17 (unreleased) — Progressive detail and trustworthy evidence

- An upload surface may be used in successive batches. It must preserve valid prior selections, replace only singleton source roles, and explain any dedupe or replacement without presenting it as an error.
- A completed idempotent job is a success state, not a retry state. Raw diagnostic rows stay available behind progressive disclosure after the operator sees the grouped action first.
- Related documents share evidence automatically. A Delivery Order attached to a PO remains visible to an already-created GRN; the UI must not imply that absent copied metadata means the operator never uploaded it.
- Recovery dialogs lead with the item name, then the smaller code. Show one concise issue and one next action; remove ownership labels and selection echoes when the surrounding interaction already makes them clear.
- Dense registers allocate width by business importance. Qty Sent and Last Updated must remain readable, while repeated confirmation copy is removed. Hidden scrollbars remain hidden and no edge gradient is introduced.
- Timelines use one inset line/icon grammar across documents and Outlet Daily activity. Rapid identical saves by the same actor collapse into one visible event.
- Backup copy distinguishes operational records and attachment metadata from uploaded file bodies. It cannot promise a full document-file archive when only metadata is exported.

## v8.65.16 (unreleased) — Quiet hierarchy and safe numeric entry

- Repeated work surfaces use one shared semantic header token. A dashboard must not communicate accidental hierarchy through near-duplicate greens.
- A responsive operational row and its heading share the same column grammar at each breakpoint. Optional details may move to a second row on tablet, but cannot occupy phantom columns that exist only in the data row.
- Numeric fields must protect business quantities from incidental navigation. Mouse-wheel movement scrolls the page rather than stepping a focused number field; Arrow Up/Down do not mutate the value.
- Workflow identity uses color and a familiar icon together. Icons are semantic, aria-hidden companions to the visible text label—not standalone decoration or a substitute for copy.
- Action icons describe the verb: post, open and upload. Repeated Delivery Order guidance is removed once the validation rail already states the requirement.

## v8.65.15 (unreleased) — Dialogs own the complete viewport

- A modal is a document-level surface. Portal it to `document.body`; never let it inherit the stacking context of a fixed action rail, sticky header, clipped card, or scrolling panel.
- The modal backdrop covers every inactive application surface, including fixed navigation and action chrome. Only the dialog remains undimmed and interactive.
- Z-index tokens describe semantic layers; they do not compensate for a component mounted inside the wrong stacking context.

## v8.65.14 (unreleased) — Progressive receiving and semantic action ownership

- Receiving is one task, not a spreadsheet. Each line leads with item identity, one compact ordered/received/pending strip, and only the quantities the operator can change.
- Known conversions stay derived and quiet. Unknown pack conversions ask for base quantities once in a bounded warning surface; batch, expiry and remarks remain available behind progressive disclosure.
- A workflow action uses the primary green treatment at every breakpoint. The same business action must not become a low-emphasis outline merely because it moved into the desktop rail.
- A Delivery Order gate precedes receiving when the PO has no attachment. The upload is retained by the GRN atomically so a safety gate never creates duplicate clerical work.
- Mobile document summaries use paired facts where values remain readable; supplier identity may span the row, while short dates, branch, state and priority share a two-column rhythm.
- Fixed mobile actions respond to the measured software keyboard, not focus alone. Hardware-keyboard and programmatic focus must leave the action reachable.

## v8.65.13 (unreleased) — Operational identity and import honesty

- A PO-line UOM is transactional data, not a new supplier-item identity. Reuse the canonical supplier + item relationship across PO UOMs; conversion must not manufacture a duplicate sourcing row.
- Optional source metadata stays optional. A blank AutoCount Main Supplier imports the Item Master without fabricating a supplier from Item Group and without blocking unrelated valid item data.
- Drag-and-drop upload is a real input path, not decorative copy. The full dashed target accepts multiple `.xlsx` files, exposes a restrained active state, and retains the native file picker as the keyboard-accessible path.
- A right rail presents one primary decision per state. Secondary reset appears only after work exists and aligns to the same full-width control grid.
- Dense registers sit on an explicit raised data surface so rows read as one operational object against the application canvas; mobile retains the same surface hierarchy without adding nested cards.
- Production verification names the business records and their final states. A deployed migration or a passing unit test alone does not prove a live workflow repair.

## v8.65.12 (unreleased) — Preserve the real operational identifier

- Do not ask an operator to add punctuation to a real AutoCount PO Number merely to bypass an OMS uniqueness collision.
- When an earlier non-atomic attempt left only the PO document, recovery reuses that document and records a revision; it does not hide, rename or recreate the audit identity.
- The recovery action stays one step. A conflicting document owned by another business record returns an explicit ownership message.

## v8.65.11 (deployed; authenticated Production PR read-back pending) — Recovery is a business decision

- A legacy recovery action must either finish the known PR-to-PO relationship or explain the exact ownership conflict. Generic duplicate-record errors are not sufficient.
- Existing POs are never silently reassigned. Reconciliation requires an unlinked PO with the same company, branch and supplier; mismatched or already-linked orders remain fail-closed.
- The operator enters the AutoCount number once in the recovery surface. Correction and reconciliation share one server transaction rather than exposing an earlier workflow RPC.
- Production release evidence is bounded: linked migrations 216–221 are current, the Vercel Production deployment for commit `27091933` succeeded, and the public login renders `v8.65.11`; only an authenticated retry can verify the two historical PR relationships.

## v8.65.10 (unreleased) — Workflow clarity and audit hierarchy

- Finance approval is one operator decision: it consumes Purchasing's saved AutoCount number, creates the PO atomically, and lands on the ready-to-send Purchase Order. Normal flow never asks for the same identifier twice.
- A legacy `ready_to_convert` record may expose a narrowly labelled recovery form. It must say that correction is exceptional and preserve the saved number; it is not presented as the normal next stage.
- Outlet Daily activity titles name the business fact that changed—Received, Wastage, Qty Sent, Leftover, Notes, or Status. Identical no-op saves do not become timeline entries, and creation identity is always visible.
- Dashboard attention uses a clearly visible but restrained sage field without gradients, thick side tabs, dark hero treatment, or nested cards. Removing a metric must also rebalance the grid so no empty column remains.
- Navigation helper copy describes the next action in ordinary language. “Choose a workspace” replaces permission-model terminology that an operator should not need to decode.

## v8.65.9 (unreleased) — Canvas fit and verified-empty density

- Hidden native scrollbars never imply a decorative fade. A table that genuinely needs horizontal travel remains a named, focusable region; common desktop registers should first fit the available shared canvas by assigning deliberate column measures.
- Form responsiveness is structural: one field per row on phones, two columns at portrait tablet, and four columns only when the document canvas can preserve complete values and labels.
- A time-series with a valid period but zero posted events is a verified-empty state, not a reason to render an empty plot with tiny axes.
- Quick actions are one segmented command group. They do not become a repeated grid of floating icon cards or use decorative lift motion.
- Browser screenshots must be inspected after automation. Passing overflow and accessibility assertions is necessary but does not establish visual hierarchy quality.
- Final localhost acceptance combines both layers: inspected screenshots for the changed surfaces, followed by the complete 99-route, six-role, four-viewport matrix. The owned production-mode runner must also return control after teardown; a hanging process is a harness failure even when its pages passed.

## v8.65.8 (unreleased) — Scroll ownership and native dialog layering

- Hidden native scrollbars do not justify decorative edge gradients, fades or shadows. Horizontal tables retain ordinary touch, trackpad and keyboard scrolling; sticky identity uses only a literal 1px divider.
- Dashboard groups use one sage-tinted hierarchy: a slightly stronger header/command band, 8px internal content padding, flat divided cells and no nested metric cards.
- A combobox inside native `<dialog>` portals its listbox into that dialog, not `document.body`; top-layer ownership is structural and cannot be repaired with a larger arbitrary z-index.
- Purchase quantity and UOM stay visible in Update, Replace and Add line. Before a replacement is selected they are disabled with one short instruction, then enable with the selected item’s purchase UOM.
- Below 1280px, long documents use the page as vertical scroll owner. `html`, `body` and the center workspace must not form competing fixed-height scroll containers.
- In compact PR rows, estimated unit cost is subordinate metadata directly beneath purchase quantity, not a detached value at the bottom of the row.

## v8.65.7 (unreleased) — Compact signal and correction grammar

- Dashboard panels are one grouped surface with flat, divided signal cells. Dark hero blocks, gradients and individually boxed metrics are not the operational hierarchy.
- List workspaces use the shared wide canvas and compact responsive count grammar. On phones, the result number and “records” label form two readable lines; document numbers are 14px titles.
- Workflow status appears once. `In progress` is neutral; `Ready to post` uses a distinct success-ready tone; supporting copy must add meaning rather than repeat the badge.
- Review correction is progressive: selecting Replace opens supplier-scoped candidates immediately, then reveals Quantity and UOM. Add line uses the PR’s canonical supplier and never asks the reviewer to choose a conflicting supplier.
- New Stock Count row actions persist a draft before audited line-scope mutation. The final dashed Add item tile is the canonical add affordance, while native scrollbars remain hidden by product decision.
- Verified-empty secondary insight cards may disappear; an unavailable source remains explicit. Compact helper text may use a local 10px/#adbdb5 treatment when it is metadata, not a global muted-text token change.

## v8.65.6 (unreleased) — V9 compact system authority

The four release viewports are fixed at 390×844, 820×1180, 1180×820, and 1440×900. Native scrollbars remain hidden by product decision; v8.65.8 supersedes the earlier edge-affordance treatment and forbids gradients or shadow fades. Shared fixed typography, medium-weight identity headings, compact copy, 36px minimum touch controls, accessible names for icon-only actions, deliberate reachable overflow, and reduced-motion behavior are automated release authority rather than route-specific exceptions. The 99-route, six-role local matrix passed 52/52 shards and produced 93 Owner screenshots per viewport. These artifacts are local design evidence, not deployment or Production verification.

## v8.65.5 (unreleased) — UAT trust boundary

Production evidence must fail closed before sign-in when the app host, Supabase project, explicit confirmation, or env file does not match the declared target. Environment identity is part of the operator-facing safety model: a successful workflow against localhost cannot be presented as Production evidence, and Production mutation must never inherit local service credentials.

## v8.65.4 (unreleased) — Reliability boundary

Dangerous cleanup remains a narrow Owner workflow: dependency preview, exact identity confirmation, server-side execution, and a retained tombstone. Database compatibility fixes must preserve the current UI and role grammar rather than re-expose retired Location, barcode, or legacy identity concepts. A local build or migration file is implementation evidence; linked migration and authenticated workflow evidence are reported separately.

## v8.65.1 (unreleased) — Actionable Stock Count conflicts

- A snapshot conflict names the affected item and shows starting versus current balance; it never orders an unexplained full recount.
- The physical count remains saved. The error copy distinguishes a genuine concurrent movement from a form-data loss or validation failure.
- Posting remains fail-closed: the UI does not silently rebase a variance or infer a new business quantity.

## v8.65.0 (unreleased) — Reliability states

- Successfully recovered transient failures use a short neutral confirmation, never a red error surface.
- Unresolved failures retain the operator's input, state what cannot continue, and provide one concrete recovery action plus an operation reference.
- System Health is Owner-only. Recovered fingerprints remain quiet and auditable; action-required incidents carry semantic danger status without changing the established surface, type, radius or icon vocabulary.
- Reliability controls do not introduce decorative cards or novel interaction patterns; validation summary, first-invalid focus, badges and right-rail detail remain the shared product grammar.

## Current closure policy (2026-08-23)

Production UAT mutation is allowed only for isolated, traceable test records recorded in `docs/PRODUCTION-UAT-TEST-DATA-2026-08-23.md`. Posted inventory/accounting effects and real operational records remain outside disposable testing; historical notes are retained but this policy is the current authority.

## v8.64.172 (unreleased) - Guided Stock Count completion

Incomplete Stock Count validation follows a familiar enterprise-form sequence: the primary action remains available, submission shows an error summary, the work list narrows to missing rows, and focus moves to the first invalid quantity. Each missing row exposes `aria-invalid` and an associated error description. The operator can return to all items without losing entered values; validation does not substitute zero or bypass the server authority.

## v8.64.170 (unreleased) - Progressive daily entry and actionable trust states

Outlet Daily treats the workday as progressive entry rather than a single terminal form. Users with Outlet value access can save Received as draft, return later for Wastage, and post only when ready. Missing receipt provenance is expressed as a concrete pending line count and recovery instruction, not a generic unavailable label. Purchase Order side rails remove explanatory copy that repeats the action, attachment, or revision surface itself.

## v8.64.169 (unreleased) - Operational information rhythm

PR work queues use visible field labels and identical fixed tracks across the register and Dashboard, so scanning does not depend on icon recognition or variable content width. Long suppliers truncate inside their owned track. Stock Count keeps the ordinal as the row anchor and places a standard ellipsis menu directly beneath it; retirement remains a deliberate dialog task. Movement Ledger prioritizes transaction and item identity through wider fixed columns and intentional horizontal scroll. Neutral cancellation, danger confirmation, and attachment upload now maintain distinct action hierarchy.

## v8.64.168 (unreleased) - Operational table legibility

Outlet Daily uses Action plus Date as its sticky lead band; Date retains a readable fixed track while the remaining columns scroll. Sortable headers use the shared arrow affordance and preserve active filters. Posted uses the success tone while Draft remains neutral. Wastage controls stack inside their owned details track at desktop widths, preventing Chrome horizontal overscroll. Form vocabularies stay controlled: PR UOM is a select, attachment labels begin blank, and supplier grouping uses the muted surface token.

## v8.64.167 (unreleased) - Outlet Daily operational hierarchy

Outlet Daily owns a route-specific document identity instead of repeating the shared location badge. Desktop keeps branch and date on one line; phone uses a 14px branch line and moves the date intact to the next line. The Today rail leads with record count and groups Dispatch, Receiving, Posted, and Incomplete outcomes with dividers and subordinate warnings. Missing Qty Sent copy stays concise because workflow explanation belongs to the validation surface, not the error banner.

## v8.64.166 (unreleased) - Procurement alignment and explicit selection

Compact procurement rows now behave as a deliberate data grid: location/supplier occupy the first row and date/user/item quantity/estimated cost share fixed second-row tracks. Long supplier text truncates without shifting neighboring data. Supplier selection owns the PR item catalogue, item choice remains explicit, attachments use a compact metadata/action row, and rejection feedback uses consistent Lucide icons, typography, spacing, and semantic danger tokens. Cancelled PO permanent deletion remains an Owner-only guarded action rather than an ordinary workflow button.

## v8.64.165 (unreleased) - Branch Stock Count lifecycle

Stock Count row identity remains the item code while the visible ordinal follows the current sorted/filtered list. Retirement is a standard modal task rather than an inline deletion: the current line stays countable, the dialog states the after-posting consequence, requires a structured reason plus operational note, and repeats the final physical quantity. A pending row receives one compact status pill and a reversible `Keep active` action. Item detail owns the durable branch lifecycle record and restore path. Expired AutoCount sessions use explicit JSON/auth messaging rather than exposing parser errors. The four-viewport and role-aware release gates remain required before deployment.

## v8.64.164 (unreleased) - Explicit consequence and compact document controls

Destructive actions use one familiar modal grammar: red trigger, consequence-focused title, neutral escape action, and explicit red confirmation. Attachment upload composes file choice and upload on one row, while existing attachments use icon affordances without a duplicate Download action. Mobile PR work rows align identity, context, commercial data, status, and amount through shared two-column operational grids. Cancelled purchase orders remain discoverable and expose Restore only as a guarded secondary action.

## v8.64.163 (unreleased) - Portrait operational density and correction surfaces

The 820px portrait contract uses the shared contained workspace rather than route-specific full-width canvases. Query controls place search on its own row and keep status/action labels on one line. Dashboard and PR rows use compact two-line operational compositions; document rails remain contextual instead of becoming an uninterrupted long column. PR item correction moves long guidance into dialogs, uses a single viewport presentation, and marks only actionable problem rows with the shared danger tint. Basket supplier groups use distinct surfaces while the basket itself has one immutable branch until cleared. Outlet Daily retains its 390px list and gives 820px and wider screens an explicit column contract rather than reducing type size.

## v8.64.162 (unreleased) - Production UAT cleanup closure

The disposable Production UAT PR is removed through the same guarded Owner deletion boundary used by the interface, not through an unscoped table delete. The cleanup migration requires the exact UUID, request number, `PRODUCTION-UAT` marker, inactive downstream PO state, and active original Owner identity before it can execute; it is a no-op everywhere the exact fixture is absent.

## v8.64.161 (unreleased) - Procurement closure and receiving setup

The PR-to-PO-to-Goods-Receiving journey is exercised as one continuous role-aware browser workflow. On Goods Receiving creation, the required receiving setup is open by default even when the PO is preselected; operators can collapse it only after the Delivery Order context is visible. This avoids a pre-hydration tap race that made the required field appear unavailable on touch devices.

## v8.64.160 (unreleased) - Mobile long-form scroll clearance

Dense Outlet Daily quantity rows explicitly permit vertical touch panning, while document workspaces reserve eight rem plus the device safe area for the fixed action rail. The document remains the mobile scroll owner so Safari browser chrome can still collapse normally.

## v8.64.159 (unreleased) - Purchasing information density and alignment

The mobile PR row is a fixed three-line composition: document/status, location/date/submitter, then item count/supplier with deterministic icon columns and truncation. PR detail gives the summary supplier a two-column, four-line allowance, removes the repeated line-level supplier column, uses an icon-only edit affordance, and narrows the editor. Dashboard action rows add the commercial summary without changing workflow ownership. Outlet Daily shortens the mobile date action to `View` and removes competing draft actions.

## v8.64.158 (unreleased) - Outlet Daily handoff clarity

Qty Sent ownership is communicated independently from Outlet data entry. When the dispatch quantity is unavailable, Received and Wastage controls remain enabled for Outlet Staff, the primary action becomes `Save Outlet Entry`, and completion guidance names Kitchen as the next owner. The blocking server validation is preserved; the UI no longer turns a completion prerequisite into an input lock.

## v8.64.156 (unreleased) - Converted PO cleanup boundary

The PO action rail keeps `Delete unposted order` visible for converted PR purchase orders while they remain approved and unsent. The existing status-gated RPC remains the authority, so the action disappears after sending or receiving and does not create a destructive shortcut around posted work.

## v8.64.157 (deployed) - Kitchen Outlet Daily branch visibility

Kitchen's Outlet Daily workdesk now has a narrow RLS read path for active outlet branch labels, gated by the existing `outlet_daily_record.view_all` permission and company scope. This repairs the branch-list prerequisite without broadening generic branch administration. Production migration 195, v8.64.157 deployment, and the four-viewport Kitchen Qty Sent read-only check all pass.

## v9 design baseline (2026-08-23)

- **Hierarchy:** page title → current work/decision → supporting context → audit detail. Icons assist scanning but never replace a readable label.
- **Density:** reduce repeated chrome and vertical waste before reducing touch targets; preserve 44px touch hit areas on phone/tablet and the fixed bottom navigation at the physical device edge.
- **Navigation:** one canonical destination per action; role-aware quick actions stay visible, while secondary detail uses progressive disclosure.
- **Visual language:** Seri Bako green remains the action color; neutral gray carries ordinary analytics; warning/danger colors stay reserved for actionable caution or blocking/destructive states.
- **Motion:** use short, state-oriented transitions only for disclosure, loading, and confirmation; no decorative motion in data-entry workflows.
- **Acceptance:** every v9 surface is checked at 390×844, 820×1180, 1180×820, and 1440×900 across all seven roles before promotion.

### v9 batch 01 — Shared type hierarchy (implemented; local acceptance passed)

Page headers use the shared display token with optical sizing and a calmer supporting-copy treatment. The scale is intentionally modest so operational density and touch targets remain unchanged; this batch does not alter workflow authority or status semantics. Local Owner, Manager, Purchasing, Finance, Kitchen, and Outlet checks passed at all four target viewports with no horizontal overflow; mobile navigation remained fixed. Production remains on v8.64.157 until promotion and post-deploy verification.

### v9 batch 02 — Motion and interaction preference (implemented; local acceptance passed)

Shared table feedback now consumes the v9 motion token; the reduced-motion media contract keeps operational state visible while removing animation. The CSS-only change preserves the batch 01 six-role × four-viewport geometry evidence. No workflow, permission, or data behavior changes are included.

### v9 batch 03 — Dashboard identity and panel hierarchy (implemented; local acceptance passed)

Dashboard identity and panel headings use shared tokens for a calmer role-first reading order. Local six-role × four-viewport dashboard checks passed with no horizontal overflow and fixed mobile navigation. The change is visual-only and does not alter metric ownership, role visibility, or workflow actions; Production remains on v8.64.157.

### v9 Production visual checkpoint (2026-08-23)

The v9 visual batches are deployed on `main`. Six Production roles passed dashboard checks at all four target viewports with no horizontal overflow or settled loading state; mobile navigation remained fixed. Purchase Requests page-header typography also passed all four sizes. Footer remains `v8.64.157`, and this checkpoint was read-only.

### v9 batch 04 — Advanced visualization audit (accepted; no code change)

The established interactive line chart is retained as the canonical trend surface: it offers hover/touch/keyboard inspection, readable tooltip placement, accessible point data, and green/neutral semantic styling. Avoiding a second chart abstraction keeps the product simpler and the data meaning stable.

## Production UAT checkpoint (2026-08-23, current evidence)

The isolated Production fixture `PR/AUG26/020` completed the intended review sequence (Manager, Purchasing, Finance) and converted to approved unsent PO `UAT-20260823-PO-001`. After main deployment, the PO was removed through the audited cancellation affordance at 09:31 MYT; the PR remains as audit history. No send, receiving, invoice, payment, or inventory mutation was performed. Historical read-only notes remain historical and do not block current work; this fixture's cleanup is now verified, while the broader six-role workflow gate remains open.

## v8.64.155 (unreleased) - Stock Count compact control fix

On the 390px Stock Count surface, quantity entry keeps a minimum 40px readable field while +/- actions remain compact, consistent, and touchable. The UOM label stays visible without squeezing the primary value into a two-character sliver; the desktop/tablet control rhythm is preserved.

The first authenticated Production UAT checkpoint confirms the responsive shell itself is contained across all six roles and four target viewports: phone and tablet navigation remains fixed at the physical bottom edge, while desktop hides it. The earlier v8.64.148 footer observation is retained as historical evidence; current closure still requires promoted-version parity, Kitchen scope, Outlet dashboard loading, and UAT cleanup.

Test-data hygiene: the local disposable E2E records and six test identities used by the audit were removed after verification. `scripts/cleanup-local-e2e.mjs` is guarded to `127.0.0.1`/`localhost` and cannot target Production. The current Production read-only batch confirms four-viewport dashboard/workspace geometry for all six roles; Kitchen sees the outlet matrix and can edit only Qty Sent while Outlet Staff remain unable to edit it.

## v8.64.154 (unreleased) - Local workflow audit hardening

Workflow acceptance uses user-facing, accessible actions as deterministic evidence: Manager PR review opens through the explicit row action rather than relying on synthetic table double-click delivery. Optional movement-ledger fixture assertions are gated after the shared empty-state contract, preserving truthful unavailable/empty states. This hardens the audit without changing the product's visual language or hiding a real business failure; Production role and mutation verification remain a separate gate.

## v8.64.153 (unreleased) - Kitchen-owned dispatch quantity

Outlet Daily makes ownership explicit at the field group: Qty Sent has a concise inline note and accessible description stating that Kitchen and authorised company-wide staff enter it; Outlet Staff see the control disabled while Received and Wastage remain available. The visual cue is informational, not a warning color, so workflow ownership is clear without implying an error.

The local annotation fixture is now provisioned before responsive audit runs, so identity, disclosure, color, keyboard, basket, and Outlet Daily screens are evaluated against real disposable records rather than empty-state assumptions. Core and historical annotation suites passed without changing the established product vocabulary.

The P0 browser-comment pass also exercises the shared filter row, role-safe review, AP aging, dashboard deduplication, production canvas, and low-stock decision surfaces; all six local cases stayed contained at their audited widths.

Stock Transfer, Stock Wastage, and Production Job creation now have a fresh local responsive check across phone, tablet, and desktop; the workflow forms keep their primary actions and every control inside the viewport.

## v8.64.152 (unreleased) - Receiving to invoice progression

Receiving keeps the business Purchase UOM visible while progressively learning the Base UOM conversion at the point of use. Invoice matching stays a flat, line-first selection surface with responsive disclosure on narrow screens; neither workflow requires an operator to navigate a hidden setup maze before seeing the next action.

## v8.64.151 (unreleased) - Quiet role-scoped detail loading

Auxiliary detail data follows the viewer's capability boundary. Owner-only destructive previews are not fetched for ordinary roles, so a normal review page stays quiet and focused instead of surfacing backend authorization noise; the visible action hierarchy remains unchanged.

## v8.64.150 (unreleased) - Exact six-role viewport gate

The responsive audit matrix is explicit rather than inferred from a width-only sweep: phone 390×844, portrait tablet 820×1180, landscape tablet 1180×820, and desktop 1440×900. The same role workspace must keep its hierarchy, fixed navigation behavior, action rail, and zero-overflow invariant at each orientation.

## v8.64.149 (unreleased) - Kitchen dispatch visibility closure

The Kitchen path now has a complete disclosure chain: the role can see Outlet Daily records, the Qty Sent control is enabled, and Outlet-owned Received/Wastage fields remain disabled. The fix is scoped to Outlet Daily RLS policies through `can_access_outlet_daily_branch`; the generic company-branch helper is intentionally unchanged so Kitchen access does not spill into unrelated tenant surfaces.

## v8.64.148 (unreleased) - Qty Sent role boundary closure

The permission matrix is now consistent across Production grants and local/mock mode: Kitchen, Manager, Purchasing, Finance, and Super Admin can confirm dispatch quantities; Outlet Staff cannot. The disabled Qty Sent control remains visible for orientation, while the server-side permission check is the final authority. The local role fixture also verifies that Kitchen cannot edit Outlet-owned Received or Wastage values.

## v8.64.147 (unreleased) - Kitchen dispatch visibility closure

The Qty Sent step is owned by Kitchen, but ownership is not useful unless Kitchen can reach the outlet record. The role now receives company-wide Outlet Daily read visibility plus the dedicated Qty Sent permission; the Outlet role remains branch-scoped and read-only for dispatch quantities. This is a forward-only local patch after Production v8.64.145 showed the Kitchen route stuck at `Loading data...`; linked migration and Production promotion remain separate evidence gates.

## v8.64.146 (unreleased) - Qty Sent ownership and truthful totals

Treat dispatch quantity as an operational fact, not an Outlet-entered estimate. The Qty Sent control stays disabled for Outlet staff and is enabled only through the dedicated Kitchen-and-above permission. When provenance is missing, summary cards say `Unavailable` with `Needs confirmation`; they never manufacture a business zero. Migration 192 is local/unreleased until linked migration application and Production promotion are evidenced.

## v8.64.145 (unreleased) - Production identity and natural-sort audit

Supplier identity keeps the official AutoCount code visible alongside the formal name and operator-facing short name; these roles are not conflated. The mapping form uses a searchable Item Master combobox and keeps Base UOM as a read-only master-data fact, while Purchase UOM remains the relationship-level choice. Item-code lists use natural numeric ordering so `10` follows `9`, not `1`. Production evidence is read-only until the current release is promoted and authenticated mutation UAT is separately authorised.

## v8.64.144 (unreleased) - Explicit PR sourcing handoff

When a saved PR contains non-catalog lines, the side rail keeps the approval action available but adds a warning with the affected count and the responsible next role. The copy distinguishes “approval can continue” from “matching is required before Finance/PO”, so progressive disclosure does not become silent workflow debt.

## v8.64.143 (unreleased) - Explicit Qty Sent readiness

Outlet completion uses a truthful progressive disclosure boundary: the completion action remains available, but the server refuses to post until every line has an authorised Qty Sent fact. The error names the affected product and tells the operator which role can correct it. This prevents a disabled field from silently becoming numeric zero and keeps the daily record state aligned with the underlying data. Local migration 191 and contract evidence are not Production proof until linked migration and read-only regression are complete.

## v8.64.142 (deployed) - Dashboard snapshot cleanup

Do not render a role micro-chart from the dashboard when its values duplicate Payables, Operational pipeline, or Exceptions. Canonical panels own the actionable signal and drill-through; a future trend card must bring a genuinely distinct, time-based data source. The standalone component is retained as a reusable candidate, but is not mounted in the current dashboard. Read-only Production smoke reaches 15 audited routes with footer `v8.64.142`; authenticated role regression remains pending.

## v8.64.141 (deployed) - Dashboard signal deduplication

Owner and Manager dashboards no longer show a repeated Operational trend card for stock counts, wastage, or outlet completion. Those signals stay in Today&apos;s work and Exceptions, where the operator has one clear owner surface and one drill-through. Read-only Production route smoke now confirms footer `v8.64.141`; authenticated role regression remains pending.

## v8.64.140 (deployed) - Keyboard-safe tablet navigation

Touch-tablet and iPadOS shells keep the fixed bottom navigation at the physical screen edge while an editable field opens the software keyboard. The implementation combines visualViewport measurement with the `100lvh - 100dvh` CSS fallback for browsers that do not resize visualViewport. The bar stays behind the keyboard instead of consuming the reduced editing canvas. Footer remains the concise `v8.64.140` token; Production is now promoted, while authenticated role regression remains pending.

## v8.64.139 (deployed) - Production deployment boundary

The public Production route smoke reached 16 core paths with HTTP 200 and footer `v8.64.139`. Treat this as deployment reachability evidence only; authenticated six-role regression and Production mutation validation remain pending. Footer remains the concise `v8.64.139` token.

## v8.64.138 (unreleased) - Linked migration verification

The linked project has now applied migrations 185 through 190. The pg-delta certificate-cache warning is recorded as a catalog-cache issue only; SQL application completed successfully. Footer remains the concise `v8.64.138` token. Production read-only regression is still a separate gate.

## v8.64.137 (unreleased) - Migration uniqueness guard

The release contract now checks every `supabase/migrations` filename for a unique numeric version and protects the forward-only AutoCount repair at 190. Footer remains the concise `v8.64.137` token; this guard does not imply linked migration application.

## v8.64.136 (unreleased) - Post-migration local workflow closure

The local migration-190 browser rerun now covers the critical receiving and procurement path: progressive receiving `3/3` and PR → PO → GRN/attachment/payment `3/3`. A transient dev-hydration timing failure was isolated by a clean rerun and did not reproduce. Footer remains the concise `v8.64.137` token; this is not linked or Production verification.

## v8.64.135 (unreleased) - Migration history reconciliation

Supabase migration versions are now unique in the repository. The linked project already owns version `171`; the duplicate AutoCount Confirm file was renumbered as forward-only migration `190`, preserving the original 171 history and preventing `schema_migrations_pkey` collisions. Footer remains the concise `v8.64.135` token. Linked application is still awaiting successful migration output.

## v8.64.134 (unreleased) - Progressive receiving snapshot closure

The receiving flow now remains resilient when a browser cannot submit the derived factor: migration 189 derives the immutable Purchase-to-Base snapshot from the actual quantities at the line boundary, while invalid or missing base quantities still block posting with the existing actionable message. Local progressive receiving, Recipe, master-data, and Purchase Return mutation checks pass. Footer remains the concise `v8.64.135` token.

## v8.64.133 (unreleased) - Outlet Daily closure audit

Outlet Daily now has fresh local browser evidence for its complete information architecture: detailed records and calendar completion, conditional wastage fields, one direct-post action, company-wide Qty Sent correction, dated detailed export, and bounded desktop/phone analytics. The clean rerun passed 19/19 after excluding a stale unstyled server. Footer remains the concise `v8.64.133` token.

## v8.64.132 (unreleased) - PR to PO error feedback closure

PR conversion now has local browser evidence for both the success path and the duplicate AutoCount PO number path. Duplicate feedback is specific, the entered number remains in place for correction, and the interface does not expose database internals. Footer remains the concise `v8.64.132` token.

## v8.64.131 (unreleased) - Closure ledger reconciliation

Release notes now point to the newest evidence instead of leaving older local-UAT wording ambiguous. This does not promote local browser evidence to linked or Production status; the dedicated PO conversion error-feedback probe is closed by v8.64.132. Footer remains the concise `v8.64.131` token.

## v8.64.130 (unreleased) - AP Aging report closure

AP Aging now has a fresh local browser check for both desktop interaction and phone information density: bucket previews remain keyboard/touch accessible, drill-through links preserve the selected aging context, and the phone surface keeps all seven labels without horizontal overflow. Footer remains the concise `v8.64.130` token.

## v8.64.129 (unreleased) - Purchase Return workflow closure

Purchase Return now has authenticated local browser evidence alongside the immutable GRN snapshot contract: the operator creates a draft from a posted GRN, refreshes the detail, posts the return, and sees the resulting supplier-return movement in the ledger. Footer remains the concise `v8.64.129` token.

## v8.64.128 (unreleased) - Guided PR review closure

The guided line-review dialog is now covered by a real local mutation: the reviewer chooses a replacement Item Master record, supplier, quantity, and UOM, submits one Apply action, and the resulting line plus revision record are checked in local Supabase. The change remains progressive review work and does not require Production master-data mutation. Footer remains the concise `v8.64.128` token.

## v8.64.127 (unreleased) - Current local closure audit refresh

The current clean build retains the complete role-sequenced procurement workspace after migration re-execution: Manager, Purchasing, and Finance actions remain visible only to the correct role, and the downstream PO/GRN/payment path remains usable. Footer remains the concise `v8.64.127` token.

## v8.64.126 (unreleased) - Progressive receiving migration closure

The receiving migration is forward-only and retry-safe: schema additions tolerate an interrupted first application, while named constraints are added only when absent. Local PostgreSQL re-execution and the three authenticated UOM scenarios pass. Footer remains the concise `v8.64.126` token.

## v8.64.125 (unreleased) - Progressive receiving UOM closure

Goods Receiving is purchase-UOM first and base-UOM explicit: known factors calculate the stock quantity, unknown packaging accepts the actual base quantity, and Remember is opt-in per line. Local authenticated coverage proves fixed and floating pack behavior without turning master-data setup into a pre-use blocker. Footer remains the concise `v8.64.125` token.

## v8.64.124 (unreleased) - Fresh local workflow audit closure

The closure suite now asserts the specific supplier validation message surfaced by the PR form and the remaining local workspace, receiving, Outlet Daily, administration, and responsive checks pass 12/12. Footer remains the concise `v8.64.124` token.

## v8.64.123 (unreleased) - Sourcing boundary and fresh role audit closure

Supplier changes provide a clear context reset: stale lines are removed only when the selected branch-scoped supplier catalogue cannot provide them, and the notice explains that Item Master re-selection remains available. This keeps the request surface honest without turning missing supplier setup into a hard blocker. The fresh local evidence batch covers six roles and the required mobile/tablet/desktop annotation geometry. Footer remains the concise `v8.64.123` token.

## v8.64.122 (unreleased) - Recipe workflow and document transition closure

Recipe detail keeps the role-specific Recipe Workflow controls distinct from the generic Document Approval panel. Browser acceptance targets the visible primary action for the current recipe state, avoiding ambiguous duplicate labels while preserving the shared audit timeline. The shared document transition function now qualifies approval-step columns so PL/pgSQL variables cannot shadow table fields. Footer remains the concise `v8.64.122` token.

## v8.64.121 (unreleased) - Master-data mutation closure

The release gate now includes a browser-driven local master-data mutation path: create and edit Branch, Supplier, and Item, then verify the persisted records and soft-delete the disposable fixture. Footer remains the concise `v8.64.121` token.

## v8.64.118 (unreleased) - Local closure audit follow-up

The closure gate records browser evidence by workflow surface: costing-readiness/AP/Recipe, master-data collections and responsive forms, Purchase Return snapshot posting, and Outlet Daily cost/export. Dated downloads derive their fallback date from the OMS Kuala Lumpur business calendar so a midnight UTC boundary cannot rename a local business day incorrectly.

## v8.64.117 (unreleased) - Outlet wastage cost summary

Cost is a decision aid owned by the company-wide operations surface, not an outlet data-entry field. The right rail shows the current day's costed wastage only for permitted company-wide roles; active recipe snapshots are the sole product-cost authority, and missing or partial cost coverage is labelled rather than rendered as zero.

## v8.64.116 (unreleased) - Outlet Daily export UAT

The export dialog now has authenticated local evidence for the full handoff: Purchasing receives a dated file with one product row per record line, provenance labels, and non-fabricated cost states. The same role can correct an unlocked Qty Sent/receiving record through the authorised RPC; the UI continues to keep that correction separate from the download action.

## v8.64.115 (unreleased) - Detailed Outlet Daily export

Export is a record ledger, not a summary-only download: each product line retains date, outlet, status, sent provenance, received/leftover/wastage values, reason, notes, and a dated filename. Wastage amount is a privileged company-wide view backed by the latest active recipe cost snapshot; absent cost authority is labelled unavailable instead of rendered as zero. A returnable local GRN fixture carries its immutable 1:1 conversion snapshot so return posting follows the same source-of-truth rule as production data.

## v8.64.114 (unreleased) - Local workflow closure

The closure batch records responsive and role-matrix evidence separately from Production claims. The local audit exercises the complete no-route procurement path, AP Aging visibility, master-data surfaces, and Outlet Daily missing-sent states while preserving the compact shared workspace rhythm.

## v8.64.113 (unreleased) - Progressive PR sourcing

The PR form keeps one required Supplier suggestion, loads active suppliers independently of branch mappings, and does not hide the Item Master behind an existing supplier route. Item selection shows the known supplier and Purchase/Base UOM context; missing branch or supplier-item routes are explained inline as non-blocking Purchasing confirmation work during review.

## v8.64.112 (unreleased) - Purchase Order transition repair

PO workflow transitions now share one valid document-state vocabulary. Submit, approve, and send retain the visible workflow language without surfacing database enum details.

## v8.64.111 (unreleased) - Receiving posting lock repair

The PO line remains read-only after approval/send for operators. Goods Receiving is the explicit workflow owner for advancing received quantity, using a transaction-local database guard that cannot be reached through ordinary line-edit forms.

## v8.64.110 (unreleased) - Progressive receiving UOM learning

Goods Receiving leads with the physical supplier quantity. A known Purchase-UOM conversion renders Base-UOM as a calculated companion value; an unknown conversion keeps both quantities editable and offers an explicit Remember choice. The UI explains that the current delivery can proceed without pre-configuring every supplier item, while the immutable snapshot remains the inventory posting authority.

## v8.64.109 (unreleased) - PR to PO conversion error recovery

Conversion forms keep the operator's AutoCount PO number after a failed submission and place one actionable error notice above the document content. The notice names the business condition, targets the PO number field when relevant, and never exposes database diagnostics. Successful and already-linked conversion outcomes remain explicit in the same right-rail action surface.

## v8.64.108 (unreleased) - Portrait-tablet alignment and filter density

Invisible form metadata must carry the HTML `hidden` attribute, and forms containing it use rendered-box grid gaps so spacing applies only between visible surfaces. Dense list filters on portrait tablets use two intentional rows rather than shrinking every control into one strip: the primary query and command remain the first row, with contextual filters grouped beneath at equal, readable widths.

## v8.64.107 (unreleased) - Workflow stages and software keyboard

Workflow color improves scanning but never replaces the status label: Manager is muted purple, Purchasing blue, Finance restrained gold, Ready to Convert teal, rejected red, and goods-receiving wait states brown. These tones are stage identities rather than warning severity. Fixed bottom navigation belongs to the physical device edge; when the visual viewport shrinks for a software keyboard, the bar translates behind the keyboard instead of rising above it and reducing the editing canvas.

## v8.64.106 (unreleased) - Final local annotation surface closure

Master-data helper copy must not break the programmatic relationship between a visible field label and its control. Responsive action hierarchy is evaluated on the currently visible rail, sheet, or console rather than hidden responsive duplicates. Inventory movement charts reserve brand green for inbound activity and neutral gray for outbound activity; ordinary Procurement counts remain neutral unless they communicate an actionable warning.

## v8.64.105 (unreleased) - Natural PR register order

Operator-facing document registers sort numeric runs by human expectation before pagination. Default ordering puts the newest PR number first; reversing the Request column produces the exact inverse order without changing the mobile information hierarchy or introducing a second sorting convention.

## v8.64.104 (unreleased) - Sourcing boundary interaction closure

Searchable catalogues use one keyboard model: visible focus, Arrow navigation, Enter selection, Escape dismissal, and stable option identity. Supplier-scoped suggestions show supplier and Purchase/Base UOM at the decision point. Context changes explain cleared rows; rejected documents put correction guidance in the primary reading flow. Missing or undefined ratios use explicit unavailable states and never borrow the visual language of a real zero.

## v8.64.103 (unreleased) - Annotation UAT fixture closure

Responsive acceptance uses explicit localhost-only content states instead of silently skipping empty fixtures. Guided review dialogs, portrait activity rails, conditional wastage controls, and tablet trend charts must render with realistic data while retaining the established four-viewport geometry and role permissions. Fixture content is evidence scaffolding only; it never becomes a Production design or data claim.

## v8.64.102 (unreleased) - Annotation closure round

Lists use one Search/Reset command position, compact count wrapping, icon-assisted mobile metadata, and stable action gutters. Document headers show one document identity; summaries prioritize who, where, how many, when, and value. Neutral information uses brand green or gray, while warning and danger remain reserved for actionable caution and blocking/destructive states. Disclosure controls reduce form density without concealing required errors. These rules refine the OMS design system rather than imitate macOS chrome.

## v8.64.101 (unreleased) - Visible PR Rejection Reason

Rejected PRs use an inline danger-state notice in the main document workspace, showing the reason, actor, and timestamp before the correction workflow. The right-rail Document Timeline remains the detailed audit surface.

## v8.64.100 (unreleased) - Canonical UOM Selection

UOM controls use canonical display values and alphabetically ordered controlled selection. Legacy `BTL` is treated as `BOTTLE`, while `GUNI` is a first-class option. PR review repair derives choices from the Item Master and active supplier terms so a new alias cannot be typed into the workflow.

## v8.64.99 (unreleased) - Unified Page Loading

Route loading boundaries share the same compact progress-line and spinner geometry through `PageLoadingState`. Page-specific labels preserve context without changing placement, scale, or motion between Dashboard, operational lists, and finance reports.

## v8.64.98 (unreleased) - Supplier UOM Receiving Conversion

Receiving lines present the company base UOM as the operator input while retaining the PO supplier UOM in the document and hidden submission payload. The conversion is visible beside each line, with an explicit blocked state when supplier-to-base terms are missing.

## v8.64.97 (unreleased) - Supplier Identity Relationship Consolidation

Supplier Items exposes both the operator-facing Item Group and internal AutoCount code as searchable identity context. Duplicate supplier rows are consolidated in data first; the UI does not pretend that a display filter alone is a merge.

## v8.64.96 (unreleased) - Active Supplier Identity View

Supplier master data opens on active operational identities. Historical inactive rows are discoverable through an explicit status choice rather than competing with the current supplier list.

## v8.64.95 (unreleased) - Structured Brand Migration Compatibility Repair

Brand visibility keeps the existing Items workspace contract; the migration repair changes only how the existing RPC definition is located and patched, preserving the established search and table presentation.

## v8.64.94 (unreleased) - Supplier Merge Mapping Guard Repair

Supplier merge failures are presented as recoverable mapping work, not hidden data mutation: valid lines keep the canonical supplier, while unresolved lines retain a visible repair remark and audit record. No UI state claims linked or Production verification.

## v8.64.93 (unreleased) - Supplier Identity And Filter Apply Repair

Supplier-item tables now show one canonical supplier identity after a recoverable merge, while shared list commands keep Search and Reset aligned at the same compact height. Selecting a different filter can be applied directly; no reset-only interaction is required.

## v8.64.92 (unreleased) - Annotation Rerun Evidence Refresh

The shared annotation surfaces retain the v8.64.91 interaction/read-path fixes after a complete local authenticated rerun; no per-page CSS exceptions were introduced.

## v8.64.91 (unreleased) - Bounded Inventory Read RLS Repair

Movement Ledger retains its explicit tenant/branch authorization contract while the bounded read avoids duplicate policy evaluation that made valid role reads appear unavailable.

## v8.64.90 (unreleased) - Workflow Mutation Gate Repair

Mutation evidence selectors follow the established dialog interaction pattern and target the exact inventory row, avoiding false failures from pre-existing fixture variances.

## v8.64.89 (unreleased) - Supplier UOM Return Alias Repair

Supplier-UOM return posting retains the existing supplier-facing quantity and base-unit accounting semantics; migration 178 only disambiguates the SQL alias used by the conversion lookup.

## v8.64.88 (unreleased) - AutoCount Mapping Identity Guard

AutoCount sourcing surfaces keep the internal creditor code and operator-facing Item Group as separate fields; branch mapping rows never promote a display label into an internal supplier identity.

## v8.64.87 (unreleased) - Bounded Stock Balance Image Hydration

Stock Balance image hydration is bounded in the server query rather than allowing one oversized request; this preserves the compact row presentation without changing inventory authority.

> **Release authority:** the currently released application is `v9.2.86`, as
> defined by `src/lib/app-version.ts`. A versioned section above that number is
> an accepted forward design contract or unreleased implementation note—not
> evidence that the application itself has been released at that version.
> `docs/DESIGN_SYSTEM.md` owns the current visual principles; this file retains
> versioned implementation history and workspace rules.

## v8.64.86 (unreleased) - Role Workflow Evidence Closure

The local role workspace gate exercised the six scoped identities with one responsive workdesk and safe destinations. Non-destructive checks passed; destructive workflow checks remain opt-in and are not represented as completed evidence without a named disposable fixture.

## v8.64.77 (unreleased) - Migration 176 Local SQL Validation

- Migration 176's dynamic patches are newline-safe and preserve explicit brand values through both Item creation and AutoCount Confirm.

## v8.64.78 (unreleased) - Supplier UOM Runtime Contract

- Supplier purchase UOM remains visible on procurement documents while GRN posting converts quantity and unit cost through the supplier-item conversion into the item base unit.
- A rollback-only local PO → GRN fixture proves 2 CTN × 12 = 24 KG and RM120 ÷ 12 = RM10 (RM240 total); the fixture is not Production evidence.

## v8.64.79 (unreleased) - Authenticated Fixture Password Parsing

- Local browser UAT fixtures preserve literal `#` characters in credentials and only treat a hash after whitespace as an inline comment marker.

## v8.64.80 (unreleased) - Production Deployment Audit

- Public Production login-page evidence currently reports footer `v8.64.68`; the pushed `v8.64.79` branch is therefore not deployed to the observed Production host.
- Deployment remains an external gate until the authorized deployment project is reachable and a post-deploy authenticated regression is run.

## v8.64.81 (unreleased) - Supplier Mapping Data Audit

- The local cloud-data mirror contains 323 active items; 38 have no active supplier-item record.
- It contains 425 active supplier-item records; 193 are mapped to CK-ALMA/CK-PJS10 and 233 have no active branch mapping. These are data gaps, not safe candidates for guessed mappings.

## v8.64.82 (unreleased) - Central Kitchen Tally Evidence

- The local mirror has no Stock Count dated 2026-08-19 for either Central Kitchen; the latest posted records are CK-ALMA on 2026-08-17 and CK-PJS10 on 2026-08-06.
- PDF-to-OMS tally equality therefore remains blocked until the linked Production read is available.

## v8.64.83 (unreleased) - Historical Annotation Scope Reconciliation

- The 17-comment, 34-comment, and 13-comment annotation groups plus reopened defects remain cumulative design scope in the single repair ledger.
- Local geometry/authenticated checks and source contracts are not substituted for linked migration, Production data, or Production UAT evidence.

## v8.64.84 (unreleased) - Supplier Mapping Fail-Closed Validation

- AutoCount Preview blocks rows whose Item Group has no authoritative Main Supplier creditor code and identifies the exact source row and repair action.
- Item Group remains the operator-facing label; the internal supplier identity must come from an AutoCount creditor code.

## v8.64.85 (unreleased) - AutoCount Confirm Identity Guard

- The database Confirm boundary repeats the creditor-reference guard, so older staged jobs cannot promote a display Item Group into an internal supplier identity.

## v8.64.76 (unreleased) - Cross-Viewport Control Rhythm

- Shared query controls and right-rail actions use a 36px visual height from tablet through desktop.
- Phone controls retain the larger touch-safe rhythm; no route-level tablet override may restore a 44px visual control.

## v8.64.75 (unreleased) - Structured Brand Visibility

- Item Master and item pickers show an optional authoritative `Brand` value.
- AutoCount accepts Brand only from explicit `Brand`, `Brand Name`, or `品牌` columns; descriptions are never heuristically parsed.

## v8.64.70 (unreleased) - Supplier Identity And PR Review Repair

- Critical stock exceptions use the shared danger semantic treatment; yellow remains reserved for warning or unavailable states.
- PR review preserves supplier reading width by grouping Quantity/UOM and caps the desktop editor at a task-focused 60rem while retaining viewport-safe tablet behavior.
- Duplicate supplier identities are resolved in the data authority and audit trail, never hidden only in a selector.

## v8.64.74 (unreleased) - Stock Take Evidence Reconciliation

- Stock-take PDF evidence is reconciled by known AutoCount/item-code prefixes against the local seed mirror; missing local codes are listed explicitly and are not treated as Production discrepancies.
- Brand tokens remain visible in source item descriptions, but no structured brand field is invented without an authoritative master-data mapping.

## v8.64.73 (unreleased) - Supplier UOM Base Posting Closure

- Supplier purchase UOM remains the document-facing quantity on PR/PO/GRN, while the new posting authority converts received and returned quantities into the item base unit and divides unit cost by the same factor.
- Posting fails closed when a non-identity supplier conversion is missing; no silent KG/count assumption is made.

## v8.64.72 (unreleased) - PR Index And Exception Semantic Closure

- PR Requested Items now exposes a stable visual row index on desktop and phone, including unresolved lines, while retaining the aggregate item count.
- Supplier/UOM and non-catalog exceptions use the danger semantic consistently in compact/mobile review surfaces; stock-unavailable states remain warning-colored because they are retryable read failures.

## v8.64.71 (unreleased) - Supplier Display Identity And Shared Filter Closure

- AutoCount creditor code is the internal supplier identity; Item Group is the operator-facing display label, with the migration retaining recoverable history.
- PR detail exposes a requested-item count, mapping exceptions explain the exact branch/UOM consequence in the shared danger treatment, and mapping actions stay right-aligned.
- Production Jobs uses the contained tablet canvas; Stock Count portrait queries give the search field a full first row before the filter/action row.
- Desktop controls use a 36px visual rhythm. Tablet remains 44px touch-first pending explicit acceptance of the recommended 36px visual / 44px hit-area pattern.

## v8.64.69 (unreleased) - AutoCount Identity Recovery

- Master-data recovery preserves a proven existing identity instead of presenting duplicate records as a successful import.
- A generic import error is not closure evidence; operators need the exact conflicting record and a safe recovery path.

## v8.64.68 (unreleased) - Remote Annotation UAT Recovery

- Authenticated remote visual evidence must use the complete credential value; verification tooling must not silently truncate valid password characters.
- A migration-history match proves schema deployment, not the related browser workflow or Production UI release.

## v8.64.67 (unreleased) - Historical Annotation Closure

- Related quantitative values share one compact table field with a clear primary value and subdued secondary context; duplicated narrow columns are avoided.
- Conditional form details must disappear and clear stale values as soon as their triggering business condition no longer applies.
- Destructive lifecycle controls are not rendered for roles that cannot execute them.

## v8.64.66 (unreleased) - Annotation Workflow Closure

- Operational buttons, filters, and text inputs share a 36px visual height on tablet and desktop; phone remains touch-first.
- Notification badges use semantic danger red, while procurement workflow states keep their role-specific Manager, Purchasing, and Finance colors.
- Dialog backdrops use one black translucent authority. Guided review dialogs use the available work area instead of a narrow side drawer, and portrait-tablet task rails remain visible where declared.
- This is an unreleased implementation note, not production evidence.
- AutoCount right-rail errors retain exact recovery guidance; successful local Preview/Confirm evidence is recorded separately from linked-migration and Production proof.

## v8.64.65 (unreleased) - Shared Responsive Closure

- Tablet list queries calculate columns from real controls: the query owns two tracks, each secondary filter owns one, and the command/result group owns two. This removes the blank track that previously pushed Search and result counts away from their filters.
- Medium tablet split workspaces retain their right action/context rail in portrait orientation. The shared rail contract remains the authority; routes do not add page-specific grid utilities.
- Tables marked with `data-ui-table="true"` use the shared 10px header scale, while route column contracts continue to own business-content widths.
- Local implementation evidence must be followed by authenticated viewport and production regression evidence before this contract is considered released.

## v8.64.61 (unreleased) - UI Annotation Closure

- Release acceptance requires authenticated geometry checks at 390px, 820px portrait tablet, 1180px landscape tablet, and 1440px desktop; source inspection alone is not visual evidence.
- Workflow state uses the shared semantic badge grammar, and long line-entry forms repeat their add-row action at the end without creating a competing primary action.
- Runtime audits may exclude only a precisely identified sandbox-denied public brand asset when an accessible local fallback remains; all application errors still fail the gate.

## v8.64.60 (unreleased) - Responsive Workspace And Form Closure

- Tablet charts remain full-width until a true desktop canvas is available; their internal aspect ratio preserves readable plotting height instead of producing a thin strip.
- Operational right rails align to the first content surface and remain visible on portrait tablets when the workflow depends on their actions or summary context.
- Expandable form sections use one card boundary and progressive disclosure at the section title; line-entry sections repeat Add line at the end for long forms.
- The top navigation owns a single sticky position across viewport classes, while workflow actions avoid competing completion controls.

## v8.64.59 (unreleased) - PR Register Interaction Closure

- Bulk selection, the icon-only action track, and Request identity remain separate semantic columns but form one continuous three-column sticky anchor with no dead gutter or overlapping hit target.
- Sort affordances appear only for fields supported by the server query (`request_no`, `request_date`, and `status`); active filters survive sort navigation.
- Shared Select triggers render the current option label deterministically so server defaults remain visible after hydration.

## v8.64.58 (unreleased) - Compact Operational Table Geometry

- Action columns are icon-only 2.5rem utility tracks with screen-reader labels; visible column labels begin with the first business field.
- Sticky offsets equal the exact accumulated lead-band widths, preventing blank seams or overlap between Action, selection, and identity columns.
- Route-specific tables allocate narrow date, status, and numeric tracks by content while reserving flexible width for business names and descriptions.

## v8.64.56 (unreleased) - P0 Workflow And Responsive Closure

- The exact workflow owner now controls each PR approval action; UI visibility is only a convenience layer over server and database authorization.
- Dashboard no longer repeats Actions, Workspace Context, or Alerts in a second console. Document routes retain one primary action owner and one workflow grammar across phone, tablet, and desktop.
- Canonical list filters retain the accepted two-row tablet geometry; production canvases may expand at wide desktop widths without introducing route-specific caps.
- Operational density follows the decision hierarchy: exception first, compact supporting metrics second, and the complete accessible list/table remains available beneath the visual summary.
- This is a forward design contract for the local P0 patch. The released visual authority remains v8.64.55 until deployment and post-deployment evidence are recorded.

## v8.64.55 - Bounded Reads And Explicit Receipt Provenance

- Inventory opening balances now use the maintained daily summary and keep both the RPC and fallback path bounded to the requested period; a read failure remains an explicit unavailable state instead of a false zero.
- Outlet Daily receipt provenance is stored as an explicit operator fact, so an entered zero is verified while legacy or missing receipt data remains unavailable.
- Shared list controls retain one responsive authority: a full-width tablet query row, equal controls, and a stable action/count cluster without route-specific overrides.

## v8.64.54 - Fail-Closed Reads And Shared UI Closure

- Shared list filters now have one responsive geometry authority: equal secondary controls, a flexible query, and a stable result/action cluster across desktop and touch-tablet widths.
- Dashboard, Outlet Daily, inventory movement, AP aging, product margin, costing, procurement variance, and recipe-costing reads fail closed on missing or incomplete payloads; only verified empty datasets may render zero or an empty state.
- Demand Trend keeps daily data persistently visible beside the chart, and no-line or incomplete coverage is explicitly unavailable instead of a misleading zero.

## v8.64.53 - Dashboard Trust And Report Preview Closure

- Dashboard secondary inventory failures stay explicit and cannot become a trusted zero.
- Demand Trend uses a persistent daily-data companion panel and the shared line chart has reduced stroke/point weight.

## v8.64.52 - Centralized Fail-closed Query Boundaries

- `requireReadRows` and `requireReadCount` in `src/server/queries/common.ts` are the single authority for distinguishing a valid empty result from a missing/incomplete read payload.
- Primary operational modules must call the shared boundary immediately after checking Supabase errors; they must not use `data ?? []` or `count ?? 0` for authoritative list/count reads.
- Real empty results remain valid and render as empty states; missing payloads render retry/unavailable states and never a trusted zero.

## v8.64.51 - Fail-closed Operational Reads

- Operational list, detail, summary, and select-option reads must distinguish a valid empty result from a missing/incomplete Supabase payload.
- Procurement and goods-receiving pages must surface retry/unavailable state when their data contract cannot be verified; they must not display a trusted `0` or empty result.
- Inventory stock-balance base reads follow the same fail-closed boundary.
- Valid empty datasets retain the existing empty-state copy and actions.

## v8.64.50 - Fail-closed Dashboard Fallbacks

- Dashboard fallback head counts treat `count = null` as unavailable, while row reads treat `data = null` as unavailable. Neither boundary silently renders a verified zero or empty queue.
- Low-stock attention uses a verified core snapshot when the bounded view is incomplete and keeps the explicit unavailable state when both sources are incomplete.

## v8.64.49 - Fail-closed Stock Count Reads

- Stock Count list, summary, detail, seed-line, and variance boundaries fail closed on missing payloads. They never coerce incomplete reads into zero counts, empty lines, or an apparently valid empty insight.
- This extends the existing fail-closed contract for Inventory and Outlet Daily Records to the Stock Count workflow.

## v8.64.48 - Fail-closed Inventory And Outlet Reads

- Shared inventory and outlet read boundaries treat a null payload as an unavailable source, never as an authoritative empty result. Valid empty arrays remain valid empty states.
- Tablet list query cards use the established shared control grid; route-specific rules may not add an extra count track or flatten the action group into a third row.

## v8.64.47 - Fail-closed Unverified Receipt Inputs

- Outlet daily detail inputs show `Not verified` rather than a persisted default `0` until receipt provenance is confirmed. Explicit user-entered zero remains valid.

## v8.64.46 - Hide Mobile Chrome on Editable Focus

- On phones, fixed app navigation and task action rails hide immediately on editable focus. This is the fail-safe path for browsers whose software keyboard overlays the visual viewport without emitting a reliable resize delta.

## v8.64.45 - Standardize Quantity Stepper Density

- Quantity stepper geometry is owned by one component-level density contract. Call sites select `touch`, `compact`, or `dense` and do not override descendant button/input dimensions.

## v8.64.44 - Centralize Tablet Rail Geometry

- WorkspaceGrid exposes semantic tablet rail attributes; canonical CSS owns responsive rail geometry instead of competing runtime utility classes.
- Compact and half-width tablet rails are explicit contracts and are verified at representative tablet widths.

## v8.64.43 - Close Query Card Style Authority

- Canonical query cards now have one geometry owner; legacy compatibility rules explicitly exclude them.
- Added a CSS authority contract so a future broad `.sb-list-filters` rule cannot reintroduce duplicate sizing, radius, or spacing.

## v8.64.42 - Converge Report Interaction Scaling

- Shared ranking previews keep the pointer boundary on the chart surface so drill-through controls remain reachable after hover selection.
- Shared line charts use non-scaling SVG strokes so their visual weight remains stable across responsive containers.

## v8.64.41 - Stabilize Touch Tablet First Paint

- iPadOS Safari and Chrome can expose a desktop-sized Macintosh user agent;
  the root layout now marks the touch-tablet shell before first paint so the
  mobile/tablet navigation does not flash in late or leave the desktop shell
  selected after hydration.
- The change is limited to shell selection timing. Established desktop
  workspace geometry and the shared tablet query grammar remain unchanged.

## v8.64.40 - Lock Two-Row Tablet Query Layout

- Tablet list query cards now have one canonical two-row grammar: the query occupies row one; equal-width filters, Search, and the record count occupy row two.
- The desktop action wrapper becomes layout-transparent at tablet widths so it cannot force a third row or make Search narrower than its sibling controls.
- The record count has an explicit final grid track, preventing the recurring third-row regression on Items and other four-control lists.

## v8.64.39 - Converge Tablet Query Tracks

- Tablet list query cards use the number of visible control groups as their
  grid authority. They no longer reserve a hard-coded fourth column when only
  two filters and the Search/count action are present.
- The action group owns one equal grid track; its record count remains an
  intrinsic suffix rather than forcing the Search button outside that track.
- Workspace canvas and tablet shell geometry remain unchanged.

## v8.64.38 - Restore Established Workspace Geometry

- Desktop list and document canvases retain their established route geometry;
  the shared workspace wrapper no longer imposes a global 64rem maximum width.
- The experimental coarse-pointer iPad shell override is removed because it
  competed with the existing runtime tablet shell and changed overflow,
  navigation, and safe-area behavior as one indivisible CSS block.
- A regression contract protects both boundaries: desktop geometry cannot be
  globally capped, and input-capability CSS cannot replace the runtime shell.

## v8.64.37 - Canonical List Action Order

- Every desktop and tablet list query surface now uses the established
  `Search/Reset → record count` reading order from the shared
  `UnifiedListHeader`; routes cannot independently reverse those controls.
- Phone query surfaces retain their compact search/filter/count grammar, while
  desktop controls continue to share the canonical 44px height and single-row
  desktop authority.
- The cross-route browser contract verifies 13 operational lists at phone,
  tablet portrait, tablet landscape, and desktop viewports.

## v8.64.36 - Unified Console Actions

- Master-data actions use one shared icon, size, hierarchy, and mobile-primary
  metadata contract instead of repeating page-local Button and Link markup.
- The right console recognises both resolved DOM action markers and shared
  component metadata, so a create action remains the phone FAB at either React
  rendering boundary.
- Items, Products, and Suppliers now inherit the same action implementation
  while retaining permission-aware create, import, and export visibility.

## v8.64.35 - Compact Report Ranking Previews

- Shared report rankings keep the selected value and drill-through action in a
  fixed right-hand preview affordance rather than adding a third mobile row.
- The complete label and supporting values remain visible in the reserved
  preview region while the 44px action target stays reachable by touch.
- Product margin, recipe costing, demand trends, procurement variance, costing
  readiness, and Stock Count variance inherit the same responsive contract.

## v8.64.34 - Stable Report Ranking Previews

- Ranking lists retain fixed row positions while hover, touch, or keyboard
  selection updates a single reserved detail surface below the list.
- Idle and selected states share the same minimum preview height so comparison
  does not cause layout shift or move the next report section.
- The preview is a labelled live region and keeps its drill-through action
  keyboard reachable without maintaining a second interaction model.

## v8.64.26 - Shared Item Search Authority

- Purchase Request entry and Purchasing Review use the same token-matching
  Item Master combobox rather than separate search rules or a 286-option native
  select.
- Search accepts any remembered words from the item code or name. Selecting a
  suggestion is explicit; free text remains unresolved rather than being
  silently coerced to the first result.
- The shared component owns listbox height, typography, focus behaviour,
  empty-state copy, and the eight-result preview across viewports.

## v8.64.25 - Lossless Non-Catalog Purchase Requests

- Description, quantity, and UOM form the minimum durable requisition line;
  catalogue and supplier resolution are not prerequisites for saving intent.
- Token-matched catalogue suggestions remain optional. Unmatched descriptions
  persist as auditable non-catalog lines instead of disappearing.
- Purchasing Review owns Item Master matching and supplier readiness. The
  workflow cannot advance to Finance until those sourcing tasks are complete.
- Direct contextual supplier mapping remains available from Item, Supplier,
  and Purchase Request sourcing states; bulk import is not the only setup path.

## v8.64.24 - Direct Branch Supplier Mapping

- Item and Supplier record action rails expose contextual `Add supplier mapping`
  actions; users do not need to leave the record and hunt for an import tool.
- The supplier-item form includes branch availability and preferred-supplier
  assignment as one coherent purchasing setup workflow.
- Excel/CSV remains the proven bulk path, while the direct form is the normal
  maintenance path for one-off corrections.

## v8.64.23 - Lossless Purchase Request Entry

Purchase Request catalogue entry uses an explicit token-matching combobox rather
than browser-dependent datalist prefix matching. Non-empty incomplete rows are a
hard save boundary: the UI and server identify them and preserve the current
screen instead of filtering those rows from the submitted aggregate.

## v8.64.22 - Canonical CSS Authority

- A selector has one rule owner inside a given media-query scope. Related
  declarations must be edited together rather than appended later in the file.
- The v2 root tokens, phone filter-sheet grid, and mobile action-button geometry
  each have one canonical definition.
- The CSS authority contract parses the real stylesheet AST and fails when a
  future change repeats an exact selector in the same scope. Viewport-specific
  overrides remain valid because each media condition is a distinct scope.

## v8.64.21 - Stable Stock Count Workspace

- Stock Count line headings remain in normal document flow. They do not use a
  guessed page-level sticky offset, because shell and browser chrome heights
  differ across laptop, iPad, and installed/mobile contexts.
- Phone count cards reserve their limited vertical space for item identity,
  index, variance, UOM, and the physical-count control. Starting balance stays
  available from the wider list layout rather than repeating inside the card.
- The existing two-column phone grid, leading numeric index, full item name,
  and direct-entry stepper remain the single mobile counting template.

## v8.64.20 - Stable Outlet Completion Matrix

- The seven-day completion matrix fills the shared canvas rather than leaving
  a large blank desktop remainder, while retaining horizontal scroll on narrow
  screens.
- The frozen outlet column owns an opaque seam over separated cells so date
  controls cannot leak through its left edge while scrolling.
- Exact status detail remains hover, focus, and tap driven. No preview strip or
  blank row is reserved before the operator selects an outlet-day.

## v8.64.19 - Responsive Procurement Lines

- Purchase-request line editors use the stacked touch grammar through 1023px;
  the dense one-row table grammar begins at 1024px rather than forcing an iPad
  portrait or narrow split canvas into laptop columns.
- The laptop row owns one explicit track template: flexible bounded item,
  10rem quantity stepper, 8.5rem UOM, and 6.5rem actions. All controls continue
  to inherit the single shared control-height authority.

## v8.64.18 - Canonical Workspace Canvas

- `WorkspaceGrid` is the only workspace-width owner. Lists and documents both
  default to the contained 64rem canvas; technical data workspaces must opt in
  to the 76rem wide canvas, and full width is an explicit exception.
- The content canvas is centered with one gutter contract, so routes cannot
  acquire different left and right whitespace from their immediate children.
- Touch-first tablets from 768px through 1366px receive the tablet shell from
  input capabilities before hydration. Runtime `maxTouchPoints` detection
  remains the fallback for iPadOS desktop mode and mixed pointer reporting.

## v8.64.17 - Canonical List Command Rows

- `design-system-v2.css` owns one canonical list-workspace block. Duplicate wrapper and phone query-card declarations are prohibited by contract tests rather than left for cascade order to resolve.
- Desktop query cards stay on one intentional command row: the query absorbs remaining width, secondary filters share one compact measure, and the terminal action uses the established action width. A narrowed centre workspace must not strand Search on an empty second row.
- Tablet retains its independent four-track, two-row grammar and phone retains `UnifiedListHeader`; desktop convergence must not overwrite either viewport contract.

## v8.64.16 - Authoritative Outlet Daily Reads

- Received quantity uses its own database provenance. Sent-source metadata can
  no longer make a valid outlet receipt appear unavailable.
- List reads are filtered and paginated before line hydration. Pages never scan
  every historical line, branch, and staff row to render 15 records.
- Concurrent creation converges on the existing outlet-day record instead of
  exposing the unique-index race to the operator.

## v8.64.14 - Canonical Responsive Controls And Outlet Analytics

## v8.64.15 - Annotation Close-out And Touch Tablet Shell

This release turns the repeated annotation failures into one acceptance template.
The rule is applied at the shared owner first; a route may only supply content,
data, and semantic variants.

- **Canvas:** preserve the established route geometry: document workspaces use
  the contained intent and list workspaces use the wide intent unless the route
  explicitly opts into another existing mode. The shared wrapper must not add
  a global desktop `max-width` cap.
- **Shell:** phone uses the mobile top context and bottom navigation; normal
  desktop uses the left navigation and right action rail. Tablet mode remains
  owned by the existing runtime shell marker; broad input-capability CSS must
  not independently replace navigation, overflow, and safe-area behavior.
- **Toolbar:** every list query surface uses one owner and one 44px control
  geometry. Desktop command controls share a 10rem track; landscape tablets
  use a full-width query row followed by one equal-track filter/action row;
  phones use the dedicated search/filter sheet. Search and record count remain
  separate from the result surface.
- **Surface:** query and content are sibling surfaces. A route wrapper around a
  query card is flattened rather than rendered as card-inside-card. Panel and
  control radii come only from the shared tokens.
- **Action:** desktop/tablet primary actions stay in the right rail; phone
  actions stay in the safe bottom rail. Duplicate in-flow Save/Submit/Review
  actions are defects, not alternate design variants.
- **Truth and loading:** a failed or unverified read is `Unavailable` with a
  recovery path, never `0`, empty-success, or fabricated totals. Loading uses a
  real spinner or final-shape skeleton; blank preloaded-looking boxes are not a
  valid state. Stock Count mobile rows therefore keep the compact two-column
  card without an artificial minimum height.
- **Annotation acceptance:** each new screenshot is classified as Canvas,
  Shell, Toolbar, Surface, Action, Data state, Loading, or Density. The fix is
  accepted only after the shared source, a contract test, and representative
  390/820/1180/1440 checks agree. Reports are regression coverage, not the
  primary queue until this annotation backlog is closed.

- Purchase Request line geometry is owned by the form component and control height by one shared CSS rule; mobile rules only place the controls and no longer redefine their dimensions.
- Bulk deletion review now lives in the selected-items action cluster beside `Deselect all`, so selection actions have one predictable owner and placement.
- Master-data search, status, More filters, and Search controls use one equal-width desktop contract, including the More filters summary trigger.
- Outlet Daily wastage analytics use a thinner two-pixel line and keep the daily data list visible beside the chart on wide layouts, while stacking it below the chart on phones.
- Mobile bottom navigation is hidden while the on-screen keyboard owns the reduced visual viewport, preventing it from floating over Outlet Daily inputs.

## v8.64.3 - Mobile Keyboard Chrome Hardening

- Mobile fixed navigation and document action rails hide while an editable field has opened the on-screen keyboard, preventing the action chrome from floating over the focused input. The rails return when the keyboard closes.

## v8.64.7 - Keyboard-safe Mobile Actions

- Mobile keyboard detection keeps the last stable pre-keyboard viewport height, covering Android Chrome configurations that resize `innerHeight` and `visualViewport` together. Fixed navigation, document actions, and create FABs stay out of the keyboard corridor while editing.

## v8.64.8 - Pinned Completion Matrix

- Outlet Daily completion keeps the outlet column readable and frozen while the seven date columns use fixed widths inside a bounded horizontal scrollport. Mobile copy now describes the actual swipe interaction instead of claiming that every date fits without scrolling.

## v8.64.9 - Low Stock Select All

- Low Stock procurement now exposes one branch-scoped select-all checkbox on desktop and mobile. It reports an indeterminate state for partial selection and never selects rows while the branch scope is unchosen.

## v8.64.12 - Readable Outlet Timestamps

- Bounded, read-only inventory RPCs retry only transient timeout, connection, HTTP 500, and temporary-service failures with a short capped backoff. A final failure still reaches the existing explicit unavailable state; no retry path substitutes zero rows or zero totals.
- Outlet Daily's updated timestamp keeps the date and time on separate readable lines in the desktop table instead of concatenating the two values.

## v8.64.13 - Responsive Form And Loading Polish

- Purchase Request line controls now share one canonical responsive geometry: item search truncates instead of stealing quantity width, the quantity stepper uses the shared control height, and item-to-supplier spacing remains explicit across phone, tablet, and desktop.
- Purchase Request detail keeps the draft save action in the document action rail, removing the duplicate in-flow button and its reserved blank space on mobile.
- Outlet Daily keeps the operator-facing `Posted` badge without the redundant `Posted · editable` helper line and aligns status content to the trailing edge of the record row.
- Outlet Daily and Stock Count route loading now use a compact source-aware spinner instead of large empty skeleton boxes. The UI never implies that unverified values are zero while data is still loading.
- Mobile app chrome uses a white safe-area/top-bar surface with a light shadow while scrolling underneath; the shell background tokens no longer introduce a warm beige band between cards.

## v8.64.5 - Verified Receiving Provenance

- Outlet Daily totals treat receiving as verified only when the line carries an explicit, non-legacy provenance source. Unavailable and legacy-unverified rows remain visibly unavailable instead of being folded into a misleading zero or wastage percentage.
- Stock Count phone entry keeps the compact two-column card pattern: item context and variance share the top row, while the quantity control occupies the lower row with stable touch targets. Desktop and tablet keep the aligned technical-table geometry.

## v8.64.4 - Stable Report Preview Surfaces

- Ranking, aging, production-signal, and inventory-movement previews keep a compact muted surface in the layout before selection. Hover, touch, and keyboard focus replace the instruction in that same reserved slot, so exact values and drill-through actions do not make the surrounding report jump or flicker.

## v8.64.2 - Inventory Read Reliability Hardening

- Optional inventory insight reads now use bounded base-table fallbacks when their RPC migration is absent, and any incomplete source remains explicitly unavailable.
- Stock Balance failures propagate into Movement Ledger valuation instead of appearing as zero rows or `RM 0.00`.
- Date-first posted-ledger and Stock Count indexes target the timeout pattern recorded by Supabase (`57014`) without changing tenant or running-balance semantics.

## v8.64.1 - Inventory Read Compatibility Fallbacks

- Stock Count variance insight falls back to the same tenant-scoped base tables when migration 149's RPC is missing or stale, while preserving an explicit unavailable state if any source fails.
- Stock Card and Movement Ledger table fallbacks avoid the unbounded `stock_ledger_view` window that caused statement timeouts and never expose a zero count when the read is incomplete.

## v8.64.0 - Fail-Closed Procurement Joins

- Purchase Request and Purchase Order list reads validate their branch, supplier, and line joins together; a failed join returns a retryable unavailable state instead of a row with missing scope context or fabricated totals.
- Procurement lists hide result counts and pagination while unavailable, preserving the distinction between an empty queue and an unverified queue.

## v8.63.0 - Fail-Closed Goods Receiving Joins

- Goods Receiving list reads validate line totals and the related PO, supplier, and branch labels together; a failed join returns a retryable unavailable state instead of a partial row with fabricated `-` labels or zero totals.
- The list keeps the current receiving data hidden while unavailable, including the result count and pagination, so operators cannot mistake a read failure for an empty queue.

## v8.62.0 - Fail-Closed Outlet Daily Detail

- Outlet Daily detail reads validate record, line, branch, product, and staff sources together; any failed source returns a retryable unavailable state instead of a partial record with misleading totals.
- The detail page keeps the same source-trust language as the list and trend surfaces: verified zero remains a fact, while unavailable data remains visibly unavailable.

## v8.61.0 - Stock Count Card Alignment and Status Semantics

- Stock Count mobile cards keep item identity and variance in one compact top row, with the quantity control spanning the card below it; tablet and desktop retain the dense list/table geometry.
- Mobile-only document status markers are not reused on the desktop/tablet status node, preventing duplicate status semantics while preserving the same visual status at each breakpoint.

## v8.60.0 - Source-Aware Daily and Stock Count States

- Outlet Daily Records fails visibly with a retry state when authoritative receiving data cannot be verified; it does not render an empty summary as zero.
- New Stock Count refuses to open an editable sheet when the branch or starting balance source is unavailable; the operator must retry instead of confirming substituted zero quantities.

> **Precedence:** `docs/DESIGN_SYSTEM.md` is the living visual and interaction contract. When a historical release note or an older rule in this file conflicts with that contract, the living contract wins. Update both documents when a new pattern is accepted; do not preserve a visibly weaker rule for compatibility.

This document is the implementation contract for every customer-facing route, form, record workspace, table, panel, dialog, and mobile action bar. It applies to new work and to refactoring of existing UI.

## v8.59.0 — No-Record Trend State Clarity

- Outlet Comparison rows with no completed records now show `Unavailable` metrics instead of fabricated zero totals; the reason remains visible beside the outlet name.
- Confirmed zero values remain numeric, so a real zero is still distinguishable from missing or unverified data.

## v8.58.0 — Single-Point Chart Label Clarity

- Shared line charts center the only date label when a filtered result contains one point, instead of rendering the same date at both endpoints and implying a false time range.
- Multi-point charts retain the established first/last endpoint labels; preview, keyboard, touch, and drill-through behavior remain unchanged.

## v8.57.0 — Explicit Inventory Movement Empty State

- Inventory daily movement renders a deliberate no-record state when the bounded query succeeds with zero rows; it never presents an empty axis as an implicit zero result.
- Movement chart hover previews clear when the pointer leaves or focus leaves, while touch and keyboard selection remain available; the chart now uses the canonical control-radius token.

## v8.56.0 — Responsive Ranking Preview Density

- Shared ranking previews use a two-line mobile row: rank, label, and value stay on the first line, while the bar spans the full second line for long labels and values.
- At wide desktop widths the same rows return to the compact four-column rank, label, bar, and value layout; hover, touch, keyboard preview, and drill-through links remain unchanged.

## v8.55.0 — Responsive AP Aging Distribution Preview

- AP Aging and Cash Flow distribution rows use a two-line mobile pattern: the label and amount stay together, while the bar receives the full second line for readable long bucket names.
- At wide desktop widths the same rows return to the compact three-column label, bar, and value layout; hover, touch, keyboard preview, and drill-through links remain unchanged.

## v8.54.0 — Source-Aware Loading for Outlet and Stock Count

- Outlet Daily Records and Stock Count now reserve the real workspace shape while data is loading, instead of presenting a blank canvas that can be mistaken for an empty or zero-valued result.
- Loading states explicitly say that verified quantities are still being read; they do not render operational zeros, empty-success copy, or fake rows.
- Stock Count creation has its own loading boundary so the item seed cannot appear to be ready before the latest verified balance has arrived.

## v8.53.0 — Outlet Coverage Trust and Mobile Anchoring

- A successful Outlet Daily read with no records no longer produces a synthetic received total of zero; no-record and unavailable states remain distinct from verified zero.
- The seven-day completion matrix keeps its outlet column pinned while the date grid scrolls on phones, tablets, and desktop.
- Existing hover, focus, touch preview, and explicit record opening remain unchanged.

## v8.52.0 — Responsive Report Rankings

- Ranking cards now own their descending metric order with deterministic tie-breaks, so filtered or streamed data cannot render a misleading rank sequence.
- Ranking rows use a compact two-line mobile pattern (label/value above, bar below) and return to a single-line desktop layout at wide breakpoints.
- Hover, touch, and keyboard selection continue to expose the same progressive preview and drill-through action.

## v8.51.0 — Trusted Stock Count Positions

- Stock Count item numbers are anchored to the authoritative seed order. Searching, filtering, or changing the Name/Code sort no longer makes an item appear to change position.
- The Stock Count starting-balance contract remains fail-closed: query failures stop the workspace, verified posted counts and ledger balances may prefill, and an unverified zero stays blank.
- Import guidance distinguishes item-master rows with a blank Main Supplier from a usable purchasing mapping; blank supplier cells are never promoted into invented relationships.

## v8.48.0 — Receipt Anomalies Stay Visible

- Outlet Daily Records preserve a confirmed `Received = 0` as zero, but flag it as `0 · verify` whenever Qty Sent is positive. The list, detail page, and Today rail expose the same reconciliation cue without substituting sent quantities or inventing a receipt.
- The detail workspace explains that the operator must confirm whether nothing was received or the receipt entry is incomplete. Unverified receiving values remain `Unavailable`, so missing reads never collapse into a misleading zero.

## v8.50.0 — Unverified Outlet Receipt Values Stay Blank

- Legacy Outlet Daily rows whose receiving value was only a database-default zero remain visibly unavailable instead of being carried into new forms as an entered quantity.
- Explicit zero receipt values remain valid and are still flagged when Qty Sent is positive so operators can verify the reconciliation.
- The Stock Count new-document status-only header remains part of the same release baseline; it does not reintroduce an invented step indicator.

## v8.49.0 — Stock Count Status Without Invented Steps

- Stock Count creation uses the canonical Draft/Posted status directly. The shared document shell supports a status-only variant for workflows where an extra `Step 1 of 2` label adds no business meaning.
- The compact two-column phone count cards, ordinal markers, full item names, and desktop/tablet scan layout remain unchanged; only the redundant progress affordance is removed.

## v8.47.0 — Unavailable Counters Stay Explicit

- Procurement workspace counters preserve a successful zero but render `Unavailable` when an individual summary read fails. The linked queue remains the source of truth and the workspace explains that the summary should be retried.
- The change follows the same trust contract used by Outlet Daily Records and Stock Count: failed reads never become empty-success or zero-success states.

## v8.46.0 — Supplier Mapping UOM Validation

- Procurement forms validate branch, item, supplier, and requested UOM as one mapping. A supplier relationship in a different purchase UOM is not treated as a valid source.
- Purchase Order creation explains whether a specific item/UOM mapping is missing or whether no single supplier covers the complete order, with a direct link to the branch-supplier import flow.

## v8.45.0 — Unverified Stock Counts Stay Blank

- Stock Count seed lines no longer prefill `0` when an item has no posted ledger movement or prior physical count. These rows remain blank, are marked as requiring a physical count, and cannot be saved until observed by the operator.
- Existing two-column mobile cards expose starting-balance provenance directly: ledger-derived values are labelled, while unavailable balances are visibly distinguished without inventing a quantity.

## v8.44.0 — Operational Business Date Consistency

- Dashboard, inventory, procurement, receiving, production, stock operations, notifications, AP, and outlet records share one `Asia/Kuala_Lumpur` business-date helper. Date ranges shift from the business date instead of the server's UTC calendar, preventing local-midnight reads from presenting transient zeros or empty results.

## v8.43.0 — Kuala Lumpur Business Date Consistency

- Dashboard and operational records share one `Asia/Kuala_Lumpur` business-date helper so the local midnight window cannot read different days and present transient zeros.

## v8.42.0 — Stock Count Variance Clarity

- Outlet Daily Records expose the operator-facing `Posted` label for the completed editable state. The internal `evening_completed` workflow value remains unchanged for database and transition authority.
- The completion rail reports records posted today; completed outlet records are not counted as a fictitious review queue because outlet staff post directly.
- Stock Count leaves percentage variance as `—` when the theoretical quantity is zero; an undefined ratio is never presented as a false `0%` result.

## v8.39.0 — Stock Balance Procurement Density

- Stock Balance uses the same balanced query geometry as the other operational lists; search, branch, status, and the submit action no longer use page-specific width caps.
- The desktop PR basket keeps its persisted branch/supplier/UOM behavior while reducing duplicated summary copy and compacting preview steppers, UOM controls, and removal actions. Mobile touch targets remain unchanged.

## v8.38.0 — AP Aging Query Surface Refinement

- AP Aging now uses the shared balanced FilterBar. Search, supplier, aging bucket, More filters, and the submit action keep the same operational geometry as the other list workspaces.
- Status and date-range controls remain in the anchored More filters panel, while the invoice table stays a separate content surface. Active filters are counted consistently and all controls expose stable accessible names.

## v8.37.9 — Operational Filter Surface Consistency

- Production Planning uses the shared filter surface directly instead of wrapping it in a second card. Planning, Stock Counts, and Production Jobs use the balanced query geometry so search, branch/status controls, More filters, and the submit action do not drift between operational lists.
- Planning filter controls expose explicit accessible names, and the page keeps one query surface across desktop, tablet, and phone layouts.

## v8.37.8 — Report Filter and Chart Accessibility Refinement

- Report filter surfaces use one balanced desktop geometry across Demand Trend, Product Margin, Recipe Costing, Costing Readiness, and Procurement Variance; query, select, More Filters, and submit controls remain one scannable decision row.
- Shared interactive line charts retain hover, touch, and keyboard previews while exposing an accessible point-by-point data list to assistive technology.

## v8.37.7 — Trusted Receiving and Stock Count Source Guard

- Outlet Daily receiving totals distinguish verified quantities from database-default zeros. Missing lines or unproven legacy zeros render as unavailable, and demand trends exclude those records from reliable totals.
- Stock Count seed balances fail closed when the source query is unavailable; form submissions reject incomplete quantity fields instead of silently defaulting them to zero.
- User-provided stock-take workbooks are treated as import evidence only after item-code and quantity completeness checks. Blank inventory columns cannot become physical counts.

## v8.37.5 — Report Surface and Empty-State Refinement

- Demand Trend uses the shared filter surface directly; no extra card wraps the query surface.
- Empty daily and ranking insights remain explicit, compact, and trustworthy when no reliable outlet data exists. A missing or incomplete source is not rendered as a zero chart.
- Keyboard-focused ranking previews stay selected when the pointer leaves the row, while transient mouse previews still dismiss naturally.

## v8.37.4 — Report Preview Interaction Refinement

- Shared report previews now distinguish transient mouse hover from committed touch/click or keyboard selection. Moving away from a ranked row or signal no longer leaves a stale preview open, while drill-through remains available after an intentional selection.
- Line-chart previews expose the active point index and announce updates through the live region, preserving the same hover, drag, touch, keyboard, and drill-through contract across report families.
- AP Aging and Production Variance now use the same focus, pointer, Escape, and preview relationship as ranking charts, so the report hierarchy remains compact at rest and predictable on phones.

## v8.37.3 — Operational UI Closure Round 2

- Stock Count removes the duplicate custom progress panel and keeps the canonical Draft → Posted workflow in the shared document header. Phone lines use a proven two-column count-card layout with full item names, leading ordinal markers, compact controls, and a desktop/tablet scan-friendly list.
- Purchase Order lines expose a real selectable purchase UOM, avoid repeating the item code beneath the selector, and restore the outer work surface. Purchase Return reasons use a controlled dropdown with notes shown only for Other.
- Outlet Daily completion keeps outlet labels pinned during wider-workspace scrolling, moves coverage into the contextual rail, and treats auxiliary read failures as unavailable instead of rendering misleading zero totals. AP Aging and Cash Flow now separate query/content surfaces and remove duplicated financial context.
- Shared filter overlays anchor to the trigger edge on tablet/desktop, avoiding detached panels; all changes preserve server-side authority, touch targets, and existing document workflows.

## v8.36.96 — Unified Mobile Create Actions and Report Detail Links

- All mobile create commands use the same circular floating action geometry, icon size, elevation, and safe-area offset; the obsolete inline list-toolbar create slot is removed so a page cannot drift into a second `+` pattern.
- Demand Trend keeps the chart preview focused on exact values and exposes accessible daily drill-through links in the full-detail table/list, carrying the selected outlet and status scope into Outlet Daily Records.
- The Outlet Daily chart touch regression now scrolls the analytical panel into view before sampling it, preserving the task-first phone order while still verifying tap preview behavior.

## v8.36.95 — PR Basket Persistence and Shared Mobile Actions

- Outlet Daily Records uses the shared PageHeader create action on phones, so its floating `+` matches Purchase Requests and other operational workspaces.
- Missing outlet-days in the completion preview expose a direct create link with the selected branch and date; the new-record form accepts those scoped values while rejecting future dates.
- Stock Balance keeps the PR basket in device-local storage scoped to the visible branch set. The browser copy is recoverable convenience state only; server-side branch and supplier validation remains authoritative when a PR is created.

## v8.36.94 — Outlet List First on Mobile

- Outlet Daily Records keeps its completion matrix and wastage trend, but the mobile reading order is task-first: filter, record list, then secondary insights.
- Desktop retains the insight-first layout because the wider workspace can show the bounded analytics without burying the record queue.
- The responsive contract covers both the list-first phone order and the existing matrix/chart detail surfaces; no data or status semantics change.

## v8.36.93 — Consistent Wastage Workflow

- New Stock Wastage uses the same DocumentWorkspace shell as Stock Count, Stock Transfer, Goods Receiving, and Purchase Returns.
- Mobile users see the current Draft status and `Step 1 of 2` workflow context before entering lines.
- Wastage validation, evidence guidance, and the primary action remain available through the shared mobile action surface and desktop side panel.
- The responsive workflow audit now includes Stock Wastage creation, preventing this long-form path from drifting away from the shared document contract.

## v8.36.92 — Drill-Through Variance Rankings

- Procurement Variance price rankings keep the active report filters and add the ranked item code to the drill-through URL.
- Every ranked price anomaly now exposes an `Open` action so preview and review form one complete path from signal to source list.
- The ranking prompt explicitly tells operators that `Open` narrows the detail list to the selected item.

## v8.36.91 — Honest Margin Empty States

- Product Margin distinguishes an empty product master from a filtered-out result on both the desktop table and mobile decision list.
- Margin reporting never claims readiness when there are no active products; the empty state points operators to the correct setup action instead.
- The mobile report preserves one shared title and description for both responsive renderings, preventing desktop/mobile semantic drift.

## v8.36.90 — Runtime-Honest Workspaces

- Optional reporting enhancements degrade to an explicit unavailable state when a database capability is missing or temporarily unavailable; expected capability gaps remain observable as warnings without presenting a healthy workspace as a browser error.
- The static workspace audit captures page errors and console errors in addition to geometry, overflow, and filter alignment, covering all canonical routes at mobile, tablet, and desktop reference widths.
- Recipe Costing empty states distinguish “no active recipes” from “no recipes match these filters,” so the page never claims readiness while also showing an empty result.
- Low Stock list rows provide stable React keys for trailing actions, eliminating repeated-key warnings during client rendering.
- A clean runtime gate now verifies 69 canonical routes at `390px`, `820px`, and `1440px` widths after each release slice.

## v8.36.89 — Stable Mobile Workspaces

- Outlet Daily Records keeps its phone create command inside the filter toolbar. The action remains visible without floating over branch names, quantities, empty-state guidance, pagination, or the persistent bottom navigation.
- The shared Unified List Header exposes a reusable phone end-action slot so dense operational workspaces can opt out of a floating action without creating a page-specific toolbar.
- Authenticated workspace content no longer fades from zero opacity during streamed navigation. Headers, context, and working data remain immediately legible while explicit loading and interaction feedback continue to communicate change.
- Browser regression coverage verifies that the Outlet Daily create command is toolbar-owned, non-fixed, and contained within the mobile filter surface.

## v8.36.88 — Readable Dense Reports

- Ten-column decision reports do not switch to a technical table merely because the viewport reached `xl`; the available main canvas must also be wide enough after the navigation and report guidance rail are present.
- Procurement Variance, Product Margin, and Recipe Costing keep their complete Operational List through 1440px and switch to the dense table at `2xl`, where all decision columns and the final status/action remain readable together.
- The shared Table and Operational List primitives now support a `2xl` handoff. No report field is removed, compressed into unreadable text, or hidden behind an apparently clipped table edge.

## v8.36.87 — Accessible Report Filters

- Every Reports select filter exposes a stable purpose-specific accessible name rather than relying on the currently selected option to imply its meaning.
- Recipe Costing uses the shared `Input` control for search, bringing its focus treatment, control height, and semantics in line with Product Margin and Procurement Variance.
- The change is interaction-neutral: query parameter names, filter values, result ordering, layout geometry, and report calculations remain unchanged.

## v8.36.86 — Progressive Demand Detail

- Demand Trend keeps summary metrics, the interactive daily chart, and preview-first rankings as the primary report layer. All four raw data collections use one consistent collapsed detail disclosure beneath that layer.
- Each disclosure names its dataset and exact row count, remains keyboard operable with a 44px minimum summary target, and reveals the same complete desktop table or narrow-workspace list on demand.
- Collapsing Outlet Comparison and Daily detail reduces initial mobile density without removing the accessible data authority that supports chart previews and trust review.

## v8.36.85 — Complete Mobile Product Margin

- Product Margin phone and tablet rows retain the desktop margin band alongside status, price, estimated cost, signed margin, margin percentage, recipe confidence, and next review action.
- The compact trailing meta owns only the short margin band. The longer next action moves into the full-width detail hierarchy so it cannot squeeze or truncate the product identity.
- Unavailable price, cost, margin, or confidence remains explicit and never appears as a valid zero; the row destination still follows the status-aware review path.

## v8.36.84 — Complete Mobile Recipe Costing

- Recipe Costing phone and tablet rows preserve the complete decision authority of the desktop table: lifecycle, confidence, line count, missing cost, UOM mismatch, ingredient cost, output, cost per output, warning, and next action.
- Cost per output is promoted beside confidence while line count remains compact metadata. Cost gaps and UOM mismatches stay together in the detail hierarchy instead of competing in one unbroken trailing label.
- Missing ingredient cost, output, or cost per output remains explicitly incomplete or unavailable; mobile compaction never converts an absent value to zero.

## v8.36.83 — Preview-first Outlet Completion

- Every Outlet Daily completion cell is a selection control. Hover, touch, click, and keyboard focus reveal the same authoritative outlet-day status without navigating away.
- Existing records open only through the persistent `Open daily record` action in the preview region, matching the system-wide preview-before-open contract and preventing accidental phone navigation.
- Missing outlet-days remain previewable but expose no false record action. The seven-day matrix, compact phone summary, and complete record authority remain unchanged.

## v8.36.82 — Drillable Costing Distributions

- Product Margin readiness and Recipe Costing confidence distributions retain preview-first pointer, touch, and keyboard behavior while adding one explicit Open action.
- Open preserves the current report scope and replaces only the selected authoritative `status` or `confidence` filter before returning to the same complete detail list.
- Existing search, lifecycle status, margin-band, recipe-link, and cost-gap filters remain intact; the distribution never opens a decorative or unsupported query parameter.

## v8.36.81 — Drillable Demand Product Rankings

- Demand Trend product rankings retain their hover, first-touch, and keyboard preview while adding one explicit Open action in the persistent preview region.
- Open preserves the resolved period, branch, and reliable-record status before applying the selected product to the same report and full detail tables.
- Daily movement remains preview-only because the report has no authoritative single-date filter; the existing Daily detail remains its complete source instead of introducing a decorative URL parameter.

## v8.36.80 — Drillable Procurement Variance Insights

- Procurement Variance follows the shared report hierarchy: scope filters, filtered status metrics, preview-first rankings, then complete technical and phone detail.
- Status ranking previews expose an explicit Open action that preserves the current search and date range while applying the selected comparison status to the same detail authority.
- PO-to-GRN price rankings use the documented warning rule of more than RM 0.01 or 2%; small absolute differences that exceed the percentage threshold are no longer omitted from the insight.

## v8.36.79 — Scope-consistent Costing Readiness

- Costing Readiness follows the shared report hierarchy: severity and module filters, scoped preview-first module ranking, then the complete issue detail.
- The insight total and severity breakdown are derived from the same severity-scoped module population as the ranking; a filtered chart can no longer pair scoped bars with global totals.
- The readiness badge is explicitly labeled Overall because it remains the global data-readiness judgement, while the adjacent counts and ranking describe the selected severity scope.

## v8.36.78 — Filter-first Recipe Costing Insights

- Recipe Costing now follows one report hierarchy: scope filters, preview-first confidence and cost rankings, then the complete desktop table and phone list.
- Rankings live inside the same workspace and contextual-rail boundary as their defining filters, so a filtered cost view no longer appears visually detached from its scope.
- The page source is decompressed into maintainable semantic sections without changing cost authority, confidence rules, empty states, recipe links, or read-only behavior.

## v8.36.77 — Filter-first Product Margin Insights

- Product Margin keeps its filter scope, preview-first readiness distribution, margin ranking, and complete detail list inside one report workspace.
- Filters precede the derived charts, matching the established Demand Trend hierarchy and preventing a filtered ranking from appearing visually detached from the controls that define it.
- The ranking no longer spans outside the standard content and contextual-rail boundary; mobile and wide layouts now inherit one consistent workspace width and spacing contract.

## v8.36.76 — Mobile-first Outlet Completion

- Outlet Daily Records presents completion insight as a compact phone summary before the dense seven-day matrix, keeping complete, in-progress, and missing outlet-days visible without dropping users into a spreadsheet-like surface.
- The phone matrix is available through one explicit, accessible disclosure and remains fully visible by default from tablet upward; its exact preview and record links are unchanged.
- A primary filter moved into the shared mobile drawer is no longer represented by an empty layout node. Outlet Daily therefore exposes one complete Filter action and record count with no clipped date-control remnant.

## v8.36.75 — Complete Staff Directory Reads

- The Staff directory treats roles, role assignments, branch assignments, and branch names as one identity-read boundary rather than optional decoration.
- Any failed relationship read now enters the existing page error boundary instead of presenting a real staff member with a misleading blank role or default branch.
- A source contract guards all four auxiliary query errors so future directory changes cannot silently regress to incomplete-success rendering.

## v8.36.74 — Trustworthy Global Navigation

- Global navigation remains a stable information architecture, not a second live reporting surface; queue authority stays in bounded workspaces and the Dashboard.
- The retired ten-query sidebar count path and its dormant badge plumbing are removed so a read failure cannot be reintroduced as a misleading zero badge.
- Navigation rendering no longer carries unused count state, while permission, grouping, attention metadata, and role-specific destinations remain unchanged.

## v8.36.73 — Keyboard-Safe Mobile Filters

- Every shared mobile Filter trigger now identifies its dialog relationship and reports whether the filter sheet is expanded.
- Opening the filter sheet moves focus into the modal; Tab and Shift+Tab remain inside its available controls, while Escape closes it conventionally.
- Closing by Escape, backdrop, or the close control restores focus to the originating Filter trigger so keyboard users retain their place in the list workflow.

## v8.36.72 — Accessible Loading Motion

- Continuous skeleton and spinner motion honors the operating system's reduced-motion preference through one global contract; loading feedback never depends on animation alone.
- AP Aging and Cash Flow Forecast skeletons expose a named, atomic polite status while their report data is busy, matching the shared workspace loading behavior.
- Motion and finance-loading semantics are source-contract tested so a future page-specific skeleton cannot silently remove the accessibility guarantees.

## v8.36.71 — Contained Outlet Daily Mobile Matrix

- Outlet Daily Records keeps its seven-day completion matrix inside the phone viewport; all seven days fit without moving the page or hiding the outlet context.
- Horizontal matrix navigation is reserved for wider workspaces, where pinned outlet labels remain useful and the scrollport is independently contained.
- The phone query surface uses one complete Filter trigger: date, branch, and status live together in the filter drawer instead of rendering a clipped date field beside the action.

## v8.36.70 — Verified Semantic Contrast

- Semantic status foreground/background pairs are numerically guarded at WCAG AA 4.5:1 or better rather than accepted by visual inspection alone.
- Procurement Variance's 10px stage labels use the verified muted-text token instead of the decorative soft-text token that measured only 3.13:1 on white.
- The desktop sidebar release footer moves from 3.78:1 translucent white to a clearly readable 6.92:1 while preserving the existing hierarchy.

## v8.36.69 — Truthful Local Error Boundaries

- Document and procurement detail boundaries distinguish a confirmed missing-record signal from a failed read; infrastructure failures are never described as deletion or access loss.
- Retryable detail failures expose Retry, a safe collection escape, and an opaque support reference through one shared component with touch-safe actions.
- Production, finance-report, and authentication boundaries now pair retry with a contextual escape path and preserve the same phone touch contract.

## v8.36.68 — Recoverable System Errors

- Root, workspace, and application-shell error boundaries expose a semantic page heading, alert region, safe retry path, and Dashboard escape instead of leaving users on a dead-end error screen.
- Recovery controls keep at least a 44px touch target with visible keyboard focus; workspace buttons may return to compact desktop height only at the wide-shell breakpoint.
- Opaque error references remain visible for support without exposing the underlying exception, and the root global fallback stays self-contained when the design system itself cannot load.

## v8.36.67 — Readable Reports Directory

- Every Reports directory entry is one full-width, touch-friendly navigation target rather than a narrow repeated Open button.
- Report titles and purpose descriptions remain readable on phones instead of being truncated before users can judge which report they need.
- Each row exposes a report-specific accessible name and a conventional trailing direction cue without adding nested card layers.

## v8.36.66 — Trustworthy Production Report Failures

- Production Planning and Production Variance isolate report-query failures inside their own page context instead of falling through to the generic application error boundary.
- Failed reads are logged through the redacting server logger and render an explicit retry action; they are never presented as zero suggestions, balanced variance, or a successful empty report.
- Unavailable states repeat the read-only boundary so users know no production or inventory records were changed.

## v8.36.65 — Contained Outlet Daily Mobile Workspace

- Outlet Daily Records keeps the 7-day completion matrix inside its own horizontal scrollport, so dragging dates cannot move or widen the page.
- The phone date/filter/result row retains its full card width after matrix interaction instead of collapsing the date picker to a sliver.
- The page workspace clips accidental document-level horizontal overflow while preserving the matrix's intentional local swipe interaction.

## v8.36.64 — Resilient Demand Reporting

- Demand Trend Lite now records report failures through the redacting server logger and preserves the report shell with an explicit retryable unavailable state.
- An incomplete demand-trend source is never rendered as zero coverage, an empty chart, or a trustworthy empty result.
- Reports summary now distinguishes reports visible to the current role from catalogue entries hidden by access, replacing the duplicate `Available` / `Total Listed` counters.

## v8.36.63 — Truthful Workspace Updates

- Workspace Updates now distinguishes a verified empty pending-action or notification queue from a source that could not be read or validated.
- Document approvals, workflow actions, production permissions and queues, notification scope, recipients, and linked-record validation expose one combined availability contract with redacted server observability.
- An unavailable source renders a compact warning instead of `No pending actions` or `No new notifications`.
- The top bar no longer claims `No recent activity` without loading the activity feed; it provides a direct `Open full activity log` entry instead.
- Outlet Daily Records no longer lets the legacy date-first width rule constrain the entire unified phone row; its date, Filter action, and result count now retain the same stable geometry as other operational lists.

## v8.36.62 — Readable Mobile Filter Summary

- Date-first mobile filters now render an explicit `Any date` or formatted selected date above the native date picker, avoiding browser-dependent blank controls.
- The native date input remains the full accessible interaction target, with a shared visible focus treatment around the rendered date control.
- Result count stays beside the date and Filter controls on phones instead of creating a sparse second row.

## v8.36.61 — Trustworthy Invoice Detail Reads

- Supplier Invoice detail now settles document activity, draft GRN sources, and AP Aging independently, with redacted logs and explicit unavailable states.
- An unverified attachment state disables Finance approval instead of incorrectly asking for another attachment; the warning remains visible on phone and wider workspaces.
- A failed draft-source read preserves the authoritative invoice summary and matching lines in read-only mode, while suppressing save actions that require a complete eligible-GRN catalogue.
- AP Aging failure is shown as unavailable rather than silently removing payment attention; the invoice balance remains the payment authority.
- Costing Readiness, Procurement Variance, Product Margin, Recipe Costing, and Master Data Cleanup retain their existing unavailable UI while now recording redacted failure context.

## v8.36.60 — Trustworthy PR Detail Reads

- Purchase Request detail now settles linked orders, item labels, supplier labels, supplier routes, branch labels, document activity, and deletion preview independently, with redacted logs for every failed source.
- Draft editing is available only when the complete item, supplier-route, and branch directories are present; otherwise the authoritative request lines remain visible in an explicit read-only state.
- Missing label directories render unavailable references instead of false `No supplier suggested`, missing branch, or raw-ID-as-name states.
- Linked PO and document activity panels distinguish successful empty results from unavailable reads, including a phone-visible activity warning.

## v8.36.59 — Resilient PO Export Directory

- Purchase Orders now isolates the branch directory used only by workbook export from the primary paginated order queue and PO summary.
- A failed export-directory read is logged through the redacting server logger and renders a disabled, explicit `Export unavailable` state while order search, review, navigation, and creation remain usable.
- Export remains permission-gated and cannot open with an incomplete branch catalogue.

## v8.36.58 — Truthful Stock Count Reads

- Stock Counts now preserves independent unavailable states for the paginated queue, summary totals, branch directory, workbook export, and variance insight.
- A failed count queue renders a retry-safe unavailable message without false empty-state copy or pagination; failed branch options disable the selector and export while preserving an existing URL branch scope.
- The base-table list fallback now rejects incomplete branch or line hydration instead of rendering missing branch names or false zero line and variance counts.
- Variance insight failures retain the existing explicit unavailable state and are recorded through the redacting server logger.

## v8.36.57 — Readable Mobile Date Filter

- Date-first mobile list filters now receive their date-control layout inside the phone breakpoint where the shared mobile header actually renders.
- An empty date filter shows the complete `Any date` affordance with its calendar icon instead of collapsing to an unexplained icon-only field.
- The date control, filter trigger, and result count retain a clear toolbar hierarchy without changing tablet or desktop list layouts.

## v8.36.56 — Truthful Secondary Reads

- Production Jobs no longer converts list or branch-directory failures into successful empty pages; its paginated queue, full-summary read, and branch filter now expose independent unavailable states.
- A failed production queue shows an explicit retry-safe unavailable message and suppresses false pagination, while a failed branch directory disables the selector and preserves any existing branch scope.
- Purchase Returns, Stock Transfers, and Stock Wastage isolate their secondary full-list summary reads so a failed aggregate cannot remove the current page or render false zero totals.

## v8.36.55 — Resilient Operational Summaries

- Goods Receiving, Purchase Requests, Purchase Orders, and Recipes now treat their paginated operational queues as primary data and their right-rail summaries as independently settled auxiliary reads.
- Summary failures are redacted in server logs and render a concise `Unavailable` status with queue-specific continuity guidance; they are never surfaced as zero totals or allowed to replace the usable queue.
- Existing filters, pagination, create actions, export actions, and row navigation remain available when only a summary read fails.

## v8.36.54 — Truthful Invoice Filters

- Supplier Invoice supplier-option reads now throw on either invoice or supplier query failure instead of returning a false empty supplier catalogue.
- The invoice queue is the primary authority; AP Summary and supplier-filter options are independently settled, logged through the redacting logger, and rendered as explicit `Unavailable` states.
- A temporarily unavailable supplier selector is disabled with a readable label while any existing URL supplier scope is preserved as a hidden value, preventing a subsequent search from silently widening the result set.

## v8.36.53 — Resilient Outlet Insights

- Outlet Daily Records now treats its operational record list as the primary authority and isolates the optional 7-day completion and 30-day wastage reads with settled promises.
- A failed insight is rendered as `Unavailable` with a retry explanation and a redacted server log; it is never converted into 0%, an empty chart, or a false no-record state.
- Successful empty reads retain their precise empty messages, preserving the Clear, Empty, and Unavailable distinction without removing operational actions.

## v8.36.52 — Readable Mobile Date Filters

- Empty native date controls on phone list filters now expose a persistent `Any date` label and calendar affordance instead of collapsing into an unexplained icon on iOS Safari.
- The shared date control remains a full-width, 44px native picker, becomes controlled after selection, and preserves automatic list submission without changing desktop query surfaces.
- Outlet Daily Records adopts this shared contract, keeping the date, Filter action, and result count understandable as one compact query surface.

## v8.36.51 — Consistent Chart Touch Targets

- Every chart selector, compact tab, status cell, and preview action that changes or opens exact chart context has a 44px minimum target below wide desktop. Wide desktop may use a compact 32–36px target where pointer precision and surrounding density justify it.
- Stock Count variance tabs, Outlet completion cells, Production variance secondary signals, Dashboard comparison Open, Outlet completion Open, and Inventory movement drill-through now follow this shared contract.
- An intentionally horizontal matrix may keep compact 36px cells at `sm` and above, but phone cells remain 44px in both axes. Increasing the target must not remove the pinned identity column or the explicit swipe instruction.
- Production supply signals use semantic danger and warning tokens instead of framework-specific rose and amber utilities. Signal meaning remains driven by the documented thresholds, not by a decorative palette.

## v8.36.50 — Touch-ready Chart Inspection

- A chart dataset must not be available only through a pointer tooltip or a permanently hidden table. If the surrounding page does not already expose the same complete rows, provide a keyboard-operable Daily data disclosure with a phone list and a wide table.
- Outlet wastage now exposes date, received quantity, wastage quantity, and wastage rate to sighted and assistive-technology users. Date links filter Outlet Daily Records to the selected date while retaining the active branch scope.
- Shared interactive ranking rows and Dashboard role-comparison rows use a 44px minimum target on phone and tablet input surfaces, then return to a compact 36px minimum at wide desktop. Hover, touch, focus, preview, and drill-through behavior remain identical.
- Touch target corrections belong in the shared interactive primitive when the same row pattern serves multiple reports. Do not compensate with page-specific padding that lets sibling reports drift.

## v8.36.49 — Responsive Chart Data

- A chart's exact-data disclosure must be responsive independently of the chart. Phone users receive a complete vertical list or definition list; a wide comparison table may remain at `sm` or above when its columns fit without horizontal navigation.
- Inventory daily movement and Stock Count variance no longer force 24–25rem technical tables into phone disclosures. Each daily phone row preserves the date and all three exact measures from the corresponding wide table.
- A date that has an authoritative filtered detail destination is a touch-sized link in both responsive modes. Visual compaction must not remove drill-through, and the phone list and wide table must map from the same source collection.
- Avoid `overflow-x-auto` as the default response to a narrow chart dataset. Horizontal scrolling remains valid only where the horizontal relationship itself is the task, such as an outlet-by-date matrix with a pinned identity column.

## v8.36.48 — Semantic Operational Surfaces

- Ordinary workspace backgrounds, alternating rows, controls, and missing-state cells use the shared surface tokens. Operational components must not hard-code white or a framework gray when the meaning is an ordinary, raised, or muted application surface.
- Dark operational-green states use `--sb-text-inverse` for foreground contrast. Literal white opacity remains valid only for intentional layered content on a known dark background, such as the Dashboard Operational Pulse.
- Stock Count setup, long-entry workspace, toolbar, row striping, quantity editor, and adjusted-only control now share the same semantic surface and border authority. The workflow remains visually coherent across theme variants without changing count behavior.
- Outlet completion missing cells and Stock Count variance view tabs follow the same contract, with regression tests preventing local hard-coded surface colors from returning.

## v8.36.47 — Responsive Import Review

- Import Review retains the editable spreadsheet grid at tablet and desktop widths. Phones use a vertical row editor with every dynamic import header rendered as a visible field label; users never need horizontal table navigation to correct a row.
- Desktop cells and phone fields share the same `rows`, `updateCell`, remove action, and validation-message authority. Supplier resolution, required-field errors, and duplicate-row errors cannot diverge by viewport.
- Server-rejected row-level issues keep the wide audit table and add a complete phone definition list. Every submitted key/value and the server message remain readable without truncating the evidence needed for correction.

## v8.36.46 — Pinned Outlet Completion Context

- The seven-day Outlet completion matrix retains its compact horizontal date comparison, but pins the Outlet column while dates scroll. Users must never lose the row identity needed to interpret status cells on phones or narrow tablets.
- Column and row headers expose explicit table scope. The scroll region references a visible phone instruction, remains keyboard focusable, and uses contained horizontal overscroll without weakening hover, touch, focus, preview, or record-opening behavior.
- Sticky row headers use the ordinary surface and semantic border tokens; the matrix does not invent a floating card, duplicate outlet label, or alternate mobile dataset.

## v8.36.45 — Unified Costing Report Surfaces

- Recipe Costing, Costing Readiness, and Procurement Variance complete the report-family convergence to sibling query and result surfaces. Together with Product Margin, Production Variance, and Master Data Cleanup, all six guarded high-density workspaces use one structural contract.
- Filter overlays remain owned by the shared `FilterBar`; the result card alone owns table/list clipping, dividers, and empty states. A visual flattening selector is not a substitute for correct DOM hierarchy.
- Every result card retains its wide audit table and a complete narrow-workspace OperationalList or decision list, so structural cleanup cannot hide costing confidence, variance context, next actions, or unavailable states.

## v8.36.44 — Separated Report Query Surfaces

- Product Margin, Production Variance, and Master Data Cleanup render query controls and results as sibling surfaces. A filter form must never inherit the border, clipping, or empty-state boundary of the result card.
- The result surface retains the wide technical table and the complete narrow-workspace list. Separating the query surface must not remove decision fields, empty-state guidance, or record links.
- The shared `FilterBar` remains the sole owner of phone drawer and wider inline-filter behavior; report pages do not create a second card around it.

## v8.36.43 — Responsive Branch Selection

- Branches retains the complete technical table at wide desktop and uses a continuous OperationalList below 1280px. The compact row preserves code, name, type, lifecycle status, phone, email, and address.
- Bulk archive/restore remains available in the compact directory. Phone users can select individual branches or all visible branches without opening the record; the existing confirmation and history-preserving server actions remain authoritative.
- Selection is shown only to users with update permission. Create permission alone must not expose a selection control that cannot perform an action.
- Phone selection controls use a 44px label hit target while retaining a compact 16px checkbox mark. Every row checkbox has a branch-specific accessible name and sits outside the row link, avoiding nested interactive controls.

## v8.36.42 — Trusted Operational Pulse

- Dashboard attention total and visible breakdown share one source authority: pending approvals, low stock, stock counts due, wastage requiring review, and overdue payables for permitted roles. Receiving activity and recent-request snapshots are context, not attention-total constituents.
- Pending approvals use an exact RLS-scoped count while retaining only the five oldest records for display. Query failure is unavailable and makes the total unavailable; a bounded display array must never be presented as the complete count.
- Pulse signals use compact, keyboard-visible links with a two-column phone layout and four- or five-column wider layout. An odd final phone signal spans the row rather than leaving an accidental blank cell.
- Owner and Manager do not receive a second comparison chart that repeats the Pulse exception sources. Finance, Kitchen, and Purchasing retain role-specific comparison only where it adds distinct decision context.

## v8.36.41 — Costing Report Rankings

- Product Margin adds filtered-population readiness distribution and a top-five ready-margin comparison. Absolute RM size determines visual rank while the direct label and preview preserve the signed margin; the report remains explicitly non-prescriptive.
- Recipe Costing adds confidence distribution and a top-five usable cost-per-output comparison. Low-confidence rows are excluded from numeric cost ranking and remain explicitly incomplete rather than zero.
- Both surfaces reuse the shared preview-before-open ranking contract: hover, first touch, and keyboard focus reveal exact values without navigation; linked records open only through the persistent Open action.
- Rankings are capped at five records so phone users receive scan value without duplicating the full operational list. The existing table and phone list remain the complete detail authority.

## v8.36.40 — Guided Stock Count Workspace

- The phone Stock Count editor opens with an explicit `Step 1 of 2` orientation band, current Draft status, and the consequence boundary that draft saves do not change stock while posting is final.
- Long desktop count sessions retain a sticky semantic column header beneath the document workflow header. Stronger row separators and restrained zebra striping preserve the relationship between item, variance, and physical quantity without creating nested cards.
- Sticky document headers use a stronger elevation token so workflow status remains visually anchored above scrolling operational content.

## v8.36.39 — Responsive Administration Lists

- Master Data Cleanup, Staffs, and Document Sequences use the same shared OperationalList contract as mature operational directories below 1280px; wide technical tables remain available on desktop.
- Cleanup issue rows retain severity, module, record, issue type, and the exact manual next action. A phone list must not reduce the report to severity and title alone.
- Staff rows retain both staff lifecycle status and authentication state, plus staff code, role, email, and default branch.
- Document sequence rows retain preview number, reset cycle, current period, next cursor, and status. The cursor remains explicitly distinct from an operational record count.

## v8.36.38 — Responsive Inventory Details

- Recipe availability, Stock Transfer, and Stock Wastage details use full audit tables only at wide desktop widths; narrow workspaces retain every decision field in continuous summaries.
- Recipe lines lead with required quantity and preserve current stock, shortage, suggested action, status, and cost. Unknown stock and unavailable shortage calculations remain explicit trust states.
- Transfer lines distinguish requested, physically received, and remaining quantities. Wastage lines preserve reason, batch, expiry, and remarks beside the stock-out quantity.
- A Movement Ledger detail contains exactly one authoritative movement, so it uses a semantic movement summary rather than a six-column single-row table. Direction, quantity, branch, unit cost, and value remain explicit.

## v8.36.37 — Responsive Posted Operations

- Posted Production Job and Stock Count details retain their wide audit tables at desktop widths and use complete reconciliation summaries below 1280px.
- Ingredient consumption leads with actual quantity and line cost, then retains required quantity, available stock, variance, and unit cost. Unknown availability and unrecorded actuals remain explicit trust states rather than zero.
- Production output leads with actual output and line cost while preserving planned quantity and unit cost.
- Posted count lines lead with physical quantity and variance. High variance is compared against the count's saved tolerance and remains visibly exceptional; a missing remark is disclosed instead of implied to be complete.

## v8.36.36 — Responsive Payables Reports

- AP Aging and Cash Flow Forecast retain full financial audit tables only where all columns fit. Phone, tablet, and narrow-laptop layouts use flat decision lists without horizontal table navigation.
- Payable rows lead with outstanding exposure and risk state, then retain supplier reference, due date, original total, amount paid, workflow status, bucket, and alert authority.
- Supplier exposure summaries lead with total outstanding and retain invoice count, overdue exposure, oldest due date, and maximum days overdue. Selecting a row applies the same supplier filter.
- Missing due dates and overdue balances remain explicit exceptions; compact presentation must never turn missing authority into a neutral zero or omit the report's MYR-only limitation.

## v8.36.35 — Responsive Procurement Detail

- Purchase Return and read-only Supplier Invoice details use full audit tables only at widths where every reconciliation column fits. Narrow workspaces use flat line summaries rather than horizontal table navigation or cards nested inside cards.
- Return summaries lead with the quantity and value being returned, then retain received, previously returned, returnable, and unit-cost authority in one scan path.
- Invoice matching summaries lead with this invoice quantity and line total, retain PO/GRN provenance and ordered/received/previously invoiced quantities, and expose quantity or price variance as an exception instead of hiding it.
- Payment history follows the same responsive contract: wide audit table, narrow chronological list, and an explicit empty state.

## v8.36.34 — Responsive Receiving Detail

- Goods Receiving detail uses a desktop audit table only where its ten columns fit. Phone, portrait-tablet, and narrow laptop workspaces use a continuous line summary instead of horizontal table navigation.
- The compact receiving line keeps the decision hierarchy intact: received quantity leads; ordered, previously received, and pending quantities provide reconciliation context; rejection, batch/expiry, unit cost, and stock value remain available without repetition.
- Rejected quantity is shown as an exception and explicitly states that it is excluded from stock. Zero rejection does not consume permanent phone space.
- Responsive verification must prove both modes: the summary below 1280px and the full audit table at a wide desktop breakpoint.

## v8.36.33 — Oriented Stock Count

- A new Stock Count keeps Draft status and workflow position visible on phones. Compactness must not remove the operator's current state or next-stage context.
- Dense count rows stack below item identity until the viewport is wide enough for the full Item / Variance / Count ledger; breakpoint choice must account for the side rail's effect on usable content width.
- Long count sessions expose visible and adjusted totals plus row position. Subtle alternating surfaces and a semantic adjusted state improve scanning without turning each line into a card.
- Document workspace headers use one shared, restrained elevation so sticky context remains visibly separate from scrolling content.
- Dashboard attention leads with a single plain-language exception total, then uses the queue cells as its breakdown. Supporting descriptions collapse on phones to preserve first-screen action density.

## v8.36.32 — Branch-Scoped PR Basket

- A Low Stock purchase-request basket is scoped to exactly one branch. “All branches” is a review state, not an editable procurement scope.
- Changing the basket branch clears unsaved selections and quantities so hidden lines from another branch cannot enter the request.
- On phones, unselected low-stock lines retain current and suggested quantities for the purchasing decision, while the editable request quantity appears only after selection.
- Disabled selection, concise branch guidance, and polite selected-count feedback expose the same constraint before submission instead of failing late.

## v8.36.31 — Flat Invoice Matching

- Supplier Invoice is one form surface. Eligible GRNs are flat internal sections, never `erp-surface` cards nested inside the form surface.
- On phones, an unchecked receiving line exposes only selection and item identity. Invoice quantity, invoice price, receiving references, and variance appear only after selection.
- Selection feedback distinguishes the empty requirement from the selected-line count and announces changes politely to assistive technology.
- A loopback-only, explicit Supplier Invoice fixture may create an idempotent supplier → branch mapping → PO → posted GRN chain for browser evidence. Ordinary local E2E and every remote environment remain unaffected.

## v8.36.30 — Selected Stock Lines Only

- Stock Transfer and Stock Wastage item selection is authoritative: unchecked item IDs must never enter an action payload, even when dormant form values remain mounted.
- Unselected inventory rows show only the checkbox, item identity, code, and UOM. Quantity, availability, reason, batch, and remarks progressively disclose only after selection.
- The item summary states selected and visible counts separately. Search visibility must not change which items are selected.
- Dynamic-detail audits include the actual 820px tablet and 1180px laptop review widths. Coverage reports distinguish populated records from routes whose fixture has no data.

## v8.36.29 — Responsive Audit Reliability

- When Playwright starts the isolated local application, that exact local address is the sole audit target. A stale environment URL must not redirect evidence collection to another dev session or release.
- Interactive-bound checks include every visible or operable control. A headless form mirror may be excluded only when it is explicitly hidden, or both pointer-inert and unfocusable.
- The canonical static-workspace audit covers 69 Owner workspaces at 320px, 820px, and 1180px, including list filters, empty states, report surfaces, and operational entry forms.

## v8.36.28 — Costing Readiness Concentration

- Costing Readiness compares issue concentration across Items, Supplier items, Recipes, and Products using server-owned issue counts. It never converts issue count into financial exposure.
- Global readiness and totals remain unfiltered; the module comparison follows the selected severity while intentionally ignoring the current module so users can compare and switch modules.
- Ranking selection previews severity composition without navigation. The explicit Open action preserves severity and applies the selected module to the existing issue list.
- A zero ranking value renders zero filled width. Minimum visible bar width applies only to positive values; visual marks must never imply that zero is non-zero.

## v8.36.27 — Canonical List Filter Authority

- Shared list query cards have one responsive geometry owner. Retired 9rem, 7rem, and generic 8rem override layers must not be reintroduced around the canonical contract.
- Portrait and compact tablets use one deliberate two-row grammar: the query spans row one; filters and the stable result/action group occupy row two. Controls remain 44px high and labels stay on one line.
- Query and content cards are sibling surfaces. Legacy outer containers are flattened by the shared layer so a filter card cannot appear inside another visual card.
- Opening Select or More filters closes the other desktop overlay; route CSS must not own overlay coexistence.

## v8.36.26 — Exception-First Dashboard Priority

- Dashboard comparison signals use a stable semantic order: critical exceptions, follow-up, activity, then snapshots. Source order resolves ties; count magnitude never invents urgency.
- Zero and unavailable values remain distinct trust states: zero is Clear, while a failed or absent source is Unavailable.
- The secondary Dashboard column is a single ordered layout owner. Exceptions precede routine operational activity, followed by finance obligations and informational alerts.

### Operational relationship ownership

- Central Kitchen to outlet supply routes are managed in Administration > Branches / Outlets, never as frontend constants.
- An outlet has exactly one active Primary Central Kitchen; a Central Kitchen may supply multiple outlets.
- Outlet detail uses one Central Kitchen selector. Central Kitchen detail uses a responsive outlet checklist and identifies assignments owned by another kitchen before transfer.
- Route changes are atomic, permission-checked, tenant-scoped, and auditable. The relationship editor is a sibling work surface, not a card nested inside Identity.

### Dense editable row alignment

- A dense editable list must use the exact same column template, horizontal gutter, and gap for its header and every data row. Inner controls may fill their assigned column but must not introduce a second `max-width` or end-alignment rule that visually detaches them from the column heading.
- Stock Count uses an elastic Item column, a stable Variance column, and a bounded Count column. Quantity stepper and UOM remain inside that Count column at desktop and tablet widths; phone rows may stack the Count control beneath the item context.

## v8.36.25 — Report Preview Drill-through Consistency

- AP Aging buckets, Cash Flow due windows, and Production Variance signals now follow the same preview-before-open contract as ranking charts.
- Chart marks are list/button selection controls with `aria-pressed`; they expose a labeled live preview region and never navigate on first touch.
- The preview owns the equivalent filtered-report URL through one explicit, keyboard-reachable Open action. Escape clears keyboard selection.

## v8.36.24 — Ranking Preview Before Open

- Ranking bars are selection controls, never navigation links. Hover, focus, click, and first touch reveal the same exact preview without leaving the report.
- A linked ranking exposes a separate `Open` action inside the persistent preview. This action carries the authoritative detail URL and remains keyboard reachable after row selection.
- Ranking semantics use a real list of buttons plus a labeled live preview region; Escape clears keyboard selection.

## v8.36.23 — Shared Surface Style Authority

- Shared work and command surfaces now have one design-layer-scoped visual owner.
- Removed late, high-specificity command-surface overrides and duplicate base surface declarations.
- Added a regression contract that prevents unscoped or `!important` command-surface ownership from returning.

## v8.36.22 — Responsive Detail Parity

- A default `Table mobileHidden` appears at `xl`; every hand-written compact replacement for that table must therefore remain visible through `xl:hidden`. Hiding the replacement at `md` or `lg` creates an unsupported tablet interval and is a release blocker.
- Purchase Request detail, Purchase Order detail, Roles, and Production Variance now preserve their complete detail authority at phone and tablet widths, then switch once to the technical table at desktop width.
- A repository contract scans application TSX for this mismatched manual-list pattern. Shared `OperationalList` remains the preferred implementation because it already owns the matching breakpoint.

## v8.36.21 — Role-Aware Dashboard Signals

- Each non-outlet Dashboard role receives exactly one compact comparison built only from bounded counters already loaded for that role. Outlet Staff retains its single completion task and receives no executive KPI chart.
- Bars compare counts of records or items only. They never mix currency, quantity, percentage, or truncated recent-list length; a failed source remains Unavailable rather than becoming zero.
- Hover, focus, and touch select the same exact preview. Drill-through is a separate explicit Open action so the first touch does not navigate unexpectedly. The snapshot is labeled request-time because no source-owned refresh timestamp exists.

## v8.36.20 — Production Variance Signal Distribution

- Production variance uses a zero-baseline diverging comparison of under- and over-supply product-outlet row counts. Bar length never compares received, movement, leftover, or wastage quantities across unlike products or UOMs.
- The visual reuses the established conservative signal formula and the current period, outlet, and product scope. Selecting a direction opens that exact signal filter; Balanced and Review manually remain explicit states.
- Hover, touch, and keyboard focus expose the same count and definition. The existing table and phone list remain the numeric detail authority, and the surface continues to state that it does not compare posted production output.

## v8.36.19 — Stock Count Variance Insight

- Stock Count variance insight uses posted lines from the last 30 Kuala Lumpur calendar dates and each count's saved `tolerance_percent`. The list fallback, detail, trend, and rankings must share that same above-tolerance definition.
- Daily and ranked views count high-variance occurrences by shortage/overage direction. They never sum `variance_qty` across items or unlike UOMs. Item preview may show the latest signed quantity only with its source UOM and Stock Count.
- Daily Trend, Repeat Items, and Branches share one compact tabbed surface. Hover, touch, and keyboard focus expose exact values; ranking rows and daily data link to the equivalent Stock Count authority. RPC failure is unavailable, never a valid zero.

## v8.36.18 — Outlet Completion Matrix

- Outlet Daily Records shows a bounded seven-day outlet-by-day completion matrix using record headers only. It reuses the existing Outlet Daily permission and branch scope and does not read product lines for completion state.
- Missing, Draft, Morning Recorded, Evening Completed, Reviewed, and Void remain authoritative distinct states. The UI may group Draft and Morning Recorded as “In progress,” but it must not infer lateness without an approved deadline source.
- Hover, touch, and keyboard focus expose the same outlet-day preview. Existing records open through the persistent preview action; the compact matrix may scroll internally on narrow screens but must not cause document-level horizontal overflow.

## v8.36.17 — Inventory Daily Movement Insight

- Inventory shows one bounded daily comparison of posted inbound and outbound ledger-entry counts for 7 days, 30 days, or the current month. It reads `inventory_daily_summary` through a maximum-31-row RPC and never scans the raw ledger from the page.
- Quantities from different item UOMs are never added together. The chart and preview consistently say “entries,” preserve zero days, and use the Kuala Lumpur report date.
- Hover, touch, and left/right keyboard navigation expose the same date-level values. Each selected date drills to the equivalent inbound or outbound Movement Ledger filter, and an expandable numeric table remains the complete accessible alternative.
- The activity period is controlled once and also scopes the existing production-usage and purchased-item summaries; adjacent cards do not repeat the same filter.

## v8.36.16 — Procurement Variance Insight Layer

- Procurement Variance answers two decisions before the detail table: where review work is concentrated and which linked price differences are largest.
- Status distribution uses the current filtered line population. Price ranking uses the absolute RM difference only for ordering while preserving the signed amount and percentage in the direct label and preview.
- Hover, touch, and keyboard focus expose the same source-document context. Existing technical table and phone comparison rows remain the accessible/detail authority; charts never infer unlinked records or mutate procurement data.

## v8.36.15 — Unified Tablet Filter Surfaces

- Search-first list workspaces use one tablet grammar: the query spans row one; compact filters remain left-aligned on row two; result count and Search/Reset remain a stable right-aligned group.
- The query surface and record surface are siblings. A tablet main-list wrapper must not add another border, background, radius, or shadow around them.
- Opening a Select filter closes More filters; opening More filters closes any Select popover. Only one filter overlay may remain visible.
- Purchase Requests, Goods Receiving, Stock Counts, Stock Card, and Outlet Daily Records are the reference comparison set for filter alignment and surface nesting.

## v8.37.0 - Browser-Native Mobile Canvas

- Phone and tablet routes use document-level scrolling so Safari and Chromium can collapse their browser chrome naturally. A fixed `100dvh` shell with the page trapped inside an `overflow-y-auto` main region is desktop-only.
- The ordinary browser experience must already fill the available canvas and respect `viewport-fit=cover`, the top safe area, and the bottom navigation/action safe area. Installing the OMS is an optional enhancement, never a prerequisite for a usable full-height mobile workspace.
- Desktop at `>=1280px` retains the fixed-height three-region workbench and its independently scrolling central canvas/right console.
- A full-screen sheet or takeover is reserved for focused selection, filtering, or inspection. It must not be used merely to hide weak page composition.
- Movement Ledger and comparable history routes must query a bounded server page. They may not read an entire ledger view and paginate or aggregate it in application memory.

## v8.35.0 - Compact Document Context Closure

- New document headers do not repeat `New [document]` inside the content area; the shared top bar/breadcrumb owns the route title while the document header prioritizes status, branch scope, and workflow context.
- Phone workflow context is a small inline disclosure with a subtle divider, not a full-width nested card. The complete step list remains available through the Workflow sheet.
- Goods Receiving's no-selection state shares one continuous setup surface with its empty state; it must not render a second floating card before a purchase order is selected.

## v8.34.0 - Migration Version Collision Repair

- Supabase migration filenames must have unique numeric versions. A duplicate numeric prefix is a release blocker because `schema_migrations` rejects the later migration and leaves subsequent database changes unapplied.
- When a duplicate is discovered after earlier migrations have already applied, renumber only the unapplied migration to a new forward-only version; never rewrite an already-applied migration.

## v8.33.0 - Compact Mobile Workflow Disclosure

- The shared phone workflow context is an inline-width disclosure, not a full-width banner. Its Step/Workflow trigger stays compact, centered, and bounded by the content width while the full step list remains available in the modal sheet.
- The disclosure keeps status/branch context as the primary header hierarchy and must not add a second tall card or force a document page to scroll just to reach the first field.

## v8.32.0 - Honest Stock Count Removal States

- An unposted Stock Count remains removable when the actor has `stock_count.update` or `stock_count.cancel`; the UI must not imply that it is immutable.
- If removal is unavailable only because of permissions, explain the permission boundary. Reserve the immutable warning for counts that have actually posted to the ledger.

## v8.31.0 - Stock Count Mobile Editing Closure

- Stock Count autosave waits 12 seconds after the latest edit before writing a draft; local recovery remains immediate and visibility/online transitions still flush safely.
- Mobile quantity steppers use a compact 36px control while desktop keeps the 40px control; labels and keyboard focus remain explicit.

## v8.30.0 - Deliberate Mobile Row Opening

- Mobile operational list rows use a deliberate double tap to open a record, reducing accidental navigation while users scroll through dense data.
- Keyboard users retain single-action Enter/Space activation, and explicit action links/buttons inside a row are never intercepted by the row gesture.

## v8.29.0 - Continuous Goods Receiving Surface

- Goods Receiving setup and its no-selection state must read as one continuous surface on phone, tablet, and desktop; do not leave a second floating card separated by a vertical gap when the user has not selected a PO.
- The selected-PO receiving lines remain a separate working surface because they contain the editable operational grid and its own heading.

## v8.28.0 - Current Stock Count Workflow Summary

- Stock Count uses one current workflow: Draft → Confirm & Post. The list summary must show Total, Draft, Posted, and Cancelled; it must not present the retired approval-chain label `In review` as a live state.
- Legacy submitted/reviewed/approved rows remain readable and are counted under Draft for operational triage, but they are not promoted into filters or new workflow actions.

## v8.27.0 - Bounded Autosave Recovery

- Stock Count autosave writes the local recovery snapshot immediately, then waits for the deliberate idle window before sending a server write.
- Retryable server failures are retried at most three times per edit revision. After that, the form stops retrying and keeps the local snapshot for manual Save draft recovery.
- A successful save resets the retry budget; a new edit revision gets its own bounded retry budget.

## v8.26.0 - Unposted Deletion Policy

- Every operational document must offer one clear destructive exit while it is still unposted: `Delete draft` / `Delete unposted …`.
- Delete and cancel are soft-removal operations for unposted work: the row, document, and activity history remain auditable, while `deleted_at` removes it from active queues.
- Posted or ledger-impacting records remain immutable and must use a correction/return workflow.
- Stock Count cancellation is reasserted by migration 124 so older deployments cannot resurrect cancelled autosave drafts in active lists.

## v8.25.0 - Local Visual Audit Environment

- Local multi-viewport audits may load a user-provided environment file through `TEST_ENV_FILE`; credentials stay outside the worktree and are never copied into source control.
- A visual audit is only considered passed when the authenticated fixture initializes successfully. Skipped tests caused by missing local data are reported as unverified, not as passing.

## v8.24.0 - Dashboard Hierarchy Closure

- Dashboard panels reuse the flat shared surface and compact heading scale; KPI icons are square interior tiles, not status pills.
- Dashboard action hierarchy stays readable across phone, tablet, and desktop without oversized page titles or decorative panel shadows.

## v8.23.0 - Shared Shell Elevation Cue

- Persistent mobile action bars and create FABs may use a restrained directional shadow so users can distinguish fixed controls from scrolling content.
- Shared rails and workspace surfaces remain neutral and flat: no decorative gradients, oversized radii, or blur overlays. Interior controls stay at the 2px compact radius.

## v8.22.0 - Unposted Purchase Request Removal

- Purchase Requests may be removed from active work while they are still unposted: Draft, Manager Review, Purchasing Review, Finance Review, and Ready to Convert.
- The action is a single `Delete unposted request` control. It soft-deletes the active row, marks the linked document cancelled, and records the original workflow state in activity history.
- Posted or converted records remain immutable because they may have supplier, stock, or accounting impact. Their correction path is cancellation/return/correction, not physical deletion.

## v8.21.0 - Unposted Removal Route Guard

- Removing an unposted operational record accepts either its edit permission or its cancellation permission. Users must not be trapped by an autosave-created draft merely because their role can cancel but not edit it.
- Posted or ledger-impacting records remain immutable; deletion preserves the audit boundary and must route users to a correction workflow instead.
- Once an unposted record is removed from active work, its operational detail route must no longer reopen it from a stale URL; history remains available through the audit/activity surfaces.

## v8.20.0 - Unposted Delete Permission Alignment

## v8.19.0 - Deliberate Stock Count Autosave Window

- Stock Count server autosave waits for **6 seconds of idle time** after an edit. The local recovery snapshot still writes immediately, so a longer server debounce reduces disruptive draft writes without sacrificing recoverability after refresh, logout, or network interruption.

## v8.18.0 - Compact Stock Count Steppers

- Stock Count phone quantity steppers use a compact 40px control geometry so the item title, code, variance, and quantity remain visible together. The buttons retain explicit accessible labels and keyboard focus treatment; this is a compact control adjustment, not a removal of the quantity affordance.

## v8.17.0 - Search-First Filter Ordering

- On phone filter rows, Search follows the useful dropdown controls and the result summary comes last. A multi-filter row must never read as search + Search while its filters wrap invisibly below; compact one-filter rows retain their intentional inline arrangement.

## v8.15.1 - Global Unposted Deletion Contract

- Every operational document detail must expose one explicit Delete draft/Delete unposted action before posting. The action may call an audited cancellation RPC, but it must set `deleted_at`, preserve the audit trail, release eligible reservations, and remove the row from active work.
- Posted or ledger-impacting records remain immutable; their destructive affordance must explain the boundary and point to correction.

## v8.15.0 - Direct Draft Deletion

- Stock Count drafts expose the dedicated audited **Delete draft** action directly. They do not route the user's discard intent through a visible Cancel action, so an autosave-created draft can be removed immediately and cannot remain as active work after redirect.
- Posted counts remain immutable and retain their audit history. The delete control explains the ledger boundary instead of acting as a dead end.

## v8.11.0 — Unposted Cancellation Consistency (superseded by v8.13.0 wording)

- **One destructive exit for unposted work:** Goods Receiving, Purchase Return, Production Job, Stock Transfer, Stock Wastage, Purchase Request, Purchase Order, and Stock Count drafts/unposted records use an explicit `Delete draft` or `Delete unposted …` action. The action performs the permission-aware atomic transition, releases any applicable reservation, sets `deleted_at`, keeps the audit/document history, and returns to the module list.
- The underlying transition may still use a cancellation status for audit semantics, but the UI must describe the user's intent: removing unposted work. Posted, received, completed, or ledger-impacting records remain protected and explain the correction path instead.
- **Cancellation must not leave active work:** a cancelled unposted record may remain in audit/history tables, but it must not remain in active list queries or reopen in an autosave editor after redirect.

## v8.12.0 — Deliberate Stock Count Autosave

- Stock Count writes wait for **6 seconds of idle time** after an edit, so rapid physical entry does not create a draft on every small interaction. The local recovery snapshot is written immediately and remains the source of truth while the server save is pending or retrying.

## v8.10.0 — Remove Unposted Procurement Work

- **Global cancellation rule:** Draft/unposted Purchase Requests and Purchase Orders expose one clear destructive exit: **Delete draft/Delete unposted order**. The atomic cancel RPC runs the existing state/permission workflow, removes the record from active work with `deleted_at`, and preserves the document/activity audit trail.
- **External commitment boundary:** Sent, partially received, received, converted, and posted records remain visible and auditable; cancellation never erases supplier or ledger history.

## v8.09.0 — Clarify Draft Count Removal

- Stock Count drafts expose one destructive exit: **Delete draft**. It soft-deletes the unposted count, retains the document/activity audit trail, and returns to the list so autosave cannot resurrect it.
- Posted counts remain immutable. Their delete affordance explains the audit boundary and offers correction guidance instead of a dead-end action.

## v8.08.0 — Remove Unposted Work Safely

- **Unposted work deletion rule:** Draft/unposted Goods Receivings, Purchase Returns, Production Jobs, Stock Transfers, Stock Wastage, and Stock Counts may be deleted by the existing cancel permission. The action is transactional: release any reservation, retain document/activity history, set `deleted_at`, and remove the record from active work lists.
- **Posted record protection:** Records that have posted ledger movements remain immutable. They show a clear correction/return workflow instead of a misleading delete action.
- **After deletion:** Redirect to the module list so autosave/editor state cannot resurrect a cancelled record.

## v8.07.0 — Compact Dashboard Action Labels

- Stock Counts remain deletable while unposted; posted counts remain the immutable audit boundary.
- Cancelling a draft immediately returns the user to the Stock Counts list so the autosave editor cannot remain mounted and recreate stale work.
- Cancellation soft-deletes the unposted count from active work while retaining the document activity log; posted inventory history is never deleted.
- Dashboard payables actions use an explicitly compact label scale so secondary links do not compete with the metric hierarchy.

## Viewport contract

Design mobile first. The base class or CSS rule must be the 320px-639px experience. Enhancement uses the shared Tailwind thresholds only:

- `640px`: large phone / compact tablet; remains a single-column, touch-first experience.
- `768px`: tablet; the active task keeps the full workspace width. Tablet portrait and landscape use the same components as phone and desktop, with layout density and column placement changing only at this shared breakpoint.
- `1024px`: laptop desktop; dense line-entry layouts may expand, but a persistent inspection rail still remains hidden.
- `1280px`: full desktop; left navigation, main workspace, and optional right inspection rail may coexist.

Do not introduce a page-specific breakpoint. These thresholds serve distinct operational contexts, so a 1024px laptop is not forced into a cramped tablet layout and a full three-rail workspace is not shown prematurely. Test representative widths at 320, 390, 640, 768, 1024, 1280, 1440, and 2560px.

## Layout contract

- Use `min-w-0` on children of flex/grid layouts that contain text, controls, or tables.
- Use grid fractions, `minmax(0, 1fr)`, flex growth, percentages, or viewport-constrained `min()`/`max()` values for page structure. Do not give a page, panel, or content column a fixed pixel width.
- A dense desktop grid must collapse to one column by default; add the second/third column only at the semantic breakpoints.
- Tables must sit inside `.sb-table-region` or a local `overflow-x-auto` container. The document itself must never become horizontally scrollable.
- Technical tables pin their first semantic identity column by default (item, product, document title, record name, or document number) so horizontal scrolling never loses the current record. When selection and row action are present, the full left lead band is pinned in this order: checkbox, action, semantic identity/title. Header and body must use the same band; checkbox and action may never scroll away independently. The shared Action column is a compact 2.5rem icon track with a screen-reader label instead of visible heading text; its row control stays optically centered and retains a 44px tablet touch target. Each pinned lead cell has an explicit shared width, and every following sticky offset equals the total width before it—sticky columns may never overlap or crop one another after horizontal scrolling. Internal lead-band cells have no divider or shadow. The trailing edge of the full fixed band gains one visible directional shadow only after horizontal scrolling begins; at scroll origin it stays flat. This stateful cue makes the fixed/scrollable boundary obvious without permanently elevating the table. Tables without selection/action still pin their semantic identity.
- Status is one compact dropdown in the shared filter bar, never a floating or standalone row. On tablet and desktop, keep the practical order `[search] [relevant dropdowns] [More filters when needed] [Search] … [result total]`; only render dropdowns that represent a real independent filter. The 768–1279px filter row stays on one line by allowing the search field to shrink before wrapping controls. On phone the search and Search button form the first row; relevant dropdowns/More filters form the compact second row, and the result total remains last. A page must not duplicate the same status choice.
- A list page with a permitted creation action must expose that action at every responsive breakpoint. On phone and tablet (including 768–1279px), use the shared bottom-safe circular plus action when the desktop action rail is not visible. The circle contains only the plus icon; its accessible name and tooltip carry labels such as `New PR`, `New GRN`, or `New branch`. It must be `fixed` above `--sb-mobile-nav-height` plus the safe area and must never be hidden between phone and desktop layouts.
- An icon-only create action must not leave an empty page-action strip behind. At `>=1280px`, render the labelled action once in the desktop action rail; below that breakpoint render only the shared circular plus FAB. A create-capable list must provide that desktop rail rather than duplicating the create action in the page header. Never combine a circular outline with visible `New …` microcopy. The shared app shell must reserve the FAB's lower scroll corridor so list tails and pagination remain reachable and are never covered by the fixed circle.
- A mobile primary action is fixed above the safe area, with enough document bottom padding that the last editable control remains reachable. Its border is neutral; it must not visually imply a completed workflow state.
- On phone, any page that owns a persistent Save or More action bar also owns the bottom action area: hide the global bottom navigation, anchor the task action bar directly to the safe area, and expose a 48px back button in the left top-bar slot. Dashboard/Home is the only route allowed to omit that back affordance. This prevents competing fixed controls, accidental navigation during edits, and ambiguity over which bar sits on top.
- A form or document that needs persistent context/actions must use the `/staffs/new` tablet pattern through the shared document split: from 768px portrait upward, keep the main task at left and a 16rem contextual action rail at right; phone collapses the same actions into the bottom action surface, while desktop keeps the standard right console. Do not hide the rail until 1024px.
- Record lifecycle state is not an ordinary editable form field. Creation uses the domain default; deactivate, archive, restore, post, reject, or cancel belong to explicit permission-aware action controls. A form must preserve the existing state as a hidden value when updating, never offer a competing status dropdown beside lifecycle actions.
- Bulk selection bars show a real permitted operation, not only `Deselect all`. The action must accept bounded validated IDs, re-check tenant scope and permission on the server, preserve audit history, and use concise 11–12px selection copy. If no safe bulk server action exists, selection checkboxes must not be exposed. Removing selection also changes the pinned lead band from `checkbox + Action + row identity` to `Action + row identity`; never leave an invisible or non-operational selection column occupying the fixed band.
- Full-width forms use `w-full min-w-0 max-w-full`. A form control may have a minimum touch target (for example quantity entry) but the surrounding layout must still shrink safely.
- Form sections that contain file inputs, long sample values, or native selects must also set `min-w-0` on the containing grid/flex items; native file controls must never widen their parent on narrow screens.

## Design language

The OMS uses one continuous high-density ledger language across phone, tablet, and desktop. Responsive layout changes information density and placement; it must not change semantic color meaning or interaction vocabulary. Current geometry, elevation, and density tokens are defined by `docs/DESIGN_SYSTEM.md`; older square-surface rules below are historical defaults, not authority for new work.

- **Screen-edge surfaces:** full-width mobile rows, workspace cards, list containers, and primary content sections use `rounded-none` so their borders align into one uninterrupted vertical rail.
- **Interior controls:** textboxes, numeric steppers, selects, buttons, filters, and row actions use only `rounded-sm` (`2px`) or `rounded` (`4px`). The default compact control radius is `2px`; use `4px` only when a control needs a slightly clearer hit area.
- **Panels and cards:** standard operational panels remain square (`rounded-none`) unless an existing component explicitly requires a small `2px` or `4px` interior treatment. `rounded-xl` and `rounded-2xl` are prohibited for product UI.
- **Pills:** use `rounded-full` only for statuses, numeric counts, and compact semantic badges. Ordinary controls, rows, panels, and containers must never become pills.
- **Whitespace and alignment:** use token-based padding and vertical rhythm for breathing room without softening the edge language. Keep headers and KPI summaries optically centered when the hierarchy permits it; keep dense tables left-aligned for scanability.
- **Borders and elevation:** use crisp 1px neutral borders and low-contrast horizontal separators (`border-slate-100`). Persistent panels do not use decorative shadows; transient overlays may use a restrained shadow only when it clarifies layering.

### Semantic color tiers

Color communicates workflow state, not decoration. All semantic text/background pairs must pass WCAG AA contrast: at least 4.5:1 for normal text and 3:1 for large text or UI boundaries.

- **Deep operational green:** primary actions, selected navigation, active workflow, keyboard focus, and normal/safe states.
- **Semantic red / crimson:** warning, danger, critical, destructive, rejected, or blocking states. Use it for low stock, pending approvals, overdue AP, out of stock, production exceptions, rejected statuses, validation failures, and destructive confirmations.
- **Neutral:** white surfaces, glare-free neutral canvas, neutral borders, and muted text. Blue, purple, teal, and amber must not be used as decorative workspace themes.

Never use red for ordinary emphasis. A semantic red state must appear with a text label, icon, or explicit status—not by color alone.

## Cross-platform workspace system

The OMS is one operational product, not three independently designed sites. Phone may reorganize a workflow for reachability, but tablet and desktop must retain the same data hierarchy, state language, components, and action priority.

- **Phone (`<768px`)** is a focused single-task canvas with a role-aware bottom bar and the same razor-sharp edge language as tablet and desktop: full-width surfaces are square, and interior controls use `2px` or `4px` corners.
- **Tablet (`768px-1279px`)** is an iPad operational workspace. It uses the same role-aware bottom navigation component as phone, with four or five centered shortcuts and `More`; it does not use a persistent desktop side rail. The bar remains sticky in portrait and landscape, and every page reserves safe bottom space for it.
- Tablet primary actions are visible in the page action row or in the sticky task action area. They must not be hidden behind `Actions & context`. Context panels are secondary metadata, audit, and low-frequency actions only.
- `Actions & context` on tablet is a true drawer or sheet with an explicit backdrop and focus/scroll handling. It must never be an absolutely positioned child that overlaps table rows, status cells, or pagination.
- A form or document that needs persistent actions uses the shared tablet split from `768px`: the editable or review surface remains primary, while a compact 16rem contextual action rail remains visible on the right. `/staffs/new` is the canonical implementation and visual baseline; Company, Backup, Import, Product, Purchase Order, Production Job, and comparable forms must reuse `RecordWorkspace`, `DocumentWorkspace`, or `WorkspaceGrid documentMode + tabletRailMode="split"`. Data-heavy list pages may opt into the same rail at `1024px` so portrait tablet retains a readable table; this is an explicit shared breakpoint option, never page-local CSS. Phone collapses persistent actions into the bottom task action surface. Generic dashboard cards do not opt into this split.
- **Desktop (`>=1280px`)** is a three-region operational shell: persistent navigation, a flexible central workspace, and an optional 340px inspection/action rail. A record page uses its central width for the data form or ledger; the rail is for next actions, state, audit, and related context, never a duplicate copy of the main form.
- Context rails use flat divider groups for branch, supplier, and item drill-down. Do not nest rounded cards inside a rail section; hierarchy comes from section labels, spacing, and 1px separators.
- Phone, tablet, and desktop use the same square full-width surfaces and `2px`/`4px` interior control radii for panels, controls, menus, table containers, action rows, and icon tiles. Pills are reserved for statuses, counts, and compact semantic badges.
- The shared shell owns navigation, page spacing, rails, filter placement, and viewport behavior. Feature pages must compose those primitives rather than recreate their own page chrome.
- A retired route is deleted, not retained as a compatibility redirect. Remove its page file, permission exception, navigation/title metadata, action return paths, static/E2E audit inventories, and progress-tracker row in the same release. System-controlled read-only directories such as Roles expose only their collection route; create and dynamic edit routes must not exist.
- v7.76.0 confirms the legacy Settings, Settings › Backups, Quick Tools, Data Onboarding, and Daily Operations surfaces are retired at runtime. They must remain absent from route files, navigation metadata, permission allowlists, action redirects, and new tracking rows; historical audit documents may mention them only as archived decisions.
- A desktop or tablet action must never be duplicated in the page header, empty state, fixed bar, and inspection rail. One primary action is visible at a time; contextual alternatives remain secondary.
- The shared Top Bar owns the single canonical breadcrumb trail on tablet and desktop. `DocumentWorkspace` retains supplied breadcrumb metadata for route semantics, but does not render a second in-content breadcrumb trail. New documents show status, branch scope, and workflow only; they never repeat “New [document]” or the parent workspace title.
- On tablet and desktop, the compact workflow pipeline itself is the canonical visible document status. Do not add a second standalone status badge above it; keep that compact badge for the phone context row only.
- Workflow steps occupy equal grid tracks. Connectors run behind the labels from one track center to the next, so a two-step `Draft → Posted` pipeline remains optically centered instead of letting the first connector push one label sideways.
- A record form uses one submit source: the shared desktop inspection rail, tablet context disclosure, and phone safe-area action may reference the same form via `form`; it must not retain an additional page-local submit bar.

### Shared component assembly

Every route is assembled from the same primitives. Responsive work may rearrange a primitive, but may not invent a device-specific replacement.

- Every list workspace uses two sibling surfaces at every viewport: a query/filter card and a separate content card. Never nest the content table inside the query card.
- Desktop and tablet query controls are 44px high. Search may be wider; date, select, More filters, and the primary Search/Reset action use shared control dimensions. Records stay beside the right-aligned action.
- Phone list headers keep the primary search/date control with the green Filter action. Secondary filters live directly in the shared sheet; never add another nested More filters disclosure inside that sheet.
- Dense operational tables may stack closely related values in one column (for example Wastage over Wastage %) and render timestamps as date over time.
- Role dashboards do not repeat bottom-navigation destinations as a second mobile quick-action group. Sparse role content expands across the available workspace instead of leaving an artificial empty column.
- Right-console action buttons are 44px high and center-aligned. Page-specific action alignment overrides are not allowed.

- **Shell:** Top Bar, role-aware navigation, page title/context, and safe-area handling.
- **Workspace:** one of `contained`, `wide`, or `full`; the content hierarchy remains the same at every viewport.
- **Actions:** one visible primary action, followed by secondary inline actions; context drawers are never the only route to a common task.
- **Records:** status tabs, filter bar, summary strip, semantic table/list, and pagination are shared components with responsive presentations.
- **Forms:** shared field/control tokens, progressive disclosure for notes and advanced options, and one canonical submit source.
- **States:** status, warning, error, loading, empty, and read-only states use the same semantic vocabulary across devices.

### Pagination contract

All paginated list, ledger, register, and history views must expose direct page navigation whenever more than one page exists: `Previous`, numbered pages, an ellipsis where needed, and `Next`. Previous/Next-only pagination is permitted only for a genuinely sequential stepper, not for a data list. The current page must be visibly selected, disabled edges must be announced, and page changes must preserve active filters and the semantic identity column.

## Color and component discipline

- Deep operational green is the only ordinary primary, active, selected, and focus color across every viewport.
- Semantic red/crimson is the shared attention color for warning, urgency, danger, critical states, and compact notification cues. It is never a default button, navigation color, neutral icon tile, or decorative panel theme.
- Success, danger, information, and neutral states use their semantic tokens only when the data carries that meaning. Do not create blue, purple, teal, or amber workspace themes merely to decorate a directory or dashboard.
- Verify semantic foreground/background pairs against WCAG AA before shipping. Do not communicate a critical state by color alone; pair color with a label, icon, or explicit copy.
- White surfaces, the glare-free neutral canvas, 1px borders, and tabular data carry enterprise density. Shadows are reserved for temporary overlays; persistent cards and panels use borders rather than decorative elevation.
- Buttons, inputs, selects, action rows, popovers, menus, empty states, and tables use the shared token vocabulary. A new component must not introduce a one-off radius, brown accent, color family, or spacing scale. Use `rounded-sm`/`rounded` controls and square screen-edge surfaces everywhere.
- Every interactive component must have visible default, hover, keyboard-focus, disabled, loading, error, and empty/read-only states appropriate to its task.

## Mobile Web App shell

The authenticated phone experience is an application-style mobile Web layout, not a scaled desktop sidebar.

- Below `1280px`, the primary navigation is a five-slot bottom bar: up to four permission-aware role shortcuts plus `More`. Phone and tablet share the component; tablet uses the same bar with wider centered shortcuts and never falls back to a persistent desktop rail.
- `More` opens the complete navigation allowed by the current role and effective permission map. It must never expose an unauthorized route.
- Shortcut destinations are role-aware. Owner and Manager emphasize requests, receiving, and stock count; Finance emphasizes requests, invoices, and stock; Purchasing emphasizes requests, orders, and receiving; Kitchen emphasizes production and assigned operational work; Outlet Staff emphasizes the daily record.
- Every role receives four permission-safe task destinations plus `More` when its effective permissions allow four destinations. Missing permissions fall back only to another authorized destination; navigation never duplicates a shortcut.
- The desktop sidebar remains the authoritative desktop navigation and is unchanged at `1280px` and above.
- The phone top bar uses a fixed three-slot structure: contextual back control on the left, a single centered page title, and workspace notifications on the right. Root workspaces reserve the left slot so the title remains optically centered.
- Company identity, profile, subtitles, and duplicate document labels do not appear in the phone top bar. Profile remains available through `More`; new, edit, and detail routes link back to their parent workspace.
- A phone page must not repeat the same workspace name in the top bar, page header, and document header. New documents show status, branch, workflow position, and the next permitted action beneath the top bar instead of repeating “New [document]” and the module title.
- On a phone document header, place status and branch scope on one compact context row; show workflow position in one small disclosure row beneath it. Do not spend a separate full-height row on the status, branch, and workflow label when the same context can be scanned together.
- The bottom bar observes `env(safe-area-inset-bottom)`. The top bar observes `env(safe-area-inset-top)`, and the root viewport uses `viewport-fit=cover`.
- A page-level fixed primary action owns the phone bottom action area: its presence hides the bottom navigation and anchors the action directly above the home safe area. It must not cover the final field or the home indicator, and the shared top bar must retain the contextual back button.
- Pages without contextual actions must not render an empty or generic secondary action bar.
- Mobile sheets lock background scroll, support Escape dismissal, preserve focus, and sit above both navigation and page actions.
- The web manifest uses `display: standalone` so supported browsers may add the OMS to the home screen without creating a separate native application.

The mobile shell may reorganize navigation, information density, filters, and action placement, but it must reuse the same colors, terminology, permissions, route authorization, document states, and server actions as desktop.

## Typography and spacing

- Use `rem`, `em`, design tokens, or `clamp()` for type and spacing. Do not use screen-specific pixel font sizes or page-level pixel padding.
- Keep labels, status, and instructions concise. On small screens, progressive disclosure is preferred to a long uninterrupted form.
- Use the shared control-height token. Phone controls are 48px; tablet controls are 44px to remain iPad touch-safe; desktop regains 36px compact density at `1280px` and above. Do not let the 640px compact breakpoint reduce a phone control below 48px.
- All controls use the shared `2px`/`4px` interior radius and all full-width panels use square edges for a continuous Opening Stock ledger surface. No device-specific soft consumer radius is permitted.
- Quantity, currency, and date fields must be large enough to enter and review without zooming. Numeric values use tabular figures and retain a visible unit.
- Date fields use the shared `Input` control (or an equivalent token-based wrapper); do not introduce bare native date inputs that bypass the mobile control height, radius, border, and focus treatment.
- Date values render as an invariant `YYYY-MM-DD` label across browser and device locales. The native picker remains available as the input mechanism, but its locale-specific visual value must not be the only visible representation.

## Mobile color and shape language

- Deep operational green is the only normal primary-action, selected-navigation, active-workflow, and keyboard-focus color.
- Semantic red/crimson is the shared warning and critical attention color, including pending approval, overdue AP, out of stock, rejected, destructive, and blocking states.
- Phone inputs, selects, text areas, buttons, filter triggers, popovers, and row actions use the same `2px`/`4px` interior radii as tablet and desktop. Full-width surfaces use square edges. Status and notification badges may remain fully pill-shaped; ordinary cards must not.
- A single phone surface must not mix square legacy fields, inconsistent radii, green primary buttons, and semantic colors used outside their tier.

## Media and content safety

- Every `img`, `video`, `iframe`, `canvas`, `object`, and `embed` is constrained with `max-width: 100%` and `height: auto` unless an explicit aspect-ratio container owns its size.
- Images must have useful alt text unless decorative. They must use `object-fit` deliberately rather than relying on intrinsic dimensions.
- Long IDs, product names, branch names, and imported values must wrap, truncate with an accessible label, or remain in a scrolling subregion; they must never widen the page.

## Operational workflow UX

- The current status and the next permitted action appear before secondary metadata.
- Dashboard workspaces show the signed-in operational context consistently at every breakpoint: `Welcome, [staff name] | [role] | [actual branch scope]`. This replaces generic labels such as "Assigned branches". Company-wide roles show `Company-wide`; assigned roles show the readable names of their assigned branches.
- The contextual welcome line is a dashboard identity and scope cue, not a second top-bar title. Phone top bars continue to use only the centered page title; tablet and desktop place the same contextual line in the workspace header.
- Role-specific Dashboard quick actions are creation or immediate-execution actions. Mobile navigation instead carries the role's most frequent workspaces. For Kitchen this deliberately separates `Purchase Request`, `New Production`, and `Receive` in Quick actions from `Stock Count`, `Stock Balance`, and `Stock Wastage` in the bottom bar.
- Module landing pages use the operational hub hierarchy: one current-day summary, one primary task, one attention queue, and one compact tool list. They do not use repeated icon-card directories or duplicate explanatory copy.
- The operational hub keeps the same information order on phone and desktop. Responsive behavior changes column placement and density, not terminology, color roles, or task priority.
- Summary values share one flat data strip. Semantic red appears only when the corresponding value requires attention; zero and normal states remain operational green.
- A form starts with only the fields needed to begin. Notes, advanced filters, and audit detail use progressive disclosure.
- Line-entry documents place the editable value and unit together, keep theoretical/variance feedback visible, and avoid card height that makes a count feel endless.
- Long repeated tasks show useful review progress and provide an in-list find/adjusted-items view. A repeated physical count may prefill each line from its latest posted physical result; when no posted result exists, it may use the current ledger balance as an explicitly labelled starting estimate. Prefill is never hidden, is immediately editable, and the UI must distinguish values ready for review from values the user has adjusted.
- Quantity controls pair a direct numeric field with decrement/increment controls when rapid adjustment is the primary task. Mass and volume units (`KG`, `G`, `L`, `ML` and their documented variants) allow fractional entry; discrete count units such as `CAN`, `ROLL`, `PACK`, and `BTL` accept whole numbers only in both the client and server validation.
- Per-line remarks remain directly visible in dense desktop layouts. On touch layouts they may collapse until requested. A variance may recommend a note, but creating a draft must not force one; high-variance review and approval controls remain auditable and separate from draft entry.
- Repeated line-entry work uses three density modes from the same row component: phone is a divided input-first row; tablet portrait uses a four-column ledger (`identity`, `reference`, `editable value`, `variance`) with notes on demand; laptop and desktop add a persistent fifth remarks column. Do not delay all table structure until desktop-sized breakpoints.
- Destructive, posting, approval, cancel, and backup actions must state their consequence and remain distinct from save/draft actions.
- Role restrictions must result in an explanatory read-only state, not a missing or broken-looking page.

## Mobile operational surfaces

- A phone workflow uses one boundary per operational unit. Do not place a bordered or shadowed card inside another card merely to group ordinary fields, progress, search, or line items.
- Use a separate setup panel only when the user must establish context before beginning work (for example, date, branch, and tolerance). The repeatable work itself belongs in one continuous operational surface.
- Within a continuous operational surface, use flat section backgrounds and 1px dividers for progress, filters, and rows. Do not wrap those sections in additional cards.
- Preserve the same content hierarchy on desktop, but mobile may split setup from the active work surface to improve scanning and prevent nested-card visual noise.
- A multi-column editable desktop table must not be the primary phone input. Keep the desktop table at `md` and above, then render the phone workflow as continuous divided rows: identity first, editable operational value and unit next, reference/calculated values last.
- Do not use a horizontally scrolling table as a substitute for a phone line-entry layout. Horizontal scrolling remains acceptable only for read-only technical detail that has no safe compact representation.

## Verification gate

A UI change is not complete until:

1. every affected route loads with the global stylesheet parsed;
2. no page-level horizontal overflow occurs at 320, 390, 640, 768, 1024, 1280, 1440, or 2560px;
3. every visible link, button, input, select, textarea, and summary remains inside the viewport unless it is inside an explicitly contained scrolling table region;
4. keyboard focus, errors, empty states, loading states, and primary actions remain visible and usable;
5. the related workflow Playwright test passes using isolated local data; and
6. static route layout audit and typecheck/lint/build remain green.

The Playwright route-layout audit is the baseline guard for all static workspaces. Workflow specs provide the mutation/role coverage; neither replaces the other.

### Full-system interaction audit

All business actions follow one visible feedback contract: the first activation
disables the control, sets `aria-busy`, shows a contextual pending label and a
small spinner, then resolves to an explicit success or error state. A form may not
silently submit, render a fabricated zero, or leave the user guessing whether a
posting action completed. Audit this contract at 390px, 820px, and 1440px using
the route matrix in `docs/qa/FULL_SYSTEM_AUDIT_MATRIX.md`.

## Release identification

- The visible footer version is the canonical application release identifier, not a build-only or sprint-only counter.
- Every production release uses a three-segment semantic version in `package.json` and `src/lib/app-version.ts`; the login footer and workspace sidebar render `vX.Y.Z` from that same source.
- Every user-visible change batch must increment that shared version before its Git commit. The commit subject and GitHub release title must use the same short change title as `APP_RELEASE_TITLE`; no UI batch may be pushed with a stale footer version.
- GitHub tags use `vX.Y.Z`. GitHub Release titles use `vX.Y.Z — Release title`, matching the short `APP_RELEASE_TITLE` stored beside the application version.

## Parallel work and business-logic integration

- **Supply ownership is explicit:** Outlet access and operational rollups derive from a dated Central Kitchen → Outlet route, never from branch-name guesses in application code. A route must stay within one company and link a `central_kitchen` source to an `outlet` destination.
- **Qty Sent is never inferred as fact:** A new daily record leaves Qty Sent unknown until an authorized Kitchen or Office actor confirms it. Outlet Received may create a separately stored estimate for reconciliation, but must never prefill or overwrite formal Qty Sent. Every persisted sent value carries provenance and a confirmation flag.

- Production is promoted only from the designated integration branch after every active workstream has been merged and verified. Never promote an older Preview merely because its isolated smoke test passed.
- Each concurrent Codex task owns a separate `codex/*` branch and worktree. A task may commit and push its own scoped work, but it must not promote Production or overwrite another task's branch.
- Business migrations, RPCs, server actions, API routes, and permission changes require an isolated commit and contract tests before entering the integration branch. UI-only changes must not silently introduce a second business workflow.
- A new specialized workflow may reuse the canonical aggregate operation, but it must not create a competing source of truth, bypass the established approval state machine, or reserve inventory unless that reservation rule is explicitly approved in product documentation.
- Database migration numbers are allocated once on the integration branch. Before adding a migration, fetch the integration branch and confirm that the number is unused; rebasing or renumbering happens before review, never after Production has applied it.
- Temporary capture scripts, local CSV reconciliation tools, generated exports, and `supabase/.temp` state stay outside release commits unless the repository intentionally adopts them as maintained tooling.
- Before promotion, record the candidate commit SHA, current Production SHA, migration range, test result, and rollback point. If Production has moved since validation, stop and rebuild a Preview from the latest integration branch.

### Table activation and filter overflow

- A table row must never navigate on pointer-down or a single tap. Open a row with double-click/double-tap (or keyboard Enter/Space); explicit action controls remain single-tap.
- List filters are ordered Search → relevant dropdowns → Search button → result total. At constrained widths, move lower-priority filters into More filters rather than putting status before search or misaligning the control row.
- On phones, a simple Search + one status dropdown + Search + result total set stays on one row with a shorter search field. Only genuinely larger filter sets may wrap or move secondary controls into More filters.
- More filters is a modal surface on touch layouts: centered on tablet and bottom-aligned on phone. It sits above and temporarily obscures the bottom navigation, locks interaction with the page behind it, and always keeps Reset and Apply visible while only its fields scroll.
- Phone list-filter controls use the compact 34px height demonstrated by Movement Ledger; the search field, dropdowns, More filters trigger, Search/Filter button, and result summary share one visual baseline. Larger task-form controls keep their separate touch contract.
- Phone document workflow status is a compact secondary disclosure, not a full-width banner: use an inline-width container capped by the available content, keep its trigger at 32px, and open the full workflow only on request.
- Autosave feedback belongs inside that same capped workflow summary; it may occupy a narrow trailing slot, but must never expand the summary back to full viewport width.
- A mobile page must not render a generic `More actions` bar merely because a desktop rail exists. The bar appears only after the user has selected a record/detail context or when the page has a real contextual action.
- A phone `OperationalHub` owns its own primary action. Its desktop-only context rail must set `hideMobileConsole`; never duplicate the hub action with a generic `More actions` bar or hide bottom navigation on the hub landing page.
- Every create FAB, including the `PageHeader` fallback used by list pages, uses the shared `data-mobile-create-fab` marker so safe-area clearance and tablet positioning cannot drift between action sources. Legacy `data-page-create-fab` may remain as a compatibility marker.
- **Mobile elevation:** Fixed bottom navigation and action bars use a restrained upward shadow so scrolling content is visibly separated from persistent controls.
- **Compact metric summaries:** Phone summaries with four or more scalar metrics use a dense two-column grid instead of one full-width row per value; tablet and desktop may expand to four or eight columns.
- **Short four-metric summaries:** When exactly four short totals fit legibly at the target phone width, keep them in one four-column strip. Do not turn a four-value status summary into four stacked cards.
- **High-count metric summaries:** When a phone summary contains eight short operational totals, it may use four compact columns and two rows; labels may wrap to two lines, but the summary must not become a long vertical ledger.
- **Mobile list status hierarchy:** A compact operational row may place its primary numeric value directly beneath the status badge. Supporting identity such as item code and branch/location wraps as separate lines instead of competing with that value.
- **Mobile pagination:** Phone pagination shows Previous, current/total, and Next only. Direct numbered page choices belong at tablet and desktop widths so pagination never collides with a floating operational action.
- **System-owned identifiers:** Auto-generated document numbers and versions are never editable form controls. Creation actions generate them authoritatively; the right rail may display their current system state.
- **Canonical units:** Quantity UOM fields use the shared canonical UOM list and normalization. Never accept free-text unit aliases where the value drives stock, recipe, or purchasing calculations.
- **Derived base units:** A recipe ingredient's base UOM comes from Item Master and is read-only in the recipe editor. Only the controlled recipe UOM may be selected; neither value accepts free-text aliases.
- **Report density:** Scalar report summaries use the shared compact metric strip (two columns on phones, expanding by viewport). Secondary report filters belong in `FilterBarMore`; primary search/status and submit remain in the single filter row.
- **Report issue rows:** Mobile report exceptions reuse the compact operational-list hierarchy: record first, severity and module together, reason next, and the recommended manual action as a final full-width detail. Do not render one bordered card with a full-width button per issue.
- **Read-only comparison rows:** A mobile comparison report may reuse `OperationalListRow` without navigation. In that case it shows no chevron, keeps the comparison status and key variance beside the primary identity, and places linked document references and compact quantities in the full-width detail layer.
- **Trend rows:** A mobile trend report does not squeeze a six-column analytic table into the viewport. Keep the full table from tablet upward; on phones reuse non-navigating operational rows with identity first, reliability signal and primary movement together, and the supporting received/leftover/wastage measures on one compact secondary line.
- **Readiness severity:** A readiness result is a semantic status, not an unstyled scalar. Ready uses success treatment; blocked or not-ready states use the shared red danger treatment.
- **Planning controls:** Report assumptions and tuning inputs (dates, target horizons, buffers, rounding, secondary dimensions) belong in `More filters`; the primary row keeps only the dimensions needed to identify the working dataset and its submit action.
- **Master-data units:** Product, item, recipe, packaging, and purchasing unit fields reuse the canonical UOM selector. A create form does not show an empty preview panel for an asset that cannot exist before submission.
- **Conditional line remarks:** Repeated quantity rows keep remarks collapsed until an exception exists (quantity mismatch, wastage/reason) or the user explicitly requests a remark. Existing remarks always remain visible.
- **Fixed line units:** When a line UOM is inherited from Item Master or the selected source document, submit it as a hidden value and show it beside the item code or quantity reference. Never spend a full phone input row on a read-only UOM.
- **Compact document setup:** On phones, pair related setup fields in a two-column grid when their values remain legible (for example date/reason or source/destination). Keep the required operational context visible and place optional notes, batches, references, and evidence fields behind an explicit inline disclosure.
- **Line removal affordance:** A repeated phone line keeps its remove control in a dedicated trailing column. Never overlay the remove control on the item search, quantity stepper, or expandable details.
- **Recoverable dependency errors:** When a form cannot continue because master-data mapping is missing, name the missing relationship and the exact workspace the user must open to repair it. Do not expose system-derived sourcing fields as a workaround.
- **Document rail actions:** A document right rail shows secondary actions directly on tablet and desktop; `More options` is reserved for phone-sized constrained action surfaces.
- **Create-document fields:** Auto-generated identifiers stay as hidden server inputs and may appear in the right-rail summary, but never consume editable form space. Repeated line-entry sections include explicit column headings at table widths.
- **Action-column label:** The shared lead action column is singular `Action`, centered in its fixed-width header and cells. Do not use a plural heading or left-align the pen/menu trigger.
- **Future-state line values:** A create form never asks the user to enter quantities or statuses produced by later workflow steps. New PO lines submit received and cancelled quantities as system-owned zero values; receiving and cancellation are recorded only from their dedicated workflows.
- **Automatic sourcing:** When branch–item mappings determine supplier, cost, and purchasing UOM, creation forms submit those values as system-derived hidden fields. Prefer the preferred mapping, otherwise use the first deterministic authorized mapping; do not expose automatic commercial fields as ordinary line controls.
- **User-initiated PR drafts:** Stock Count and Low Stock may let users add items to a cart, but a Purchase Request is created only after an explicit user action. The result is an ordinary Draft, never reserves inventory, and always returns to the canonical PR approval workflow.
- **Semantic urgency:** Priority inputs reuse the colored `UrgencySelect` whenever the choice affects operational scanning. Do not fall back to an indistinguishable plain select on adjacent workflows.
- **Related phone quantities:** When a repeated operational row contains three short, directly comparable quantities (for example Qty Sent, Received, and Wastage), keep them as three equal compact columns on one phone row. Exception reason and remarks remain absent until wastage is non-zero or persisted exception data already exists.
- **Mobile event feeds:** Activity and audit feeds reuse the compact `OperationalListRow` hierarchy on phones: event message first, actor/entity context second, timestamp aligned as meta, and one trailing chevron. Never create a separate leading `Details` column or repeat an icon on every row when it displaces the event content.
- **Recoverable long-form work:** Any operational form that normally takes several minutes or contains repeated line entry must keep a local recovery snapshot and autosave to its existing server-side Draft. Show a quiet inline `Saving…`, `Saved`, recovery, or retry state; do not add a modal or a new workflow status.
- **Stable background save:** Background autosave updates the Draft without route navigation, cache revalidation, scroll reset, or replacing the current client view. User view preferences such as sorting are stored independently from record data and survive autosave, refresh, and Draft route recovery. Stock Count defaults to Item Code order until the user explicitly chooses another order.
- **Persistent save feedback:** On a phone document with autosave, place its quiet save state in the sticky workflow summary so it remains visible while the user works. When both a manual Draft save and terminal action are available, they share the same bottom action row; do not duplicate either action as a large page-local button.
- **Terminal-action flush:** Posting, confirming, or completing a recoverable form must submit the latest visible values before changing lifecycle state. If that save fails, keep the record editable in its current Draft state and explain that it will retry.
- **Decimal-safe Stock Count:** Stock Count quantities accept up to four decimal places. Compare against a rounded value with floating-point tolerance; never reject valid user input because JavaScript added an IEEE-754 tail.
- **Bounded autosave retry:** Autosave retries only transient server or network failures. Validation and permission failures remain in the local recovery snapshot but must stop automatic retry loops until the user changes the form.
- **Non-retryable workflow conflicts:** A server response stating that an action cannot be completed in the current state is a lifecycle conflict, not a transient outage. Stop background retries, keep the local snapshot, and show that the changes remain recoverable on this device.
- **85% audit baseline:** Pages that use `DocumentWorkspace`, `WorkspaceGrid`, `OperationalList`, or the shared mobile action/filter surfaces inherit the approved `/staffs/new` tablet split, compact phone hierarchy, and action-first rules. Record the audit in Notion before changing a shared component; only promote a code change when a real contract or visual defect is found.
- **90% audit baseline:** Authentication and operational detail/report routes must be audited against the same shared shell before being marked ready; isolated auth pages keep business navigation out, while detail/report pages retain the approved right rail or compact operational list for their viewport.
- **Public route verification:** Next.js route-group segments such as `/(app)` are source layout folders, never production URL segments. Browser QA, screenshots, links, and Notion route records must use the literal public path (for example `/purchase-requests/new` or `/supplier-items/new`). Any result collected from a `/(app)/...` URL is invalid and must be discarded.

### v7.83.0 — Stock Count Autosave Visibility

- Stock Count autosave feedback is visible directly beside the count date whenever a server draft action is available, so `Saving…`, `Saved`, recovery, and retry states remain discoverable without opening another panel.
- Shared table Action links use a centered fixed touch target (`44px` on tablet, compact on desktop) rather than stretching the pen trigger across the entire cell; the Action header follows the same centered alignment.

### v7.84.0 — Filter Dialog Navigation Safety

- When `FilterBarMore` is open on phone or tablet, the mobile bottom navigation is hidden behind the dialog. The filter dialog owns the interaction surface until it is closed or applied.

### v7.85.0 — Stock Count Autosave Cleanup

- Stock Count keeps one canonical autosave status beside the count date; the retired event-driven duplicate status component is removed so the visible state cannot diverge between surfaces.
- Contract tests follow the fixed centered Action touch target and the single autosave status source.

### v7.86.0 - Shared Create FAB Safe-Area Alignment

- Page-header create actions now opt into the same `data-mobile-create-fab` contract as right-console create actions, keeping bottom-navigation clearance and safe-area positioning consistent across list pages.
- The legacy `data-page-create-fab` marker remains only for compatibility; it is no longer the sole positioning hook.
### v7.87.0 — Staff Access Default Branch Submission Fix

- Staff creation keeps the default branch visually locked while submitting it as an accessible branch value, so the server-side access validation receives the required branch instead of an empty checkbox payload.
### v7.89.0 — Integrated OpsLogic Business Workflows

- Integrated the committed OpsLogic branch into the UI closure branch without dropping the existing shared-component work.
- Preserved branch-scoped Purchase Request creation, transition authorization, Stock Count cancellation atomicity, and Stock Transfer reservation/partial-receiving contracts.
- Release gate: 451/451 contract tests, typecheck, strict typecheck, and lint pass. No Supabase migration was executed from this worktree.

### v7.91.0 — Stock Count Detail Query Reliability

- Stock Count detail loading now reads only the current count's line item IDs and branch instead of scanning all Items and Branches for every detail request.
- This preserves the Draft → Confirm & Post workflow and autosave behavior while reducing the chance of a detail page remaining in `Loading data…` on larger workspaces.
- Browser evidence: phone Stock Counts list and Draft workflow passed; detail reload still requires production three-viewport verification when the browser runner is available.
- Release gate: 451/451 contract tests, strict typecheck, and lint pass. Production build remains environment-dependent when Supabase variables are absent.

### v7.90.0 — Purchase Request Branch Scope Hardening

- Purchase Request branch selectors use an explicit typed scope option and only expose branches assigned to the actor when required.
- Server-side creation and submit transitions continue to validate branch access; client selection is not treated as an authorization boundary.
- Release gate: 451/451 contract tests, typecheck, strict typecheck, and lint pass. Supabase migrations remain staged but unapplied until the linked project and migration history are verified.

### v7.92.0 — Stock Count Three-Viewport Acceptance

- Production acceptance completed against `/stock-counts` and a real Draft record at desktop (1440×900), tablet (820×1180), and phone (393×852).
- All three viewports reached the Stock Count list and Draft detail without a login redirect or route error.
- The Draft detail visibly exposes `Autosave ready`, preserves the `Code` sort selector, and exposes both `Save draft` and `Confirm & Post Count`.
- Desktop/tablet use the approved right action rail; phone uses the shared bottom action row with both actions visible together.
- Evidence screenshots: `D:/CodexHome/visualizations/2026/08/02/stock-count-audit/` (`*-list.png`, `*-detail.png`).
- This acceptance verifies the UI contract only; it does not post or mutate production business data.

### v7.93.0 — Tablet Filter Dialog Navigation Safety

- `FilterBarMore` now removes the mobile bottom navigation on every mobile and tablet viewport (up to 1279px) while open.
- The dialog therefore owns the full interaction surface; Apply, Reset, and Close cannot be obscured by or compete with bottom navigation.
- This is a shared rule and applies to every page using `FilterBarMore`; no page-specific duplicate implementation is allowed.

### v7.94.0 - Compact Dropdown-First Filter Rows

- Shared filter rows keep a first-position dropdown content-sized (14rem maximum) on tablet and desktop, leaving intentional breathing room instead of stretching a lone status control across the canvas.
- Search-first rows retain their flexible search field; the rule applies to both native selects and the shared Radix select trigger.

### v8.04.0 — Safe Mobile Pagination Density

- Shared pagination keeps its result summary shrinkable and its navigation controls intact on narrow phones; desktop page choices may wrap instead of clipping the final controls.

### v8.03.0 — Unposted Stock Count Deletion

- Stock Counts may be removed while they are still unposted, including legacy pending and cancelled records; autosave-created work is not trapped in an undeletable state.
- Posted Stock Counts remain immutable because they have already changed the stock ledger. Deletion remains soft, branch-scoped, permission-gated, confirmation-protected, and activity-logged.

### v8.02.0 — Lightweight New-Document Headers

- New documents show their descriptive title as plain context text instead of a bordered document-number control; generated document numbers keep the shared number treatment on detail pages.

### v8.01.0 — Centered Table Actions

- Shared table action links use a block-level flex control so the pen/action icon is truly centered inside the fixed Action column at phone, tablet, and desktop widths; sticky checkbox/action/identity offsets remain unchanged.

### v8.00.0 — Aligned Filter Rails and Dashboard Actions

- Shared list filters use a consistent 8px control gap on wider surfaces; compact mobile rows retain their explicit density rules so search, dropdowns, submit, and result totals stay aligned without accidental crowding.
- Dashboard payables actions use the compact action text scale, matching the operational console instead of competing with the metric hierarchy.

### v7.99.0 — Focused Stock Count Actions

- Stock Count details keep Save draft and Confirm & Post as the primary action pair; the explicit Delete draft action remains inside collapsed More options to reduce accidental destructive actions and visual noise.
- Collapsing secondary actions is opt-in per workflow, so existing procurement action rails are not changed without an explicit rule.

### v7.98.0 — Compact New-Document Context Headers

- New-document headers use a smaller document identifier and tighter vertical rhythm on phones; status and branch remain visible without turning the context row into a large action surface.
- Workflow progress remains a compact, accessible secondary summary; the primary page content and action bar retain visual priority.

### v7.97.0 — Focused Stock Count and Receiving Surfaces

- Stock Count status filters expose only the current Draft, Posted, and Cancelled states; legacy records remain readable without reviving the retired approval chain.
- Goods Receiving list filters use the compact mobile search/status/result arrangement, and the new receiving form has one surface boundary instead of a nested duplicate card.

### v7.96.0 — Safer Stock Count Draft Management

- Stock Counts in `draft` or `cancelled` status may be soft-deleted by users with `stock_count.update` access; posted counts remain immutable and their audit history is retained.
- Stock Count CSV export respects the selected from/to date filters and excludes soft-deleted records.
- Stock Count autosave waits for 2 seconds of user idle time, keeps recovery state locally, and reports its status in the mobile action bar.
- Mobile Stock Count rows use compact 44px steppers and preserve the item-first reading hierarchy; Save draft and Confirm & Post share one action row when both are valid.

### v7.95.0 - Compact Dropdown-First Filter Rows on Phones

- A leading status or category dropdown stays content-sized on phones instead of inheriting the full-width search slot.
- Search-first rows keep their flexible search behavior; this shared rule keeps dropdown-first filters within the approved two-row mobile density.
- This closes the Costing Readiness “All severities” density annotation without changing the canonical Search-first ordering or mobile wrapping behavior.

### v7.88.0 — Tablet Split Action Deduplication

- A tablet split workspace exposes its primary action in the right rail. The shared mobile FAB and mobile action bar are suppressed between 768px and 1279px so one task never presents duplicate primary actions. Phone retains the FAB and desktop retains the right console action.
### v7.89.0 — Integrated OpsLogic Business Workflows

- Integrated the committed OpsLogic branch into the UI closure branch without dropping the existing shared-component work.
- Preserved branch-scoped Purchase Request creation, transition authorization, Stock Count cancellation atomicity, and Stock Transfer reservation/partial-receiving contracts.
- Release gate: 451/451 contract tests, typecheck, strict typecheck, and lint pass. No Supabase migration was executed from this worktree.
## v8.13.1 — Deletion rule alignment

- Every document detail surface must expose a clear `Delete draft` or `Delete unposted …` action while work has not posted inventory or accounting impact.
- This action removes the record from active work through the existing audited cancellation/removal RPC; it must not hard-delete activity history.
- Posted records remain immutable. Their destructive control explains the accounting boundary and points to a correction workflow instead of silently failing.
- Do not label an action `Cancel & remove` when the user intent is to discard an unposted draft; the visible label must say `Delete` and the pending state must say `Deleting`.
- A one-time forward-only backfill may set `deleted_at` on legacy rows already in a cancelled terminal state so they stop appearing in active lists; it must not delete rows or alter posted ledger data.

## v8.36.0 — Explicit Stock Count Cancellation

- Autosaved or manually saved Stock Counts that have not posted inventory expose an explicit, confirmation-protected `Cancel stock count` action in the shared More options area.
- Cancellation removes the count from active work while preserving its audit history; it does not create a ledger movement and does not replace the separate `Delete draft` control.
- Posted counts remain immutable. The primary action pair stays limited to `Save draft` and `Confirm & Post Count`; destructive actions remain secondary to reduce accidental taps.
# v8.37.6 — Completion Matrix and Filter Geometry Refinement

- Outlet Daily's seven-day matrix keeps a fixed identity column while the date cells scroll in a bounded work surface; tablet users receive an explicit horizontal-scroll cue and the document itself never widens.
- Report and date-first operational filter toolbars may opt into balanced tracks so query, filters, More filters, and the terminal action share one deliberate geometry without changing legacy compact list behavior.

# v8.38.0 — Phone Search Surface Evolution

- Phone list routes (`max-width: 639px`) use the shared `UnifiedListHeader`: one 44px search control, one icon filter trigger, and the result total. Search submits from its own form after the short debounce; it must never submit an unrelated form on the page.
- Phone-only filters open a full-viewport backdrop and bottom sheet above the mobile navigation. The backdrop owns `z-index: 100`, the sheet owns `z-index: 101`, and both include the safe-area inset. Reset and Apply remain visible while filter fields scroll.
- Tablet (`640px–1023px`) and desktop keep the practical inline filter controls and right action rail. They do not receive the phone drawer or its icon-only replacement unless a route explicitly documents a different task surface.
- This is a responsive presentation change only. Filter names, query parameters, authorization, Supabase data sources, and server-side pagination remain unchanged.
- A shared control may evolve when viewport evidence demonstrates a real comprehension or density defect. New rules supersede earlier historical notes; the newest section is authoritative for future implementation.
# Iterative polish, not aesthetic rollback

- A UI closure pass preserves the established visual language: intentional panel radii, restrained depth, quiet motion, and decorative brand details remain valid. Do not remove them merely to make a screen flatter or more minimal.
- Fix structural defects first: duplicated containers, broken alignment, wasted height, wrapping context, inconsistent control geometry, hidden actions, and responsive overflow.
- Reduce card nesting only when two surfaces communicate the same hierarchy. A meaningful action rail, section surface, or elevated mobile action bar may retain its own surface treatment.
- Reuse an existing shared pattern before adding page-specific styling. When a recurring pattern is corrected, update its owning shared component or token and verify every known consumer.
- Mature product patterns are references, not replacement themes. Adopt proven information architecture and interaction behavior without importing a new aesthetic, motion system, radius scale, icon set, or business workflow.
- User annotations are problem evidence, not automatic implementation specifications. Preserve their intent, test the proposed solution against permissions, data semantics, accessibility, and all supported breakpoints, then record the final rule.
# Release version discipline

- Every completed product/UI closure increments the application patch version.
- Keep `package.json`, the root package entry in `package-lock.json`, and `src/lib/app-version.ts` synchronized.
- Navigation and authentication footers display only the concise `vX.Y.Z`; release titles belong in release notes, not narrow rails.
# v8.36.3 — Shared List Surfaces and Role-Aware Daily Entry

- Every operational list separates its query controls from its result content. The query card may contain two internal rows on compact tablets; the table, operational rows, pagination, and empty state belong to a separate content card.
- At `640px+`, search is the only elastic field. Filter controls, More filters, and the terminal Search/Reset action share a 44px height and an 8rem width. The result count sits immediately left of the far-right action.
- At phone widths, `UnifiedListHeader` remains one 44px search plus a green Filter trigger and a visible result count. The list or empty state starts on a separate surface below it.
- Outlet Daily exposes one primary action determined by capability and workflow state: kitchen confirms Qty Sent; outlet entry completes Received/Wastage. Save Draft and privileged stage-only actions remain secondary.
- Outlet Daily reserves a conditional desktop detail column for wastage reason and remarks. On tablet, those two controls share the row beginning under Qty Sent. Remarks remain collapsed behind the comment affordance until requested.
- New-document mobile context is sticky and becomes denser after scrolling. It keeps status, date, location, and workflow orientation without repeating those values in the collapsed Record setup summary.
- The current visual language remains authoritative: 12px panels, 8px controls, restrained shadows, and existing motion. Structural convergence is not permission for an aesthetic reset.

# v8.36.4 — Procurement List Surface Convergence

- Purchase Orders, Goods Receiving, Purchase Returns, Supplier Invoices, Suppliers, Purchase Requests, Production Jobs, and Outlet Daily Records use the same two-surface list structure: one independent query card followed by one independent content card.
- `UnifiedListHeader` owns phone, tablet, and desktop geometry. Search remains elastic; filters and the terminal Search/Reset action use the shared 8rem width at `640px+`; every visible query control renders at 44px high.
- Result count remains immediately left of the far-right Search/Reset action. Query controls never inherit table overflow or appear vertically attached to table headers.
- `MasterDataFilters` delegates its responsive presentation to `UnifiedListHeader`; master-data routes must not maintain a parallel desktop filter implementation.

# v8.36.5 — Unified List Surface Contract

- Every record list uses two sibling surfaces: one query card and one content card. Never nest the query card inside the table/content card.
- Desktop query controls are 44px high. Filters and actions use a consistent 8rem width; search may be wider but is capped at 250px when desktop space permits.
- Query inputs, selects, status controls, and More Filters use a white surface. The primary Search/Reset action remains Seri Bako green.
- On mobile Outlet Daily creation, the sticky context header carries status and workflow only. Record setup owns the live location and date summary so the same context is not repeated twice.

# v8.36.7 — Compact Document Editing Contract

- New-document phone headers show the document title and status without repeating branch or date. Location and date belong to the collapsible details/setup surface immediately below the header.
- Mobile workflow triggers use the concise `Step X of N ›` label. The sheet title and accessible label carry the word “workflow”; the compact trigger does not repeat it.
- Repeating item editors use one numbered item-search row followed by one aligned quantity, UOM, and comment row. Controls share one height and the established 8px control radius.
- Stock Count setup reuses the collapsible document-details pattern. Its closed summary exposes branch and date; its expanded content keeps date/autosave cards and settings readable as two rows on compact tablets.
- Mobile document action rails use explicit grid slots. Status text may shrink and wrap by phrase, but action buttons never force status words into vertical single-character columns. Rails retain safe-area padding and the established elevated shadow.

# v8.36.9 — Tablet Stock Count Control Recovery

- Dense quantity steppers must allow the numeric input to shrink inside its grid column while preserving both 40px decrement and increment controls. A minimum input width must never clip either action.
- Fixed document action rails are phone-only (`<768px`). Tablet and desktop layouts use their contextual right-side primary action and must not render a duplicate bottom action rail.

# v8.36.10 — Responsive Contract Closure

- Stock Count regression coverage includes the exact 820px portrait-tablet viewport in addition to phone, compact tablet, and desktop widths.
- Tablet verification checks rendered behavior rather than DOM absence: the phone action rail may remain mounted but must be hidden, while both stepper actions remain visible and inside the viewport.
- Shared UI contract tests assert durable interaction semantics and explicit data ownership instead of brittle Tailwind class ordering. Outlet Daily must keep its three quantity inputs aligned, default a newly activated wastage reason to `unsold`, and expose remarks through the labeled comment action.

# v8.36.13 — Tablet Work-Surface and Form Surface Closure

- A route with contextual actions uses the shared tablet split by default. At `768px–1279px`, its query controls may wrap as complete groups when the right rail reduces usable width; search keeps a readable 12rem minimum and must never collapse to icon width.
- Routes use one `FilterBar`/`UnifiedListHeader` instance across phone, tablet, and desktop. Do not render parallel hidden mobile and desktop filter trees.
- New purchase returns, supplier invoices, recipes, stock transfers, and wastage records keep one explicit outer work surface. Inner sections communicate a distinct task only; they do not recreate a card around the same form.
- Collapsible setup surfaces expose one Expand/Hide control and keep all setup fields together. A second hidden “more details” disclosure inside the setup is not allowed.
- Line-level remarks use a message action on the item title row and render the remarks field only after activation. Availability/read-only metric blocks use the shared control radius.
- Purchase Request CSV export opens a selection dialog. User-selectable columns are restricted by a server-side allowlist before the database query is built.

# v8.36.14 — Evidence-Driven Responsive Release Gate

- Every customer-facing static workspace is audited at phone (390×844), portrait tablet (820×1180), landscape tablet (1180×820), and desktop (1440×900) before a UI release. Dynamic record routes use seeded IDs in their separate route audit; a skipped or stale-fixture route is unverified, never a pass.
- The release gate rejects document-level horizontal overflow, interactive controls outside the viewport, ordinary labels collapsed into narrow vertical single-character columns, fixed action rails separated from the viewport bottom by a duplicated safe-area inset, and floating controls whose background becomes transparent because a design token is undefined.
- Repeating mobile item editors use explicit named grid regions. Item search owns the first row; quantity, UOM, and the comment action share the second row. A broad selector may not replace a component's grid template or reset its child placement.
- Screenshot evidence must come from a clean `.next-playwright` cache and a clean evidence directory. Old screenshots or a reused build cannot be accepted as current verification.
- New features must pass the existing responsive route matrix before they are considered complete. A feature change does not authorize weakening, hiding, or removing an established responsive contract.
## v8.37.0 — Progressive Report Preview Surfaces

- AP Aging and Production Variance now use the same progressive preview behavior as the other report charts: the exact-value surface is announced accessibly but does not reserve visual height until a bucket or signal is selected.

## v8.37.1 — Progressive Inventory Movement Preview

- Inventory Daily Movement now keeps its exact-date detail collapsed until a date is hovered, focused, or tapped. The chart remains compact at rest, while keyboard, pointer, touch, and same-date ledger drill-through behavior stay available after selection.

## v8.37.2 — Report Preview Surface Consistency

- Report previews now share the same token-based control radius, soft border, and muted surface when selected. This keeps Production Variance, Inventory Movement, Aging, ranking, and line-chart previews visually aligned without changing their data or drill-through behavior.

## v8.36.99 — AP Aging Mobile Empty-State Hardening

- AP Aging Supplier Exposure now renders an explicit mobile empty state when no supplier has an open positive payable balance; an empty mobile list is no longer mistaken for a hidden or unavailable report.

## v8.36.98 — Report Preview and Mobile Density Refinement

- Ranking previews now show an explicit ordinal, keep their progressive preview closed until a row is hovered, focused, or tapped, and retain the same keyboard and touch drill-through behavior.
- Demand Trend metrics use the shared two-column phone strip, three-column tablet strip, and six-column desktop strip; Product Margin mobile rows combine supporting values into two compact lines.

## v8.36.97 — Operational UI Density and Shared Surface Convergence

- Dashboard attention copy uses a compact product type scale and role charts no longer repeat the same low-stock exception already present in Operational Pulse and Exceptions.
- Outlet Daily completion previews are interaction-first: the matrix is compact at rest and exact record detail appears on hover, focus, click, or touch. Coverage remains available as a concise disclosure.
- Master-data action rails use one icon vocabulary, query controls share a deliberate desktop width, Stock Transactions places active filters directly below the query surface, and Low Stock no longer wraps the procurement queue in a duplicate outer card.
- PR basket controls are denser on tablet/desktop, tablet rails may claim a wider task column, and purchase UOM is selectable in both Stock Balance and Low Stock procurement flows.
- Unavailable Stock Count variance reads as unavailable rather than resembling a zero result.
## v8.52.0 — Responsive Report Rankings

- Ranking cards now own their descending metric order with deterministic tie-breaks, so filtered or streamed data cannot render a misleading rank sequence.
- Ranking rows use a compact two-line mobile pattern (label/value above, bar below) and return to a single-line desktop layout at wide breakpoints.
- Hover, touch, and keyboard selection continue to expose the same progressive preview and drill-through action.
## v8.64.6 - Reliable Outlet Daily Reads

- Outlet Daily list aggregation indexes line rows by record before calculating totals. This removes repeated full-line scans as the record history grows, while preserving the fail-closed rule for unverified receiving values.
- The read path continues to distinguish verified zero, suspicious zero with sent stock, and unavailable receiving data; performance work must not weaken those states.

## v8.64.167 — Outlet Daily hierarchy and responsive identity

- The Outlet Daily document header suppresses the generic duplicate location badge. Its branch/date identity stays on one desktop line; on phone the branch is 14px and the date owns the following line so neither value becomes an accidental wrap fragment.
- The Today rail leads with record count, then separates Dispatch, Receiving, and completion outcomes with labels and dividers. Supporting warnings remain subordinate to their metric instead of competing as peer rows.
- Qty Sent validation copy is concise and action-oriented; workflow explanation remains in the dedicated validation surface.

## v8.65.2 (deployed; authenticated UAT pending) — Calm operational hierarchy

- Dashboard work queues use flat divided lists and compact contextual lines instead of labels repeated inside nested cards. Important work remains first; operational metrics are supporting evidence.
- Purchase Request mobile rows use three stable reading lines: identity/status, branch/supplier, then date/user/items/value. Workflow labels stay short enough to remain on one line.
- Stock Count exposes one primary posting action. Add item and destructive controls live under More; item-specific branch settings remain behind the row's three-dot action.
- Posting-time inventory movement is a non-blocking attention state, not a destructive red error. The follow-up surface explains the original baseline, posting baseline, physical count and final variance without altering Kitchen's entry.
- Release evidence is intentionally bounded: commit `4f79fda5` and migration `208` are deployed, while authenticated role and four-viewport visual acceptance remain pending.

## v8.64.171 (unreleased) — Truthful Stock Count progress

- A loaded Stock Count row is not automatically a ready value. Progress copy states `completed of total counted` and the remaining quantity count.
- Incomplete counting remains recoverable on the device without presenting a server failure or retry loop. Server autosave begins only when every physical quantity is present.
- Recovery snapshots are versioned and retain each line's original prefill. If the server baseline changes, an untouched old prefill follows the new baseline; an explicit operator edit remains intact. Pre-version snapshots preserve matching quantities without claiming they are adjustments, ignore removed scope lines, and seed newly added scope lines from the server.
- Stock Count has no operator-defined tolerance. Exact theoretical, physical, absolute variance, and variance percentage remain the review evidence.
## v8.65.3 (unreleased) — Consequence-first actions, compact operational rows

- Destructive reversals are never a plain button: Stock Count voiding explains the ledger consequence, shows server-calculated impact, requires a reason and acknowledgement, and keeps Cancel visually neutral.
- High-frequency Add Item is embedded at the end of the count surface; low-frequency row recovery is reduced to three mutually clear choices.
- Tablet query filters use one full search row followed by controls and their command group. Mobile queues stay within three information rows with consistent semantic order.
- Outlet Daily uses one product rhythm across breakpoints: quantities stay compact, Reason is narrow, Comment receives the flexible width, and visible repeated field labels are replaced by accessible labels.

### Shared mobile action validation — v9.2.78

Right Console submits an external page form exactly once with its real submitter before unmounting the drawer. Native validation and the page form own error focus; internal drawer forms and prevented button actions retain their existing behavior. Esc closes the drawer and restores the More actions trigger. Inert phone checks covered invalid event, valid event, bulk minimum Enter and settings save. React hook/component review found no added network reads, dependencies, motion system or duplicated business state.

Plan checks now identify the product/outlet and required correction instead of a generic issue count. Shared domain checks distinguish missing from zero, manual adjustment reasons, confirmed-event quantities, minimum/reduction reasons, configured yields, whole trays, retention and surplus/shortfall. Database authorization, current-route/configuration checks and approval remain authoritative; these client checks do not replace them. Default forecast settings stay in Settings rather than repeating in the action rail.
