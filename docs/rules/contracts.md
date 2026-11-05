# Cross-module working contracts

Updated 2026-11-02. Source: user requirements relayed in the 2026-11-02 project handoff; code references below identify inspection starting points, not proof of compliance. Verification evidence and unresolved decisions are tracked in [acceptance](acceptance.md).

## Roles and scope

The detailed role/route and workflow matrix is [ROLE_PERMISSION_MATRIX](../ROLE_PERMISSION_MATRIX.md); its dated local and historical sections must not be read as proof of deployed grants. Nine role codes are observed in `src/lib/roles.ts`; this is an implementation inventory, not confirmation of the intended role model or grants. Confirm intended roles from approved requirements and effective access from current grants, company, branch and backend/RLS enforcement, not navigation. Compare Owner, Purchasing, Kitchen, Chef, Manager, Outlet Supervisor and Outlet Staff where applicable, plus other affected roles. Never infer an unverified permission from this index. For each module record read, create, edit, approve and export separately, including expected denials and scope. Asset-specific provenance and assigned-location checks require the relevant asset policy, not a generic Planning rule.

## Products, availability and Daily

Products is the management view of the complete catalogue, with status and availability understandable; Outlet Daily eligibility is evaluated for the **record date**, not implicitly today's date. Status, deletion, seasonal flag, date bounds and historical record retention are distinct concepts. Pages must not interpret contradictory season flag/date combinations differently without an explicit, consistent rule. Preserve existing historical records. Whether conflicting input is rejected, cleared or otherwise resolved, and treatment of empty historical rows, remain **pending business decision**; do not silently alter real product data.

Known code discrepancy at Preview 738b8e5a: `src/server/queries/products.ts` filters dates against today; `src/server/queries/outlet-daily-records.ts` and `src/components/outlet-daily-record-form.tsx` only apply bounds when seasonal. `src/server/actions/products.ts` is a save-path starting point. A read-only investigation reported MC07 as nonseasonal with an October 1 cutoff; this is an observed conflict, not a validated new rule. Acceptance: compare the complete product set and individual reasons across management and Daily on dates before, on and after bounds, across actual authorized roles and scope, including historical rows and read-after-save.

## Planning and data invariants

For two kitchens in the same company, investigate missing products individually against product status, scope, route, date, batch configuration and existing plan; an unexplained configuration difference is not a business justification. Do not assume all differences are invalid: record the confirmed reason for each. `src/server/actions/production-planning.ts` and `src/lib/production-planning/` are starting points. Planning quantity integer constraints are specific to Planning; do not impose them on stock, purchasing or the rest of OMS. Planning optional fields and asset transfer/maintenance reasons are independent contracts. Verify saves and drafts by reading back persisted data, and distinguish a zero, missing value and unavailable data.

Attendance must preserve raw punches while checking employee matching, multiple punches and missing-punch prompts. Scheduling requires employee/outlet matching and the relevant Chef, Supervisor and Manager steps. Asset imports, maintenance, checklist, transfer batches and existing notes require provenance and role checks. Inventory count/recovery and unit conversions, purchasing basket-to-PR/supplier/AutoCount, payroll export/permissions, and Settings imports require module-specific review; consult their existing specifications and current code rather than inventing missing policies. OCR and email invitations were cancelled in the latest handoff; do not revive them without a new decision.

Planning annotation21 (2026-11-02) keeps non-rice batch yield editable at1; zero yield remains invalid and blank remains unknown. Suggested quantity stays visible beside compact manual entry; Supply period is a plain column heading. Scope, calculations and persistence are unchanged. Local evidence and remaining role/save acceptance: [Planning annotation21](../qa/planning-annotations21-20261102.md).

## UI boundaries

For the affected Daily form, prefilled values use light italic styling and manually entered values normal styling; show wastage reason/comment directly. Do not add Checked or Details controls to that flow. Asset Import belongs inline in Settings, not a separate import page. These are scoped user decisions, not a ban on every use of those words or import routes elsewhere. The repository entry `AGENTS.md` specifies 48px phone primary actions; [annotation rules](../ANNOTATION-DERIVED-UI-RULES.md) and the [v10 design contract](../v10/DESIGN-CONTRACT.md) specify 44px minimum touch targets. These apply at different scopes: 48px to phone primary actions; 44px is a general minimum, not a universal exact height. Tablet touch and compact desktop follow existing scoped tokens; reconcile any affected control-specific exception before changing it. Verify actual rendered desktop, tablet portrait/landscape and phone states, including long content, keyboard, focus and permissions. Passing tests or counting screenshots does not establish design acceptance; compare the real screen with the requested design and record differences.

## Daily workflow decision still open

[Annotation-derived UI rules](../ANNOTATION-DERIVED-UI-RULES.md) contain both a Ready-to-post/finaliser rule and a direct Posted rule. Their effective scope and any later approved replacement are not established by this audit. Do not choose one as universal; trace the latest explicit decision, role, branch and server guards, then update the owning section and link the decision. The Daily form-specific removal of a Details control does not supersede progressive disclosure elsewhere.

New21 ODR9–14 (2026-11-02 local candidate): desktop food-daily quantities are compact so reason/comment share the row; phone/tablet keep existing touch layout. Insights metric cells remain three peers, displayed rates/percentage changes use one decimal while arithmetic and quantities retain their precision. Trend text follows the selected date range, and its data header sticks inside a scroller filling the adjacent chart height. This supersedes hardcoded seven-day chart wording for custom ranges, not historical seven-day default reports. Decisions,15 Settings boundary and evidence: [ODR new21](../qa/odr-new21-20261102.md). Local evidence is not Preview/user acceptance.

ODR Insights follow-up2026-11-03: the daily-data table must keep Date/Received/Wastage/Rate visible within its1280px desktop scrollport. Scoped cell padding uses8px horizontally; sticky header, data and arithmetic are unchanged. Actual Owner read-only findings and local correction: [ODR live follow-up](../qa/odr-live-readonly-20261103.md).

### Fixed Staff63 recovery candidate (2026-11-03)
The approved BAKIARAJ recovery is restricted to one missing mapping and25 fixed existing day/batch results; Oct13/17 remain untouched, all schedules remain draft/submitted, and raw/history/payroll/OT/RO approvals are preserved. A dedicated default-disabled entry must retain signed-in actor, existing effective permissions, atomic backup/receipt and preimage guards; search filters never scope the existing broad recalculation action. This is a local candidate, not an installed exception or global rule. See [scope, evidence and installation gates](../qa/attendance-person63-recovery-20261103.md).
The v2 candidate replaces global table locks with bounded row locks, adds a same-origin action restricted to the designated operator, and includes separately gated compensating restoration. During that operator's maintenance view, broad/automatic recalculation is disabled. Production default ACL and deferred confirmation triggers were inspected; installation remains unapproved/unperformed. See the linked v2 evidence and explicit runtime/Preview gates.

- Person63 scoped compensation must recheck authorization expiry after waiting for input locks, immediately before its first write; expired waiting requests must preserve the recovery snapshot and receipt. Shared permission-row locking and actual signed-in/runtime acceptance gates remain applicable.

## Four browser comments — 2026-11-03
Attendance workspace tabs and confirmation empty-state links follow the same existing role/permission route contract as their destinations; an account-dropdown entry does not confer additional schedule or attendance rights. PO compact metadata reuses the PR/receiving row structure. Uniform list backgrounds remain the rule; old immutable Preview URLs do not acquire later fixes. Evidence and remaining visual acceptance: [four-comment record](../qa/four-browser-comments-20261103.md).
Planning empty states describe the viewer's visible workflow: non-managers are told no approved plan is available and to contact their Manager; they are not directed to generate drafts. Current production draft visibility remains manager-only as verified2026-11-03. Changing Chef draft visibility requires a separate explicit workflow decision; this copy fix does not change access.

Idle timeout is scoped to the current login session; it must not revoke other active logins. Same-origin activity coordination and the existing25/30-minute policy remain unchanged. Local regression and evidence boundary: [session isolation](../qa/session-timeout-isolation-20261103.md).

ODR Settings summary2026-11-04: display the saved active channel names and within-section order using the existing tenant-scoped settings read; on failure show unavailable rather than canonical defaults. This is presentation of existing configuration, not new monetary mapping. [Source audit and evidence](../qa/odr-5fc-followup-20261104.md).
Asset Transfer format confirmed2026-11-04: AT-001, company-scoped persistent allocation for new transfers, no historical backfill or real activation implied. [Decision and verification](../v10/proposals/asset-transfer-at-format-20261104.md).
## RO / OT failure feedback — 2026-11-04 local correction
RO decisions and OT claims must distinguish business conflicts (409), permission refusal (403), and service unavailability (503); never classify failures using fragments of displayed prose or expose SQL details. Existing approval eligibility/state rules remain authoritative and unchanged. [Local route evidence and remaining incident gap](../../handoff/people-ro-ot-20261104/REPORT.md).

Planning saved-draft repair (2026-11-04): Add missing products is append-only and preserves existing product/allocation rows and state; new quantities remain unknown. Only current company/kitchen/date/explicit-menu eligible products are added; no forecast/batch membership gate. Existing recalculation is unchanged. See [local implementation and verification](../qa/planning-append-missing-20261104.md).

MC07 display correction2026-11-04: saved supply dates must be visible regardless of seasonal flag. The Products false flag caption describes "Not seasonal", not unlimited availability when dates exist. Current Daily/Planning already use inclusive supply dates independently of that flag, superseding the historical738b8e5a implementation discrepancy above for current code only. Master-data normalization remains unresolved. See [actual read-only evidence and local correction](../qa/mc07-availability-20261104.md).

Daily empty-history presentation,2026-11-04: evidence-empty unavailable food_daily rows retain the same omission across save/status/lock transitions. Confirmed zeros, quantities, notes and provenance remain visible. This supersedes draft-only presentation, not historical persistence or completion rules. No record unlocking or data deletion; pending-count cause awaits actual record evidence. See [scope](../qa/odr-empty-seasonal-history-20261104.md).

TRX screenshot follow-up2026-11-04: confirmed out-of-season zero-only daily-food historical rows are collapsed behind an explicit expandable history control, not omitted from payloads or deleted. Actual quantities/notes remain visible. Receipt summary exclusion still applies only to strictly unconfirmed empty history; confirmed zeros stay authoritative.

## November 4 browser comments 13

The new batch supersedes the earlier instruction to always show a blank Daily comment: show an editable comment only for Other, preserve existing remarks for other reasons. Daily numeric columns share panel-responsive tracks. Source, remaining carryover-wastage decision and evidence: [browser comments 13](../qa/browser-comments13-20261104.md).

User confirmed on 2026-11-04: Next-day food stops future Usage entry; historical Usage remains read-only, without conversion to Wastage. New primary columns are Qty Sent, Received, Wastage, Tomorrow. The independent confirmation and compatibility requirements are in [carryover save trace](../qa/odr-carryover-save-trace-20261104.md). SQL is a local candidate, not installed.

RO self-review controls retain their existing disabled state. When the current actor submitted a pending correction, show the reason as visible row text and associate it with both buttons; do not rely on hover-only tooltips. This also applies to the attendance callers of ActualAttendancePanel. The reported Preview row’s submitter identity remains unverified. See [annotation1 checkpoint](../../handoff/people-ro-ot-20261104/ANNOTATION-1-CHECKPOINT.md).

Asset registration Import from Excel is a shared secondary button-style link, visible above the form on phones; preserve Owner/assets.manage restrictions. No change to import processing. [2026-11-04 decision and evidence](../qa/asset-register-import-entry-20261104.md).

### Schedule workbook import result visibility
The existing import result belongs in the non-scrolling dialog footer above actions. Keep actual saved counts, draft/publication wording, partial failures and unresolved source warnings intact. Long review content scrolls independently; the result must not cover controls on mobile or desktop. See [evidence](../../handoff/schedule-import-result-20261104/REPORT.md).

Stock Count weight-review wording identifies excluded KG lines and unchanged inventory separately from the document status; never imply a Posted document is unposted. [Phone evidence](../qa/stock-count-annotations-20261104.md).

Daily historical text parity, 2026-11-05: local omission/collapse now matches PostgreSQL trim semantics: only ordinary spaces count as empty; tabs, newlines and Unicode whitespace remain historical evidence. Original stored text is never normalized or erased. This conservatively resolves presentation/summary disagreement without database changes; see [reproduction and verification](../qa/odr-empty-seasonal-history-20261104.md). Local only, not yet deployed.

Inventory summary proposal, 2026-11-05: purchase/consumption quantity totals must remain per item and unit; name-only grouping and cross-unit quantity ranking are unsafe. Review-only candidate and live/isolated evidence: [unit summary design](../qa/inventory-unit-summary-design-20261105.md). Proposed activity-count ordering and historical unit consistency are not yet approved/verified; existing purchase UI guard remains in force. No database installation.

Inventory historical unit evidence, 2026-11-05: live read-only audit found two explicitly confirmed KG label corrections but no complete per-movement unit snapshot. Current master units are not proof of historical units. The 2aefa5d SQL remains a grouping prototype, installation held; unknown historical totals require a clear unavailable state, not current-unit backfill. [Evidence and safe ordering proposal](../qa/inventory-unit-summary-design-20261105.md#follow-up-live-unit-provenance-audit--2026-11-05).

Inventory safe activity proposal, 2026-11-05: the review candidate now emits only explicitly labelled movement-record counts for purchase/consumption, with no historical qty/UOM, and empty legacy quantity arrays for structural compatibility. Old clients hide those panels; new activity rendering remains required. This supersedes the unsafe current-unit grouping prototype, not Production behavior. [40-assertion isolated evidence and rollout limits](../qa/inventory-unit-summary-design-20261105.md#safe-activity-only-revision--2026-11-05).

Inventory activity RPC installed 2026-11-05 after explicit conditional approval and Preview8f0e03b Ready screenshot. Only get_inventory_dashboard_summary(text) changed; history/ACL/RLS digest guards passed. [Installation receipt and remaining UI limits](../qa/inventory-unit-summary-design-20261105.md#authorized-production-installation-receipt--2026-11-05). Earlier local-only notes are historical; no Production app deployment occurred in this step.

## Product helper and mobile opening — 2026-11-05
For next-day food, future Daily entry uses Wastage and Tomorrow; historical Usage stays read-only. Product category help must reflect that approved decision. Products and UOM retain the established deliberate double-tap list gesture; authenticated Owner double-tap succeeded. [Evidence and limits](../qa/product-uom-preview-20261105.md).

Products and UOM compact lists opt into a visible, list-associated double-tap/double-click and keyboard Enter hint only when nonempty and the existing detail permission is present. Other OperationalList callers remain unchanged; full desktop tables do not show the compact hint. [Implementation evidence](../qa/product-uom-preview-20261105.md).

320px procurement/inventory follow-up: document references must remain readable on phone; narrow linked-document cards become single-column below390px. Inventory phone axis range/dates use unscaled text while desktop SVG axes remain unchanged. See [local evidence and remaining live acceptance](../qa/product-uom-preview-20261105.md).

Shared compact search below390px gives the text input a full row and keeps filter/search/result controls on the next row; retain existing390px+layout and44pxtouch targets. [Narrow attendance evidence](../qa/product-uom-preview-20261105.md).

Goods Receiving list and sidebar must not sum heterogeneous units. Show receipt line counts and direct users to item/unit-level received and rejected quantities; preserve detail values and backend compatibility. [Confirmed mixed-unit receipt and local guard](../qa/product-uom-preview-20261105.md).

## 2026-11-05 Manager/Daily annotation batch

User approves Manager RO decisions within authorised branches, retaining no self-review; supersedes the Manager RO denial in migration 274 only after scoped implementation. Daily morning-recorded entries with pending dispatch must retain an authorised save/confirm path. Shared Daily reason uses its spare desktop final column; remove redundant percentage suffix. [Scope and verification](../qa/annotations-manager-daily-20261105.md). No live permission change claimed.

## Daily historical unit basis — 2026-11-05

Daily list/detail/Insights must not render combined quantities or rates without a verified matching historical unit and food population. Catalogue units are not historical snapshots. Preserve line values, sales amounts and completion counts. [Local guard, compatibility limits and tests](../qa/daily-unit-summary-guard-20261105.md).

## Export / Planning historical unit attribution — 2026-11-05

Current catalogue unit must be identified as current, not presented as proof of historical units. Preserve original export values and append provenance metadata for compatibility. Historical forecast changes require independently verified unit evidence and must not rewrite saved plans. [Implementation, design, tests and PDF gap](../qa/daily-export-planning-unit-design-20261105.md).

### Planning unit trust guard (2026-11-05)
New generation/recalculation must not infer quantities from unknown historical units or unverified saved minimums/employee baselines. Require explicit matching snapshots; missing carryover requests manual quantity, never zero stock. Minimum estimation failure preserves existing draft settings. Existing saved plans remain unchanged. Historical blank PDF pages label current catalogue units as historically unverified. See [implementation and verification](../qa/daily-export-planning-unit-design-20261105.md). No snapshot schema/save-chain is installed by this guard; current automatic history suggestions remain unavailable.

### Asset permission batching (2026-11-05)
Asset workspace uses one existing permission-map RPC for report/manage/maintenance/transfer. Preserve active tenant actor checks, per-code results, server query/action authorization and redirects; do not cache grants across actors or companies. Source and harness verification: [asset permission performance](../QA-ASSET-PERMISSION-PERFORMANCE-2026-11-05.md). Hosted timing and installed SQL remain unverified.

### Procurement read concurrency (2026-11-05)
PR item defaults and branch supplier mappings may overlap only after scoped item/branch IDs are loaded; preserve every filter and error check. PO export branch loading must await `po.create` and retain actor scope, while unrelated list/summary reads may overlap. See [verification](../QA-PROCUREMENT-READ-CONCURRENCY-2026-11-05.md). Scheduling changes do not replace RLS or establish hosted speed improvements.

### Daily/inventory local allocation work (2026-11-05)
Reuse catalogue maps only inside the scoped request; append to locally owned Stock Card groups without changing source rows, ordering, running-balance calculation or read limits. See [verification](../QA-DAILY-INVENTORY-ALLOCATION-PERFORMANCE-2026-11-05.md). No cross-actor caching or query-scope expansion.

### Daily option concurrency (2026-11-05)
Restricted staff assignment reads may overlap active branch/product options only after the actor and view-all permission checks. Preserve staff-ID filters, allowed/default/route branch union and failure propagation; view-all actors must still skip assignments. [Evidence](../QA-DAILY-OPTIONS-CONCURRENCY-2026-11-05.md).

### Packaging report de-duplication (2026-11-05)
Deduplicate in linear scans while preserving first occurrence, input order and idless rows. Keep conflicting-ID and duplicate-cohort failures, zero/missing distinctions, scoped RPC and request-only caching. [Verification](../QA-PACKAGING-LINEAR-SCAN-2026-11-05.md).

### Planning history indexes (2026-11-05)
Use invocation-local product/batch indexes only; preserve first-product identity, strict ID lookup, historical unit verification, source order, complete-record and event checks. Keep company/kitchen/outlet query scopes and saved-plan semantics. [Verification](../QA-PLANNING-HISTORY-INDEX-2026-11-05.md).

### Receiving candidate index (2026-11-05)
Group scoped PO lines locally, preserving original order, positive remaining-quantity predicate, decimal arithmetic, empty parents and all error checks. Do not interpret legacy cross-unit pending_qty as a validated total; keep the UI pending-line count. [Verification](../QA-RECEIVING-ORDER-INDEX-2026-11-05.md).

### Supplier-option request scheduling (2026-11-05)
Only independent relationship/item/branch reads may overlap after mappings validate. Preserve error priority, same-company defaults, authenticated RLS scope and no partial result on failure. Successful query count remains five; helper concurrency rises to at most three. [Verification](../QA-SUPPLIER-OPTION-READ-WAVES-2026-11-05.md).
