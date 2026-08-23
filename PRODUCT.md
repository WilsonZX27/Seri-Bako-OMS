# Seri Bako Operations Management System

## Current closure policy (2026-08-23)

Production UAT mutation is now Owner-authorized only when it is traceable, isolated, recorded in `docs/PRODUCTION-UAT-TEST-DATA-2026-08-23.md`, and cleaned up after verification. Historical release notes that describe Production mutation as unauthorized remain historical evidence and are superseded by this current policy.

### v8.64.156 (unreleased) — Converted PO cleanup boundary

Converted purchase orders that have not been sent or posted now retain the audited `Delete unposted order` action. This keeps the normal cancellation path available for operator corrections and traceable UAT cleanup; it does not permit cancellation after supplier sending, receiving, or accounting impact.

### Production UAT checkpoint (2026-08-23, current evidence)

The authorized Production mutation run completed the real PR workflow for the isolated fixture `PR/AUG26/020`: WILSON created and submitted it, TEST MANAGER completed Manager Review, TEST PURCHASE completed Purchasing Review and converted it, and TEST-FINANCE completed Finance Review. The resulting approved PO is `UAT-20260823-PO-001` (`4fac5716-8c99-46a3-8ed3-80c015804bc6`), still unsent and unreceived. No inventory, GRN, invoice, payment, or supplier-send effect was created. The record remains explicitly retained in the UAT manifest until the v8.64.156 audited cancellation action is promoted; this is not a production-verified cleanup or a v9 trigger. The local release is ready, but repository permissions currently prevent staging/commit/push from this session.

### v8.64.155 (unreleased) — Stock Count compact control fix

Stock Count quantity controls now preserve a readable 40px input on the 390px phone card: the +/- controls use the shared compact 40px touch target and the group closes its small-screen gap before the UOM label. Desktop and tablet rhythm remains unchanged. Local responsive evidence is required before this batch is considered complete; Production regression remains separate.

The earlier read-only checkpoint below recorded the then-deployed v8.64.148 surface; it is historical evidence and is superseded for current status by the authenticated UAT checkpoint above. The remaining closure gate still includes promoted-version parity, Kitchen scope, Outlet loading, and safe cleanup of the isolated UAT PO.

Local E2E fixture hygiene: the disposable records and six local test identities used for this closure audit were removed from the local Supabase target after verification. `scripts/cleanup-local-e2e.mjs` is local-only and refuses non-local database URLs; no Production data was mutated.

### v8.64.154 (unreleased) — Local workflow audit hardening

The local closure audit now exercises the remaining mutation surfaces instead of treating browser smoke as completion: PR Manager/Purchasing review navigation, Stock Count/Transfer/Wastage posting, progressive GRN UOM learning, Supplier Invoice payment, and Outlet Daily ownership. The Manager review test uses the explicit accessible row action, and optional reset-local ledger fixtures are skipped before fixture-specific assertions so a truthful empty ledger is not reported as a product failure. Local evidence is recorded separately from Production verification; the six-role Production mutation gate remains awaiting UAT.

### v8.64.153 (unreleased) — Qty Sent ownership closure

Outlet Staff can view their daily record and enter Received/Wastage, but Qty Sent is visibly marked as Kitchen-owned and remains disabled. Kitchen and authorised company-wide roles can confirm dispatch quantities; the server RPC and RLS remain authoritative. Local disposable E2E now proves the Outlet UI and direct RPC cannot alter Qty Sent while Kitchen can confirm it. Production role regression remains a separate gate.

The refreshed local annotation audit now passes the 19-case core-flow suite and the 10-case historical PR/UI suite after provisioning the disposable annotation fixture. These results cover supplier/item identity, natural sorting, PR/PO disclosure, semantic stage colors, keyboard-safe navigation, basket ownership, and Outlet Daily visibility; they remain local evidence only.

The follow-up historical density suite passed `5/5`, and the P0 browser-comment regression passed `6/6` across filter grammar, role-safe PR review, procurement UOM, dashboard deduplication, AP aging, production canvas, Outlet Daily density, and low-stock decisions.

The local dynamic workflow responsive audit also passed `1/1` across Stock Transfer, Stock Wastage, and Production Job forms at 390×844, 768×1024, and 1440×960 with no control overflow.

### v8.64.152 (unreleased) — Receiving and invoice UAT closure

Local downstream workflow evidence now covers progressive receiving UOM learning (known, remembered, and one-time floating conversions) plus the flat Supplier Invoice matching surface across phone and tablet orientations. These are disposable local mutations/read checks; Production GRN, Invoice, and payment mutation remain outside the current boundary.

### v8.64.151 (unreleased) — Role-scoped PR detail closure

Purchase Request detail now resolves the Owner-only hard-delete preview only for Super Admin. Manager, Purchasing, Finance, Kitchen, and Outlet detail views no longer invoke a guaranteed-denied RPC or emit misleading permission errors during normal navigation. The deletion control remains unchanged for the Owner role.

### v8.64.150 (unreleased) — Six-role viewport audit closure

The local six-role workdesk regression now runs the exact release matrix: 390×844, 820×1180, 1180×820, and 1440×900. Each role must retain its scoped dashboard, safe destinations, no horizontal overflow, and responsive action rail. This is local evidence; Production login, migration 194 application, and authenticated read-only regression remain separate gates.

### v8.64.149 (unreleased) — Kitchen Qty Sent visibility closure

Kitchen can now reach company-wide Outlet Daily records before confirming dispatch quantities. The dedicated Qty Sent permission grant is preserved, while the Outlet Daily RLS policies use the outlet-specific access helper rather than the generic tenant branch helper; no unrelated Kitchen company-wide table access is broadened. Local disposable E2E remains the evidence boundary until migration 194 is applied and Production read-only regression is rerun.

### v8.64.148 (unreleased) — Qty Sent role boundary closure

The local and mock permission matrices now match the database contract: Kitchen, Manager, Purchasing, Finance, and the protected Super Admin path may confirm Qty Sent; Outlet Staff never receive that permission. Kitchen also retains company-wide Outlet Daily visibility so the dispatch step is reachable. The Qty Sent field stays disabled for Outlet users and the server RPC remains authoritative. The disposable local E2E fixture now exercises Kitchen confirmation while keeping Received and Wastage read-only.

### v8.64.147 (unreleased) — Kitchen dispatch visibility closure

Kitchen now receives the company-wide Outlet Daily visibility required to inspect outlet records and confirm Qty Sent before an Outlet submits its own receiving and wastage values. The new forward-only migration 193 is additive and idempotent; Outlet Staff remain outside `view_all` and `qty_sent`. Production read-only UAT on the deployed v8.64.145 surface exposed the previous Kitchen loading/visibility gap; no Production mutation was attempted.

### v8.64.146 (unreleased) — Qty Sent ownership and truthful totals

Qty Sent is now explicitly owned by Kitchen and company-wide review roles (Manager, Purchasing, Finance, and the protected Super Admin wildcard); Outlet staff remain unable to enter or correct it. Missing or unverified Qty Sent totals render as `Unavailable / Needs confirmation` instead of a misleading zero. Local migration 192 adds the role grants and the 191 guard remains local evidence until the user applies the migration and Production is promoted; the current Production footer observed during read-only UAT is v8.64.145.

### v8.64.145 (unreleased) — Production identity and natural-sort audit

Authenticated Production read-only checks confirm supplier identity surfaces expose `AutoCount` identifiers for BWY HOLDINGS (`BWYHOLDI`) and CILANTRO MAGNUS TRADING (`CILANTRO`) without overwriting the official supplier name or operator short name. The Supplier Item form provides a keyboard-searchable Item Master combobox, read-only Base UOM ownership, and controlled Purchase UOM options. The Items list returns natural item-code order (`1, 2, 3, 5, 6, 7, 9, 10, 11, ...`). These are read-only Production observations; no supplier or item mutation was performed.

### v8.64.144 (unreleased) — PR sourcing handoff clarity

Purchase Request detail now explains unresolved non-catalog lines at the Validation / Next Step surface. Manager approval can continue as a non-blocking handoff, while Purchasing is explicitly told to match the affected lines before Finance review and PO conversion. The notice preserves progressive sourcing without hiding the next operational responsibility. Local and authenticated Production read-only evidence remain separate gates.

### v8.64.143 (unreleased) — Qty Sent completion guard

Outlet Daily cannot be marked Posted while any line lacks an authorised Qty Sent confirmation. A Kitchen or authorised company-wide operator must confirm every line first; an Outlet receives a bounded, product-anchored correction message instead of a false completed record. Local Supabase migrations 191–194 now guard completion, grant Qty Sent ownership to Kitchen-and-above roles, give Kitchen the visibility required to use it, and scope the Outlet Daily RLS repair without broadening generic tenant access. Repository migrations reviewed through `194`; this is local evidence only until the user applies migrations 191–194 and Production read-only regression is rerun; the six-role mutation boundary remains awaiting Production mutation UAT.

### v8.64.142 (deployed) — Dashboard snapshot cleanup

The role micro-chart consumer has been removed from the dashboard because Finance, Kitchen, and Purchasing snapshots repeated the same payables, receiving, production, and follow-up values already owned by their canonical panels. The standalone chart component remains available for a future release only when a distinct trend data source exists. Read-only Production smoke now reaches 15 audited routes with HTTP 200 and footer `v8.64.142`; authenticated six-role UAT remains pending.

### v8.64.141 (deployed) — Dashboard signal deduplication

Owner and Manager dashboards no longer render a second Operational trend card that repeats the same stock-count, wastage, and outlet-completion values already owned by Today&apos;s work and Exceptions. Each signal now has one primary surface and one drill-through. Production route smoke now serves footer `v8.64.141`; authenticated six-role UAT remains separate.

### v8.64.140 (deployed) — Keyboard-safe tablet navigation

Tablet and iPadOS shells now keep the fixed bottom navigation attached to the physical screen edge while the software keyboard reduces the dynamic viewport. The CSS large/dynamic viewport delta is a fallback when visualViewport does not emit a resize event. Production now serves v8.64.140; authenticated six-role regression and Production mutation UAT remain separate gates.

### v8.64.139 (deployed) — Production deployment boundary

Read-only Production route smoke reached 16 core paths with HTTP 200 and footer `v8.64.139`. This proves the deployed host is reachable and internally consistent; authenticated Production regression remains pending and no mutation was attempted.

### v8.64.138 (unreleased) — Linked migration verification

The user-provided linked Supabase push completed migrations `185–190` successfully. The CLI emitted a non-blocking pg-delta catalog-cache certificate warning after applying the SQL; the command still ended with `Finished supabase db push.` Local and linked schema evidence are now separated from the remaining Production read-only regression gate.

### v8.64.137 (unreleased) — Migration uniqueness guard

The contract suite now rejects duplicate numeric Supabase migration prefixes and requires the AutoCount repair to remain forward-only at migration 190. This prevents another `schema_migrations_pkey` collision before a linked push. Local evidence only; linked and Production gates remain separate.

### v8.64.136 (unreleased) — Post-migration local workflow closure

After local migration 190 was applied, the authenticated browser closure rerun passed progressive receiving `3/3` and the complete PR → PO → GRN/attachment/payment QA suite `3/3`. The first combined run exposed a transient Next dev hydration timing failure; the clean rerun passed without source changes. This remains local evidence only; linked migration and Production regression are separate gates.

### v8.64.135 (unreleased) — Migration history reconciliation

The linked Supabase project already records migration version `171`, while the repository also carried a second, different `171_*` file. That duplicate made `db push --include-all` fail with a `schema_migrations_pkey` conflict. The already-applied migration remains immutable; the complete AutoCount Confirm replacement now runs forward at migration `190`. This is repository/local evidence only until a successful linked migration result is supplied.

### v8.64.134 (unreleased) — Progressive receiving snapshot closure

Unknown pack-size receiving now has a database-side safety net: when actual Purchase and Base quantities are present, the local migration derives the conversion snapshot before stock posting and conversion audit. Fresh local evidence passed progressive receiving 3/3, master data 1/1, Recipe 1/1, and Purchase Return 1/1. This is local evidence only; linked migrations and Production regression remain separate.

### v8.64.133 (unreleased) — Outlet Daily closure audit

Fresh local Supabase browser evidence now covers the Outlet Daily workflow end to end: date history and completion matrix, conditional wastage details, direct posting at four viewports, company-wide Qty Sent correction, dated product-line export, and the wastage/AP/cash-flow report surfaces all passed 19/19. The first stale-server attempt is excluded; this is local evidence only and does not promote linked migrations or Production regression.

### v8.64.132 (unreleased) — PR to PO error feedback closure

The local procurement closure now verifies the browser duplicate path as well as successful PR-to-PO conversion: a second disposable Ready to Convert request using the same AutoCount PO number receives a clear duplicate message, keeps the typed value, and does not create a second active PO. This is local evidence only; linked migrations and Production regression remain separate.

### v8.64.131 (unreleased) — Closure ledger reconciliation

The current closure ledger now distinguishes historical wording from current evidence: guided PR Apply, Purchase Return, AP Aging, progressive receiving, and the six-role procurement closure are locally verified where stated; linked/Production status remains separate. The dedicated browser PR-to-PO duplicate/error feedback probe is now closed by v8.64.132.

### v8.64.130 (unreleased) — AP Aging report closure

The local AP Aging report now has fresh authenticated evidence for the distribution interaction and phone layout: keyboard/hover previews expose invoice context and the drill-through link, while the 393px touch view keeps all seven buckets directly labelled and inside the viewport. This is local evidence only; linked migration alignment and Production regression remain separate.

### v8.64.129 (unreleased) — Purchase Return workflow closure

The disposable local receiving fixture now passes the authenticated Purchase Return browser path: create and refresh the draft from a posted GRN, post the supplier return, and verify the single return movement in Stock Transactions. This is local evidence only; linked migration alignment and Production regression remain separate.

### v8.64.128 (unreleased) — Guided PR review closure

The disposable local audit now executes the guided Manager Review repair end to end: replacing an unmapped request line with an Item Master item, mapped supplier, controlled Purchase UOM, and revised quantity succeeds through the visible Apply action and is asserted in both the request line and immutable revision history. This is local evidence only; linked migration alignment and Production regression remain separate.

### v8.64.127 (unreleased) — Current local closure audit refresh

After the retry-safe migration re-execution, the clean local production-like server again passed the full disposable Manager → Purchasing → Finance → Ready to Convert → PO/GRN/payment closure (3/3). This refresh strengthens local mutation evidence and does not promote any row to linked or Production verification.

### v8.64.126 (unreleased) — Progressive receiving migration closure

Migration 185 is now retry-safe for partial application: the supplier-UOM index uses an idempotent create, receiving checks are guarded by relation-aware constraint checks, and a direct second execution against the local PostgreSQL stack completed without errors. The clean local server still passes the three progressive UOM E2E scenarios. This is local evidence only; linked migration and Production regression remain separate.

### v8.64.125 (unreleased) — Progressive receiving UOM closure

Authenticated local Supabase E2E now proves the receiving learning loop: unknown 2 CTN → 24 KG with an immutable snapshot and optional Remember, a later 1 CTN receipt auto-calculates 12 KG, and a floating 2 BAG → 17.4 KG receipt remains one-time without changing the supplier default. Base-unit stock quantities and normalized costs are asserted from the posted ledger. This is local evidence only; linked migrations and Production regression remain separate.

### v8.64.124 (unreleased) — Fresh local workflow audit closure

The local production-like browser audit now includes the corrected field-level PR validation expectation and passed the remaining workspace, goods-receiving, Outlet Daily entry, administration, and responsive checks 12/12. This release record is local evidence only; linked migrations and Production regression remain separate.

### v8.64.123 (unreleased) — Sourcing boundary and fresh role audit closure

Changing the suggested Supplier now clears existing request lines that are not supplied by the new branch-scoped catalogue and explains the reset in plain language. The Item Master remains available for a deliberate re-selection, so missing supplier setup is still progressive review work rather than a submission blocker. A fresh local production-like audit passed six-role routing/dashboard/workspaces (20/20), PR → PO → GRN → invoice/payment/close (3/3), Outlet Daily history/Qty Sent/export/wastage and report surfaces (18/18), master-data and Recipe mutations (2/2), remaining review/return/invoice forms (6/6), and annotation/P0/responsive coverage (26/26). This is local evidence only; linked migrations and Production regression remain separate.

### v8.64.122 (unreleased) — Recipe workflow and document transition closure

The local production-like audit now creates, edits, submits, approves, and activates a disposable Recipe through the visible Recipe Workflow action at every state. Recipe and linked Document writes are sequential and fail loudly if either record cannot be updated, preventing the former silent half-transition. Migration 188 qualifies approval-step references in the shared document transition RPC and is applied only to the local Supabase stack; linked/Production verification remains open.

### v8.64.121 (unreleased) — Master-data mutation closure

The fresh local production server passed the authenticated master-data mutation E2E: Super Admin created and edited a disposable Branch, Supplier, and Item, with database assertions and soft-delete cleanup. Existing local closure evidence remains: six-role routing/dashboard/workspace checks (20/20), PR → PO → GRN → invoice/payment closure (3/3), Costing/GRN/Outlet Daily/Purchase Return/Supplier Invoice surfaces (8 passed, 2 fixture-dependent skips), and administration/master-data responsive checks (2/2). This is local evidence only; linked migrations, real AutoCount creditor/UOM data, and Production regression remain separate gates.

### v8.64.118 (unreleased) — Local closure audit follow-up

Local browser reruns now pass the AP/Recipe costing-readiness surface, Item/Supplier/Branch administration surface, and immutable Purchase Return posting alongside the Outlet Daily cost/export workflows. Export fallback filenames use the Kuala Lumpur business date, not the machine UTC date. This remains local evidence only; linked/Production migration and six-role regression gates remain open.

### v8.64.117 (unreleased) — Outlet wastage cost summary

Company-wide operational roles now see a “Today’s wastage value” panel alongside Outlet Daily work. It multiplies recorded product wastage by the latest active recipe cost snapshot, reports partial or unavailable cost authority explicitly, and remains hidden from outlet-scoped users. This is local evidence only; Production data and role regression remain separate.

### v8.64.116 (unreleased) — Outlet Daily export UAT

Authenticated local Purchasing UAT now downloads the detailed Outlet Daily CSV and verifies the dated filename, line-level product fields, Qty Sent provenance, wastage amount column, and explicit unavailable cost state. The companion company-wide Qty Sent correction workflow also passes when rerun. This is local evidence only; remote and Production verification remain separate.

### v8.64.115 (unreleased) — Detailed Outlet Daily export

Outlet Daily exports now preserve line-level product detail, Qty Sent provenance, received/leftover/wastage quantities, wastage reasons, and dated filenames. Wastage amount is shown only when the authorised company-wide view has an active recipe cost snapshot; missing cost authority remains explicitly unavailable. The local fixture now carries a truthful 1:1 GRN conversion snapshot so Purchase Return posting can be tested from the immutable receiving record. This remains local evidence only; linked and Production verification are separate.

### v8.64.114 (unreleased) — Local workflow closure

The local six-role audit now covers the no-route PR→PO→GRN→Invoice→Payment→PO-close path, AP Aging visibility before payment, supplier/item/branch UX surfaces, Outlet Daily missing Qty Sent semantics, and the authenticated responsive checks available in the local suite. This is local evidence only; remote and Production verification remain separate.

### v8.64.113 (unreleased) — Progressive PR sourcing

Purchase Requests keep Supplier as a required suggestion while allowing Item Master search before a supplier-item or branch route exists. Missing routes are provisional review work for Purchasing rather than a form-level or review-stage blocker; the supplier chooser includes active suppliers even before a branch route exists, while controlled UOM, quantity, and active-item validation remain enforced. Local authenticated QA with a deliberately unmapped supplier completed PR creation, three approval gates, PO conversion/send, GRN posting, Finance invoice approval, payment, and PO close. The disposable fixture now cleans its stock ledger lines as well as its documents.

### v8.64.112 (unreleased) — Purchase Order transition repair

Purchase Order submit now writes the valid `pending_approval` document status, so the downstream PO workflow can move through submit, approve, and send without an enum error. Migration 187 is local-applied and rollback-tested; linked/Production verification remains separate.

### v8.64.111 (unreleased) — Receiving posting lock repair

Goods Receiving can now advance the received quantity on an approved or sent Purchase Order through its controlled posting transaction. Ordinary PO line edits remain locked; the posting RPC uses a transaction-local guard, then records the immutable Purchase/Base UOM snapshot and optional learned supplier conversion.

### v8.64.110 (unreleased) — Progressive receiving UOM learning

Goods Receiving now accepts the supplier's actual Purchase UOM first, calculates Base UOM when a conversion is known, and lets the operator confirm both quantities when it is not. A confirmed conversion can be remembered for future deliveries without making master-data setup a prerequisite. Local Supabase migration 185 and the PR-to-PO repair migration 186 are applied and transaction-tested locally; linked/Production verification remains separate.

### v8.64.109 (unreleased) — PR to PO conversion repair

Purchase Request conversion now recreates its database RPC explicitly, writes the required purchase-order idempotency key, keeps one active PO per PR, and records conversion source metadata. AutoCount PO number failures now identify the exact business issue, focus the field, and preserve the typed number after a failed attempt. Repository migrations reviewed through `193`; this is local source evidence only, and linked/Production verification remains separate.

### v8.64.108 (unreleased) — Portrait Tablet Form Alignment

Purchase Order creation now aligns its form and action rail from the same top edge by using rendered-box grid gaps instead of sibling margins around hidden submission metadata. Production Jobs uses a deliberate two-row filter composition on portrait tablets: query and command first, then status, branch, and more filters at readable widths. This is local implementation evidence only; linked and Production verification remain separate gates.

### v8.64.107 (unreleased) — Workflow Stage Scanning and Keyboard-Safe Navigation

Workflow badges now use stable, restrained stage tones for Manager, Purchasing, Finance, Ready to Convert, rejection, and goods-receiving wait states while retaining explicit text labels as the source of meaning. On phone and touch-tablet shells, the shared bottom navigation measures the software-keyboard inset and remains anchored to the physical screen bottom behind the operating-system keyboard instead of jumping into the reduced editing viewport.

### v8.64.106 (unreleased) — Final Local Annotation Surface Closure

Supplier master data now exposes an explicitly labelled, editable operator short name without changing the AutoCount creditor code or official Supplier Name. Authenticated responsive acceptance also closes the remaining local-only evidence for Item action hierarchy, neutral Inventory movement colors, and Procurement counters. These are local implementation and UAT results only; linked migrations, real Production supplier data, Production footer, and Production workflows remain separate gates.

### v8.64.105 (unreleased) — Natural PR Register Order

Purchase Requests now use a generated natural document-number key at the database boundary before pagination, so `.../1, .../2, .../10` are reversible and predictable instead of lexicographic. The default remains latest number first and explicit column direction remains respected with a same-direction stable ID tie-breaker. Migration 184 is applied only to the isolated local database; linked and Production verification remain open.

### v8.64.104 (unreleased) — Sourcing Boundary Interaction Closure

Typed PR item codes now obey the same branch-and-supplier catalogue boundary as visible suggestions, with source, Purchase UOM, and Base UOM metadata. Item Master search is fully keyboard operable, rejected PRs show actor/time/next step, and zero-denominator Outlet days remain visible for correction without being misreported as a 0% trend. Local browser evidence is awaiting the complete release gate; linked and Production states remain separate.

### v8.64.103 (unreleased) — Annotation UAT Fixture Closure

The localhost-only authenticated fixture now supplies a guided PR review line, document comment, active Outlet product, and completed Outlet Daily trend record. Previously skipped PR dialog, portrait comment rail, wastage reset, trend chart, and Manager-versus-Purchasing authorization checks now execute against explicit disposable data. This strengthens local UAT evidence without changing linked migrations or claiming Production deployment; the observed Production login footer remains `v8.64.99`.

### v8.64.102 (unreleased) — Annotation Closure Round

The shared list command slot, document identity, semantic colors, procurement summaries, supplier identity, natural Item Code order, and role-gated Outlet Daily sent-state are converged around one operational convention. PR/PO and Stock Balance remove duplicate controls and explanatory noise; supplier-item mapping keeps Base UOM owned by Item Master. Local source is implemented, while authenticated viewport, linked migration, Production data, and Production footer verification remain separate gates.

### v8.64.101 (unreleased) — Visible PR Rejection Reason

Rejected purchase requests now surface the latest recorded rejection reason in the main workspace, with the rejecting actor and timestamp. The audit timeline remains the authoritative history; this prominent copy gives Kitchen and the requester an immediate correction path.

### v8.64.100 (unreleased) — Canonical UOM Selection

UOM values are canonicalized at the application boundary: `BTL` resolves to `BOTTLE`, and controlled choices include the operational `GUNI` unit. Guided PR-line repair uses a dropdown sourced from current item and supplier terms plus the shared UOM catalogue; free-text UOM entry is removed and options are alphabetically ordered.

### v8.64.99 (unreleased) — Unified Page Loading

All route-level loading boundaries use the shared PageLoadingState: one compact progress line, one spinner, and one status label. Route-specific copy remains contextual, while oversized skeleton bands and centered spinners are removed from the initial load state.

### v8.64.98 (unreleased) — Supplier UOM Receiving Conversion

Purchase requests and purchase orders retain the supplier's purchasing UOM (for example CTN, BAG, or TUB), while Goods Receiving accepts the configured Item Master base UOM (for example KG). The entered base quantity is converted back to the supplier UOM for document traceability, and the existing atomic posting path converts it into base-unit inventory using the approved supplier-item conversion. Missing conversions remain explicit blockers; the system never guesses packaging factors.

### v8.64.97 (unreleased) — Supplier Identity Relationship Consolidation

Duplicate supplier identities are consolidated at the data boundary: active supplier-item, branch, item, purchasing, and request references are repointed to one canonical active identity before duplicate rows are recoverably archived. Supplier Items search also accepts the operator-facing Item Group and internal AutoCount code.

### v8.64.96 (unreleased) — Active Supplier Identity View

Supplier registers default to active identities after recoverable duplicate merges. Inactive historical rows remain available through an explicit All statuses view, so operators see one usable supplier identity without losing audit history.

### v8.64.95 (unreleased) — Structured Brand Migration Compatibility Repair

The structured brand migration patches the Items workspace RPC by SQL shape rather than line-ending-specific source text, so linked projects with equivalent function definitions can apply the brand field safely. Remote migration and Production UAT remain separate gates.

### v8.64.94 (unreleased) — Supplier Merge Mapping Guard Repair

Duplicate supplier consolidation now respects the purchase-request branch/item/UOM mapping guard. Valid canonical mappings are repointed; unresolved lines are cleared with a recoverable line audit and an explicit repair remark instead of aborting the whole migration. Linked migration and Production data verification remain separate gates.

### v8.64.93 (unreleased) — Supplier Identity And Filter Apply Repair

Supplier-item identity reconciliation keeps the canonical AutoCount creditor code internal, exposes the operator-facing Item Group, and recoverably merges the legacy BWY placeholder and duplicate Quik supplier-item row. Shared list filters now keep Search as the primary command, expose a same-height Reset action, and allow a new filter selection to be submitted without first resetting. Local migration and contract evidence is complete; linked migration and Production UAT remain separate gates.

### v8.64.92 (unreleased) — Annotation Rerun Evidence Refresh

The full local authenticated current/historical/reopened annotation browser suite reran after the bounded inventory read repair: 18 of 18 scenarios passed. This is local evidence and does not change the linked Production deployment boundary.

### v8.64.91 (unreleased) — Bounded Inventory Read RLS Repair

The bounded Stock Card / Movement Ledger RPC keeps explicit branch authorization while avoiding duplicate per-row RLS evaluation under authenticated reads. This repairs the timeout path observed during the local Purchasing return workflow; linked Production evidence remains separate.

### v8.64.90 (unreleased) — Workflow Mutation Gate Repair

The disposable authenticated mutation gate now opens the rejection dialog before entering its required reason and asserts return/count movements by their exact target row. This repairs evidence collection only; it does not claim linked Production workflow verification.

### v8.64.89 (unreleased) — Supplier UOM Return Alias Repair

Forward migration 178 repairs the supplier-UOM purchase-return RPC where a PL/pgSQL `po_line` variable collided with a SQL JOIN alias. The patch is idempotent and changes no business arithmetic; it only makes the existing conversion lookup executable.

### v8.64.88 (unreleased) — AutoCount Mapping Identity Guard

AutoCount branch mappings now carry the per-item Main Supplier creditor code internally and retain Item Group only as the operator-facing display group. Items without an authoritative Main Supplier are blocked rather than inferred from a sibling row or group label.

### v8.64.87 (unreleased) — Bounded Stock Balance Image Hydration

Stock Balance now hydrates item images in bounded batches of 100 IDs, avoiding URI-too-long failures when a real page contains many distinct items. The image read remains optional and fail-closed; no balance value is synthesized from an image-read failure.

### v8.64.86 (unreleased) — Role Workflow Evidence Closure

The disposable local browser gate now covers the six scoped identities (Super Admin, Finance, Manager, Purchasing, Kitchen, and Outlet). Eight non-destructive workspace/filter scenarios passed; mutation scenarios remain explicitly skipped unless a named disposable fixture and mutation flag are supplied. This is local evidence only and does not prove Production role UAT.

## Product Overview

### v8.64.77 (unreleased) — Migration 176 Local SQL Validation

The local disposable Supabase database now executes migration 176 successfully. Rollback-only RPC fixtures confirm explicit Brand values survive Item creation and AutoCount Confirm; this remains local evidence and does not prove linked Production application.

### v8.64.78 (unreleased) — Supplier UOM Runtime Contract

The local posting path now has a rollback-only PO → GRN proof that supplier purchase UOM is converted to the item base unit and unit cost is divided by the same factor (2 CTN × 12 = 24 KG; RM120 ÷ 12 = RM10). Linked migration application and authenticated Production workflow UAT remain separate release gates.

### v8.64.79 (unreleased) — Authenticated Fixture Password Parsing

Local authenticated browser fixtures now preserve literal hash characters in test credentials, preventing false login failures during disposable UI/UAT runs. This changes test reliability only and does not claim Production authentication evidence.

### v8.64.80 (unreleased) — Production Deployment Audit

The observed Production login page still serves footer `v8.64.68`, while `codex/uiux-round2` is pushed through `v8.64.79`. Deployment and post-deploy authenticated regression remain blocked by the unavailable deployment project access.

### v8.64.81 (unreleased) — Supplier Mapping Data Audit

The local mirror audit found 38 active items without supplier-item identity and 233 active supplier-item records without a Central Kitchen branch mapping. Because the source does not prove the intended supplier/branch for those rows, the system keeps them as explicit data blockers rather than fabricating mappings.

### v8.64.82 (unreleased) — Central Kitchen Tally Evidence

The local mirror has no 19 Aug Stock Count for CK-ALMA or CK-PJS10; its latest posted counts are 17 Aug and 6 Aug respectively. The supplied PDFs cannot be declared tally-matched without the linked Production records.

### v8.64.83 (unreleased) — Historical Annotation Scope Reconciliation

All prior annotation groups remain in the single repair ledger: the 17-comment group, 34-comment group, 13-comment group, and reopened defects. Local contract/authenticated evidence is recorded separately from linked migration, Production data, and Production UAT; no historical item is treated as complete merely because a screenshot or local build passed.

### v8.64.84 (unreleased) — Supplier Mapping Fail-Closed Validation

AutoCount Preview now blocks Item Groups with no authoritative Main Supplier creditor code, reports each affected item/file/row, and tells the operator to repair the source export. Item Group remains a display label; it is never silently promoted into an internal supplier identity.

### v8.64.85 (unreleased) — AutoCount Confirm Identity Guard

The atomic Confirm RPC now rejects staged supplier groups that contain no authoritative AutoCount creditor reference, protecting direct or older ready jobs from bypassing the Preview validation.

### v8.64.76 (unreleased) — Cross-Viewport Control Rhythm

The shared control authority now keeps tablet and desktop filters, textboxes, selects, and right-rail actions at a 36px visual height. Phone controls retain the touch-safe height, and the ledger distinguishes visual geometry from authenticated viewport acceptance.

### v8.64.75 (unreleased) — Structured Brand Visibility

- Item brand is optional and source-backed. Migration 176 adds `brand_name` and carries it through Item Master, the workspace picker, and AutoCount Confirm.
- Existing rows stay blank until an authoritative Brand column or authorized edit supplies a value; linked Production application and authenticated UAT remain separate gates.

### v8.64.74 (unreleased) — Stock Take Evidence Reconciliation

- Central Kitchen stock-take evidence distinguishes local seed-code coverage from linked Production tally verification; missing local mirror codes are reported without changing master data.
- Product descriptions retain source brand tokens until an authoritative structured brand mapping is available.

### v8.64.73 (unreleased) — Supplier UOM Base Posting Closure

- Purchase documents retain supplier UOM; GRN and purchase-return inventory movements post converted base-unit quantity and base-unit cost, with missing conversions rejected explicitly.

### v8.64.72 (unreleased) — PR Index And Exception Semantic Closure

- Purchase Request Requested Items shows a stable row index and total count across desktop and compact layouts.
- Supplier/UOM and non-catalog issues use danger semantics consistently; retryable stock-unavailable reads remain warning states.

### v8.64.71 (unreleased) — Supplier Display Identity And Shared Filter Closure

- Supplier master data separates the internal AutoCount creditor code from the Item Group shown to operators; duplicate-name merges remain soft-retirable and auditable.
- Purchase Request review reports the number of requested items and gives supplier/UOM mapping errors a direct explanation and repair action.
- Shared list surfaces keep desktop controls at 36px while preserving the tablet touch-first decision until the explicit 36px-versus-44px recommendation is accepted.

Repository migration authority: migrations reviewed through `194`; this is not evidence that migrations 191–194 are applied to the linked Production project.

### v8.64.70 (unreleased) — Supplier Identity And PR Review Repair

- Exact duplicate live supplier names are consolidated through recoverable migration 173: commercial references move to one canonical supplier, overlapping supplier-item/branch mappings are retired rather than hard-deleted, and every merge stores both pre-merge records in an audit table.
- PR guided review accepts Supabase timestamps with explicit timezone offsets, keeps Quantity/UOM compact in the register, and uses a bounded 60rem desktop dialog.
- Dashboard low-stock exceptions use the critical red semantic token instead of an unrelated yellow warning treatment.

### v8.64.69 (unreleased) — AutoCount Identity Recovery

- A ready AutoCount job may restore an exact soft-deleted item identity when its code, name, and UOM match and an active supplier mapping still references that item.
- Ambiguous identities and non-exact matches remain blocked; the recovery never creates a second item ID or inventory movement.
- Production Confirm failures retain their exact PostgreSQL evidence in the repair ledger rather than being treated as successful staging.

### v8.64.68 (unreleased) — Remote Annotation UAT Recovery

- Playwright environment parsing preserves `#` inside unquoted credentials while still accepting whitespace-delimited inline comments.
- Linked Supabase migration evidence is collected with a compatible CLI and remains separate from authenticated workflow evidence.
- Migration 171 is applied only after a linked-project check and dry-run prove it is the sole pending migration.

### v8.64.67 (unreleased) — Historical Annotation Closure

- Historical annotation groups are reconciled against the single repair ledger instead of being treated as screenshot-only completion claims.
- Stock Balance groups Available/Reserved and Average Cost/Value into compact decision fields; Stock Count keeps SC number and submitter together.
- Outlet Daily clears obsolete wastage reason and remarks when wastage returns to zero, and Supplier lifecycle actions are hidden when update permission is absent.
- Local implementation and test evidence remains distinct from linked-migration and Production verification.

### v8.64.66 (unreleased) — Annotation Workflow Closure

- Workspace notification counts return to the red unread badge; workflow-state colors remain owned by Manager, Purchasing, and Finance status presentation.
- AutoCount actions, errors, and status share the right rail at portrait tablet and wider layouts, while the import directory and guided PR repair use the canonical panel/dialog geometry.
- Desktop and tablet controls use the 36px visual-density token; phone retains its touch-first control contract. PR and PO setup sections use one stable header language without an unexplained disclosure affordance.
- Source and local test evidence is not production verification. Authenticated four-viewport, role workflow, linked migration, AutoCount confirmation, and production regression gates remain separately recorded in the annotation ledger.
- AutoCount Confirm now creates a missing supplier-item relationship before branch mapping and validates the branch only in the branch-mapping phase (migration 171); the authenticated disposable local mirror passed actionable validation, Preview, and one atomic Confirm with zero inventory movements.

The current released application baseline is `v8.64.55` — Bounded Reads And Explicit Receipt Provenance.

### v8.64.65 (unreleased) — Shared Responsive Closure

- Shared list query geometry now derives tablet tracks from the actual secondary filters and command group, preventing blank tracks and inconsistent search/filter widths across list pages.
- Split workspaces keep the action/context rail visible on portrait tablets when the route declares the medium tablet rail contract; Production Jobs now uses the same shared filter contract as the other registers.
- Shared data tables expose a stable UI marker and use a 10px compact header token so sortable and native table headers follow one density rule.
- Local typecheck, strict typecheck, lint, contract tests, and build evidence are required before promotion; this section is not production-release evidence.

### v8.64.61 (unreleased) — UI Annotation Closure

- The authenticated route matrix now covers the core operational workspaces at 390px phone, 820px portrait tablet, 1180px landscape tablet, and 1440px desktop without page overflow, clipped controls, vertical text collapse, or filter-action drift.
- Recipe and purchase-order line entry share the same top-and-bottom add-row affordance, while workflow dashboards use semantic status badges instead of repeated plain-text state labels.
- Browser verification distinguishes the sandbox-blocked company-logo CDN from application runtime failures; the shell keeps its local brand fallback.

### v8.64.60 (unreleased) — Responsive Workspace And Form Closure

- Outlet wastage trends now use the available canvas at tablet widths and retain a legible chart height before splitting into the desktop chart/table composition.
- Portrait tablet master-data workspaces keep their action and summary rail visible; branch selection remains a leading control instead of a detached trailing checkbox.
- Purchase-order setup is one collapsible surface with all order context visible, and long line-entry workflows provide the same add-line action at the bottom.
- The application top bar remains sticky across tablet and desktop workspaces, and Daily Record actions present one role-appropriate completion action plus Save Draft.

### v8.64.59 (unreleased) — PR Register Interaction Closure

- Purchase Request selection, action, and request identity are separate semantic columns inside one seamless pinned lead band, keeping checkboxes and edit links operable while aligning the Request heading with its document number.
- Request, Schedule, and Status use the existing server-backed sorting contract, and shared select filters always render their selected/default label after hydration.

### v8.64.58 (unreleased) — Compact Operational Table Geometry

- Shared technical tables use a compact, accessible icon-only Action column and matching sticky offsets, removing the empty gutter between actions and business identity.
- Outlet Daily Records uses content-proportional widths for date, outlet, status, quantities, submitter, and update time instead of a 74rem fixed canvas.
- This remains local implementation evidence until authenticated viewport review and deployment are completed.

### v8.64.56 (unreleased) — P0 Workflow, Supplier Resolution, And Release Evidence

- Purchase Request Manager, Purchasing, and Finance transitions now require the exact owning workflow role in the server action and are backed by migration 157; `super_admin` remains the documented break-glass role.
- The annotated P0 responsive issues are closed in the shared layout authority: duplicate Dashboard rails are removed, tablet filters retain the two-row grammar, wide production lists expand, document forms use one workflow surface, and high-density outlet/AP/wastage panels are compact without losing the accessible data alternative.
- Common procurement UOM choices are available at request-line entry while supplier/item conversion remains a receiving/master-data responsibility.
- Local release evidence for this forward contract: 751/751 contract tests, lint, production build, 7/7 six-role Dashboard viewport tests, and 5/5 focused P0 browser tests. This section is not production-release evidence until migration 157 and the application are separately promoted and reverified.
- Purchase Request detail resolves supplier presentation from the historical line snapshot first, then item-master and branch supplier mappings, so legacy lines no longer appear falsely unassigned while preserving the original audit record.
- Purchase Request to Purchase Order conversion now generates the required purchase-order idempotency key and keeps supplier-split ordering aligned with the supplier master schema (migrations 164–165).
- Legacy PR lines are resolved only when branch + item + UOM identify one supplier (or one preferred mapping); ambiguous lines remain explicitly blocked for Purchasing review (migration 166).

### v8.64.55 — Bounded Reads And Explicit Receipt Provenance

- Stock Card and Movement Ledger opening balances use the bounded daily inventory summary instead of an unbounded historical transaction scan. Both the RPC and base-table fallback fail closed when the bounded read cannot be proven complete.
- Outlet Daily stores receipt provenance explicitly, preserving a deliberate operator-entered `0` while keeping legacy or missing receipt data visibly unavailable.
- Shared list controls keep one responsive geometry authority across desktop and touch-tablet layouts.

### v8.64.54 — Fail-Closed Reads And Shared UI Closure

- All primary report and operational read paths now distinguish verified empty data from missing or incomplete payloads; unverified reads show an explicit unavailable/retry state and never a trusted `0`.
- Shared list filters use one responsive geometry authority across desktop and touch-tablet layouts, preventing recurring three-row, mismatched-width, and overlay conflicts.
- Demand Trend keeps daily data visible beside the chart and marks no-line/incomplete coverage unavailable rather than presenting false metrics.

### v8.64.53 — Dashboard Trust And Report Preview Closure

- Dashboard metrics keep unavailable secondary reads unavailable instead of presenting a false zero.
- Demand Trend keeps its daily data visible beside the chart, while the shared line chart uses a calmer visual weight.

### v8.64.52 — Centralized Fail-closed Query Boundaries

- Primary operational reads now share one row/count boundary policy: a valid empty array remains empty, while a missing Supabase payload is unavailable and retryable.
- Outlet Daily, production, recipe, stock-operation, product, and purchase-return reads no longer silently turn missing payloads into empty data.

### v8.64.51 — Fail-closed Operational Reads

- Procurement and goods-receiving list/detail/summary reads now reject missing or incomplete payloads instead of converting them into empty rows or verified zero totals.
- Supplier, item, branch, and shared mapping option reads now fail closed when Supabase returns no payload, preserving an explicit retry/unavailable state.
- Inventory stock-balance base reads now reject null payloads so downstream screens cannot render a false empty balance.
- Added contract coverage for the operational read boundaries and kept the established empty-state behavior for valid empty datasets.

### v8.64.50 — Fail-closed Dashboard Fallbacks

- Dashboard fallback counts now distinguish a valid zero from a missing head-count or row payload. Incomplete reads preserve an explicit unavailable domain state instead of producing a trusted zero or empty queue.
- The bounded low-stock attention read no longer treats a null payload as zero; it falls back only to a verified core snapshot.

### v8.64.49 — Fail-closed Stock Count Reads

- Stock Count list, summary, detail, seed-line, and variance reads now distinguish a valid empty result from an incomplete payload. Missing payloads fail closed instead of becoming zero counts, empty lines, or a verified empty insight.
- The previous inventory/outlet fail-closed boundaries remain in force; this release closes the same trust boundary for Stock Count workflows.

### v8.64.48 — Fail-closed Inventory And Outlet Reads

- Inventory RPCs and bounded fallbacks now distinguish a valid empty result from a missing payload. Null reads fail closed instead of becoming verified zero totals, empty lists, or misleading record counts.
- Outlet Daily Records applies the same boundary to list, summary, trend, completion-matrix, and detail hydration reads.
- Tablet list query geometry is restored to the established shared control grid; no route-specific three-row override is retained.

### v8.64.47 — Fail-closed Unverified Receipt Inputs

- Outlet daily detail forms no longer render a persisted database-default receipt `0` when receipt provenance is unverified. The field stays blank with a `Not verified` placeholder until an authorised user confirms a value, including an intentional zero.

### v8.64.46 — Hide Mobile Chrome on Editable Focus

- Mobile navigation and fixed action chrome now hide as soon as an editable control receives focus, covering browser modes where the on-screen keyboard overlays without resizing `visualViewport`.

### v8.64.45 — Standardize Quantity Stepper Density

- Quantity steppers now expose one semantic density contract (`touch`, `compact`, or `dense`) from the shared component. Low Stock and Stock Balance no longer override descendant button/input geometry at individual call sites.

### v8.64.44 — Centralize Tablet Rail Geometry

- WorkspaceGrid now exposes semantic tablet rail attributes; responsive rail geometry is owned by the canonical design-system CSS instead of competing runtime utility classes.
- Compact and half-width tablet rails are explicit contracts, so the same breakpoint behaves consistently across document routes.

### v8.64.43 — Close Query Card Style Authority

- Canonical query cards now have one geometry owner; legacy v2 filter compatibility rules explicitly exclude them.
- Added a CSS authority contract so broad filter rules cannot silently reintroduce duplicate sizing, radius, or spacing.

### v8.64.42 — Converge Report Interaction Scaling

- Shared ranking previews keep their interaction boundary at the chart surface, so moving from a row into its drill-through action does not clear the selected preview.
- Shared line charts use non-scaling SVG strokes, keeping gridlines, series, and selected points visually consistent across desktop, tablet, and phone widths.

### v8.64.41 — Stabilize Touch Tablet First Paint

- iPadOS Safari and Chrome mark the touch-tablet shell before first paint,
  preserving the established desktop geometry while preventing a stale desktop
  shell from surviving hydration.

### v8.64.40 — Lock Two-Row Tablet Query Layout

- Tablet list query cards use one stable two-row layout across Items, Purchase Requests, Stock Balance, Suppliers, and other shared-list routes.
- Search and sibling filters share equal tracks; the record count stays on the same second row instead of creating an accidental third row.

### v8.64.39 — Converge Tablet Query Tracks

- Shared list query cards derive their tablet track count from the controls
  they actually render, so filters and Search fill the row without overlap or
  a phantom empty column.
- The change is scoped to query-card layout and does not alter workspace canvas
  width or tablet shell selection.

### v8.64.38 — Restore Established Workspace Geometry

- Desktop workspaces retain their established list/document width intent; a
  shared wrapper does not globally shrink unrelated routes.
- iPad shell selection returns to the existing runtime authority instead of a
  competing coarse-pointer CSS override that also rewrites overflow and
  navigation behavior.

### v8.64.37 — Canonical List Action Order

- Shared list query surfaces place the primary Search or Reset action before
  the result count, matching the established Stock Balance interaction pattern.
- The ordering is owned once by `UnifiedListHeader` and covered by both source
  contracts and authenticated four-viewport browser verification.

### v8.64.36 — Unified Console Actions

- Items, Products, and Suppliers declare desktop rail actions and the mobile
  create affordance through one permission-aware shared action component.
- Primary action metadata is stable before and after component resolution, so
  the phone FAB does not disappear when page markup is consolidated.

### v8.64.35 — Compact Report Ranking Previews

- Shared report ranking previews keep the selected value and drill-through
  action beside the supporting detail instead of growing a third mobile row.
- The fixed preview slot, complete label, 44px touch action, and keyboard
  interaction remain identical across every report that uses the ranking.

### v8.64.34 — Stable Report Ranking Previews

- Report ranking previews use one persistent master-detail region instead of
  inserting detail beneath the active row and moving the remaining ranking.
- Hover, touch, and keyboard selection update the same reserved preview surface,
  preserving row positions and accessible drill-through actions.
- The idle instruction occupies the same preview geometry as selected content,
  preventing report layout shift while users compare ranked records.

### v8.64.32 — Reachable Inventory Chart Actions

- Inventory Daily Movement now uses the shared preview-selection authority instead of maintaining a separate touch/focus state machine.
- Keyboard focus can move from the movement chart into `Open inbound` and `Open outbound` without unmounting the selected-date preview.
- The idle preview remains visibly instructional on phone instead of relying on a hidden placeholder contract.

### v8.64.31 — Shared Preview Selection Authority

- Ranking, AP Aging, and Production Variance previews now share one interaction authority for hover, committed touch/click/focus selection, Escape, and boundary blur behavior.
- Preview drill-through actions remain mounted while pointer or keyboard focus moves from a chart option into its preview region.
- Contract coverage prevents report components from reintroducing independent event-handler variants.

### v8.64.30 — Keyboard-Safe Aging Preview

- AP Aging keeps the selected bucket preview mounted while keyboard focus moves from a bucket into its `Open filtered invoices` action.
- Focus leaving the complete distribution workspace dismisses transient keyboard previews; pointer, touch, click, and Escape behavior remain unchanged.
- The interaction boundary is owned once by the preview workspace instead of competing button-level blur rules.

### v8.64.29 — Inline Report Ranking Previews

- Shared ranking charts reveal exact values directly beneath the selected row. Hover, touch, and keyboard users no longer have to look at the bottom of a six-row ranking for the associated detail.
- An idle ranking keeps a short discovery prompt but reserves no empty preview panel, reducing repeated vertical waste on phone report pages.
- Report directory category and icon surfaces use the canonical panel and control radius tokens; page-specific 2px corner exceptions are not allowed.
- Application version authority remains synchronized across `package.json`, the root `package-lock.json` entry, and `src/lib/app-version.ts`.

### Current audit baseline

The current released application baseline is `v8.64.47 — Fail-closed Unverified Receipt Inputs`.

Item Master lookup now has one authoritative token-matching combobox shared by
Kitchen PR entry and Purchasing Review. Users may search using partial words
they remember; Purchasing does not have to scan a long native select to match a
preserved non-catalog line.

Purchase Request lines now preserve business intent before catalogue and
supplier resolution. A line with description, quantity, and UOM is saved
atomically even when Item Master has no match. Purchasing matches non-catalog
lines during Purchasing Review; supplier completeness becomes a review gate,
not a destructive entry gate. Original input remains auditable after matching.

Supplier purchasing setup has two explicit layers: the supplier catalogue item
and the branches allowed to buy it. An authorised user can create both from one
form, launched contextually from either the Item or Supplier record. Spreadsheet
import remains a bulk-maintenance option, never the only operational path.

Purchase Request entry must never interpret incomplete catalogue resolution as
permission to discard a line. Item lookup uses token matching across item code
and name; a started line missing description, positive quantity, or UOM rejects
the whole save with its line number instead of partially creating a misleading
document. Catalogue and supplier matches may follow without erasing intent.

The canonical design layer permits one owner for a selector inside each media
scope. A source-level AST contract rejects repeated same-scope selectors before
they can reintroduce order-dependent list, filter, action, or radius behavior.

Stock Count uses one responsive line-entry authority. Phone cards foreground
the index, full item identity, variance, UOM, and count control without a
repeated starting-balance sentence. Wider list headers remain in normal flow;
they never rely on a guessed shell offset that can cover the first item.

The seven-day outlet completion matrix fills its containing canvas, preserves a
fully opaque frozen outlet column during horizontal scroll, and adds no empty
preview row until an operator hovers, focuses, or taps a specific outlet-day.

Purchase request lines keep the stacked touch layout through tablet portrait
and landscape widths; the dense single-row editor begins only at laptop width.
Laptop quantity controls receive a stable 10rem track so four-digit values do
not collapse behind the stepper buttons, while item and UOM tracks stay bounded.

Workspace pages preserve the established document/list width intents rather
than accepting a global desktop maximum width. Tablet shell selection remains
owned by the existing runtime marker; no coarse-pointer CSS fallback may also
rewrite navigation and overflow behavior.

Historical release context: `v8.64.6 — Reliable Outlet Daily Reads`; earlier context: `v8.64.5 — Verified Receiving Provenance`, `v8.64.4 — Stable Report Preview Surfaces`, and `v8.63.0 — Fail-Closed Goods Receiving Joins`.

The lines below are retained as historical release context; the current authority is the v8.64.39 release declaration above.
The repository migration history currently runs through migration `166`. Release
version authority lives in `src/lib/app-version.ts`; migration authority lives in
the immutable, forward-only `supabase/migrations/` directory. Documentation must
not claim a later release or database ceiling unless both authorities support it.
Deep operational green is the ordinary primary action color;
mobile controls keep a minimum 48px touch target. User-visible dates use
`dd/mm/yyyy`, while native date inputs continue to submit ISO date-only values.
Read failures must remain visibly unavailable rather than being presented as a
misleading zero or empty-success state. Save and confirm/post actions remain
separate, and retrying a committed inventory action must not create a second
movement.

Seri Bako Operations Management System (OMS) is an internal operations platform for managing Seri Bako's daily procurement, inventory, goods receiving, production, approval, staff access, and operational records.

The system is designed to replace fragmented workflows across spreadsheets, paper forms, WhatsApp messages, and disconnected records with a single operational source of truth.

Seri Bako OMS is not intended to be a full accounting ERP or a public-facing SaaS platform. Its primary purpose is to help internal teams complete routine operational work quickly, clearly, and consistently.

## Product Goals

Seri Bako OMS should:

- Reduce repeated manual data entry.
- Reduce dependency on spreadsheets, paper records, and WhatsApp follow-ups.
- Make document ownership, status, and next actions visible.
- Improve inventory accuracy across branches, outlets, stores, and production operations.
- Standardize procurement, receiving, stock, and production workflows.
- Provide clear audit history for operational records.
- Keep frontline and administrative workflows simple and fast.
- Support role-based and permission-based access without adding unnecessary complexity.
- Prioritize a complete working operational flow before secondary polish or edge-case handling.

## Product Principles

### 1. Operational clarity over feature volume

Every page must help the user understand:

- What record or task they are viewing.
- What status it is currently in.
- What action is required next.
- Who is responsible.
- What supporting records, comments, and attachments exist.

Features that do not improve daily operational clarity should not be prioritized over core workflows.

### 2. Fewer steps

Common tasks should require as few screens, clicks, and repeated inputs as reasonably possible.

The system should avoid:

- Re-entering information already available from an upstream record.
- Repeated navigation between related documents.
- Unnecessary confirmation steps.
- Duplicate loading of the same operational information.
- Splitting one simple task across too many pages.

### 3. Ledger-based operational records

Stock, workflow, and document history should be traceable.

Important balances and statuses must be derived from controlled records rather than edited directly without history.

### 4. Reusable system patterns

Pages and workflows must reuse the established app shell, page skeletons, interaction patterns, and shared components defined in `DESIGN.md`.

New modules should not invent unrelated layouts, button systems, status styles, or workflow patterns.

### 5. MVP-first delivery

Core end-to-end workflows take priority over:

- Deep edge-case handling.
- Exhaustive diagnostics.
- Decorative UI polish.
- Advanced automation.
- Non-critical error messaging.
- Premature architectural complexity.

Known non-critical limitations should be documented briefly and deferred to focused cleanup sprints.

## Fixed System Roles

Seri Bako OMS has exactly six system-controlled roles. They are reviewed in the owner-only Roles & Permissions overview and cannot be created, renamed, or edited through normal UI.

- **Super Admin / Owner (`super_admin`)**: protected owner controls, company setup, staff assignments, system numbering, backups, and full operational authority.
- **Finance (`finance`)**: company-wide finance review plus staff, numbering, imports, and branch administration; protected Owner and backup controls remain unavailable.
- **Manager (`manager`)**: company-wide operational visibility and Manager Review across all Outlets and Central Kitchens, plus branch maintenance. Branch assignment supplies default context and autofill only.
- **Purchasing (`purchasing`)**: company-wide purchasing, supplier, item/master-data, import, PO, and sourcing-review duties.
- **Kitchen (`kitchen`)**: assigned Central Kitchen workflows, including purchase-request creation/submission and production operations.
- **Outlet Staff (`outlet_staff`)**: assigned-outlet daily records only.

Role determines allowed actions. The default Branch / Outlet controls initial context and autofill but is not an authorization boundary. Super Admin, Finance, Manager, and Purchasing have company-wide operational visibility. Kitchen and Outlet Staff remain strictly limited to assigned branches.

## Current Product Scope

The system currently covers or is actively implementing the following operational areas.

### Core Platform

- Supabase authentication.
- Login, password setup, password reset, and first-password change flows.
- User profiles.
- Staff onboarding through invitation or temporary-password setup.
- Roles and permissions.
- Permission-aware navigation and actions.
- Database row-level security.
- Shared application shell.
- Shared document and record workspace patterns.
- Comments, attachments, timeline, and activity history where implemented.

### Master Data

- Supplier Master.
- Item Master.
- Company Profile.
- User and staff records.
- Roles and permissions.

### Procurement

- Purchase Requests.
- Purchase Orders.
- Supplier-linked purchasing records.
- Approval and workflow actions where implemented.

### Inventory

- Stock Transactions.
- Movement Ledger.
- Stock Balance.
- Low Stock monitoring.
- Stock Count.
- Stock Adjustment and reconciliation flows where implemented.
- Inventory exports where permitted.
- Goods Receiving.
- Inventory movement generated by upstream operational documents where implemented.

### Production

- Production Jobs.
- Production input and output records.
- Production-related inventory movement where implemented.

### Operational Visibility

- Dashboard.
- Module summaries.
- Operational status indicators.
- Workflow history.
- Record timelines.
- Comments and attachments.
- Permission-controlled exports.

## Module Maturity

Module maturity must be understood separately from visual completion.

Repository migrations reviewed through `173`; release authority is
`v8.64.55 — Bounded Reads And Explicit Receipt Provenance`.

Current integration baseline: `v8.64.55 — Bounded Reads And Explicit Receipt Provenance`, with repository migrations reviewed through `169`. The local P0 patch is the unreleased `v8.64.56` forward contract and must not be treated as Production application evidence. Migrations `111` and `112` remain immutable history because they were applied to the linked database accidentally. Migration `113` removes their callable Central Kitchen PR RPC, prevents further access to the stock-holds table, and preserves that table temporarily for a non-destructive data audit. Later forward-only migrations add bounded inventory and Dashboard read models, repair grants and scoped access, introduce branch supply-route and received-quantity provenance, preserve unmatched PR entry as auditable non-catalog lines, split approved purchase requests atomically by supplier, make Item Master the authority for supplier-item identity, bound historical inventory opening reads, preserve explicit outlet receipt zeros, remove leaked PR approval grants from non-owning workflow roles, allow item-master suppliers as a controlled PR fallback, deterministically backfill supplier identities from unique stock-take category matches, repair supplier split ordering, satisfy purchase-order idempotency invariants, resolve deterministic legacy PR supplier snapshots, anchor outlet daily validation to the affected product line, create an item master with optional supplier/branch sourcing atomically, and stage one tenant-scoped AutoCount multi-file job before a single atomic master-data confirmation; they do not restore the retired Central Kitchen PR workflow or make AutoCount quantity authoritative over OMS stock.

A page may exist visually without its full workflow, validation, database integration, permissions, and downstream effects being complete.

### Operational

These modules are expected to support their primary working flow:

- Authentication and profile access.
- Supplier Master.
- Item Master.
- Stock Balance.
- Movement Ledger / Stock Transactions.
- Purchase Requests.
- Purchase Orders.
- Goods Receiving.
- Purchase Returns.
- Supplier Invoices.
- Stock Counts, Transfers, and Wastage.
- Outlet Daily Records for Central Kitchen quantities sent, Outlet Staff quantities received, wastage, and manager review.
- Products, Recipes / BOM, and Production Jobs.
- Company, Branch / Outlet, staff, and role administration.
- Private document attachments and activity history.
- Roles and permissions.

### MVP or In Progress

These modules may have working core flows while secondary cases remain incomplete:

- Dashboard.
- Pilot data onboarding and reconciliation.
- Export tools.
- Advanced stock reconciliation.
- Cross-module automation.

### Planned or Future Scope

The following areas are not considered complete unless later documentation explicitly states otherwise:

- Advanced accounts-payable forecasting and scheduled payment-alert delivery.
- Finance and general ledger.
- Full general-ledger accounting.
- Advanced business intelligence.
- Predictive demand and cash-flow forecasting.
- Automated replenishment.
- Full accounting reconciliation.

## Core Workflows

### Purchase Request to Purchase Order

The intended procurement flow is:

1. A user creates a purchase request.
2. The request is reviewed according to permissions and workflow rules.
3. An approved request may be converted or linked to a purchase order.
4. The purchase order becomes the formal purchasing record.
5. Receiving activity is recorded against the relevant purchase order where applicable.
6. Inventory is updated through controlled receiving or stock records.

Upstream information should be reused rather than re-entered manually.

### Goods Receiving

Goods receiving should:

- Reference the relevant supplier and purchasing document where available.
- Record actual received quantities.
- Preserve discrepancies rather than silently overwrite ordered quantities.
- Support attachments or evidence where implemented.
- Generate controlled inventory movement only after the receiving action reaches the required valid status.

### Supplier Invoice and Payment

The operational payables flow is `PO -> posted GRN -> supplier invoice -> partial/full payment`.

- Finance and Owner users create draft invoices from uninvoiced quantities on same-company posted GRNs for one supplier.
- Invoice lines preserve PO ordered quantity, received quantity, previously invoiced quantity, PO price, invoice price, and variance.
- Draft totals are calculated server-side and lock when the invoice is approved/open.
- Payments are atomic, idempotent, company-scoped, and move invoices through Open, Partially Paid, and Paid.
- Voiding requires permission and a reason; invoices with payment history cannot be silently voided.
- Invoice and payment actions never create inventory movement.
- AP Aging, live Payment Due Alerts, and the Cash Flow Forecast report current MYR exposure from Open and Partially Paid invoices. Missing due dates remain visible; bank cash-flow forecasting, General Ledger, bank reconciliation, Accounts Receivable, payment reversal, and scheduled alert delivery remain future scope.

### AP Aging

AP Aging uses the company-scoped database report from migration `061`. Outstanding is invoice total minus recorded payments, never below zero. Buckets are Not Due, Due Today, 1–30, 31–60, 61–90, 90+ Days Overdue, and Missing Due Date. The report uses the company timezone when available; the current schema has no company timezone field, so it falls back to `Asia/Kuala_Lumpur`. Users with Supplier Invoice view permission may view and export the same filtered dataset; reporting does not mutate invoices, payments, or inventory.

### Payment Due Alerts

Migration `062` extends the AP Aging RPC with a live, read-only attention summary. Priority is Missing Due Date, 91+ Days Overdue, 31–90 Days Overdue, 1–30 Days Overdue, Due Today, then Due within the next seven days. Within each group, higher outstanding balance comes first, followed by earlier due date. The same `supplier_invoice.view`, company isolation, MYR, and `Asia/Kuala_Lumpur` fallback rules apply. Alerts appear on the dashboard and invoice/AP Aging views; there is no email, SMS, push, Cron, read state, snooze state, or scheduled notification delivery.

### Cash Flow Forecast

The read-only Cash Flow Forecast reuses the complete AP Aging result rather than create another payable-balance calculation. It groups open positive balances into 7-day, 14-day, 30-day, and current-month views; overdue balances and missing due dates remain separate. Top-supplier totals and invoice drill-through use the same report date, payment deductions, company isolation, permission check, MYR currency, and `Asia/Kuala_Lumpur` fallback as AP Aging. It forecasts supplier payable pressure only: no bank balance, receipts, GL, payment automation, notification, or inventory mutation is implied.

### Stock Count and Reconciliation

Stock counts should:

- Use one canonical lifecycle only: `Draft → Confirm & Post`. There are no submit, review, or approval states in this workflow.
- Autosave edits locally and to the server Draft so refresh, idle timeout, temporary network failure, or recoverable application errors do not discard a user's completed work.
- Save the latest visible form values before `Confirm & Post`; a failed save must leave the record in Draft and must never partially post it.
- Be completed by each Branch / Outlet at the end of the operating day as the practical inventory truth for the next day.
- Record counted quantities separately from the ledger balance and show the variance.
- Require an explicit reconciliation or adjustment action.
- Preserve the original count and resulting adjustment record.
- Avoid direct editing of the stock balance.
- Drive low-stock alerts and purchase-request suggestions from the reconciled Branch balance.
- Allow a Branch to submit a purchase request on any day; Sunday is the normal weekly consolidation cadence, not a system restriction.

### Production

Production records are an optional operational and costing workflow during the MVP. They must not be required for inventory, stock count, goods receiving, wastage, transfer, or purchase-request operation.

When the kitchen is ready to record batches, production records should:

- Identify the production job.
- Record relevant input and output quantities.
- Preserve operational status and history.
- Generate controlled inventory movement for consumed inputs and completed outputs where implemented and explicitly posted.
- Avoid direct balance editing.

## Inventory Rules

Current stock is derived from controlled inventory movement records and reconciled against the latest approved Branch stock count. The latest approved physical count is the operational truth when kitchen production activity is not recorded daily.

No page should directly overwrite stock balance as a normal business action.

Inventory changes may be generated by:

- Goods receiving.
- Stock transfer.
- Stock adjustment.
- Stock count reconciliation.
- Production material consumption, when production is explicitly recorded.
- Production output, when production is explicitly recorded.
- Wastage.
- Returns.
- Other approved inventory movement types.

Corrections must be posted as a new stock movement or adjustment record so the audit history remains intact.

Calculated stock views must not become independent sources of truth.

### Outlet Daily Receiving and Wastage

Outlet Daily Records capture product Qty Sent, Received, Wastage, Wastage Reason, and Remarks by branch and date. Central Kitchen controls Qty Sent; Outlet Staff confirms Received and records Wastage; neither role can overwrite the other role's fields. The established Draft, Morning Recorded, Evening Completed, Reviewed, and Void database states remain compatible while the interface uses concise daily language. Reviewed records are locked; voiding requires permission and a reason. Assigned-branch scope remains authoritative. Outlet Daily Records remain data capture only: they do not post stock movements, change production jobs, forecast demand, or create BI metrics.

### Demand Trend Lite

Demand Trend Lite reports only Outlet Daily Records in Evening Completed or Reviewed state. It estimates movement as received minus leftover and wastage, never below zero, and shows coverage separately because missing or incomplete outlet-days do not represent zero demand. Sprint 7.13.1 labels coverage confidence and low-sample products without changing those totals. It is not POS sales, a production suggestion, or a forecasting engine, and it does not write inventory or production data.

### Production Planning Lite

Production Planning Lite turns the same reliable Demand Trend movement into a cautious planning reference. It applies visible target days, buffer, and rounding values, and marks low-confidence or low-sample products for manual review. HQ/kitchen must check incomplete outlet data; it does not create production jobs, post inventory, or forecast automatically.

### Production vs Outlet Demand Variance

Production vs Outlet Demand Variance compares received quantities, estimated movement, leftovers, and wastage from reliable Outlet Daily Records by product and outlet. It uses conservative over-/under-supply signals and inherits demand coverage confidence; it does not compare production jobs until a reliable posted-output join is available, and it performs no writes.

Its overview compares classified product-outlet row counts around a shared zero baseline. It never compares raw quantities across products or unlike UOMs. Every signal supports pointer, touch, and keyboard preview and opens the equivalent filtered detail list; the list remains the source-detail authority.

### Operations Control Center Lite

The Dashboard composes existing outlet health, demand confidence, variance, planning, inventory, and payable summaries. Each outlet/demand section can be unavailable without blanking the rest of the Dashboard. It is read-only; planning values remain references rather than production orders.

### Master Data Cleanup Lite

Master Data Cleanup Lite is a read-only checklist for duplicate or variant codes, missing core fields, and inactive referenced master records. It links to existing master pages for human review; it does not merge, delete, or modify any record.

### Costing Readiness Lite

Costing Readiness Lite is a read-only checklist for item costs, supplier prices, recipe ingredients, and product-to-recipe coverage. It identifies data gaps before any future margin or costing work; fixes remain manual and it does not recalculate or write costs.

### Recipe Costing Lite

Recipe Costing Lite is a read-only estimate for recipes using the normalized Item Master base-UOM `cost`. It does not substitute supplier prices or recipe-line values when conversion is unclear, and it leaves missing costs visible rather than treating them as zero. It does not write recipe, product, inventory, production, or finance records; margin remains future scope.

Sprint 7.19.1 makes UOM mismatches, missing costs, output gaps, and manual corrective actions explicit without changing the estimate calculation.

### Product Cost & Margin Lite

Product Cost & Margin Lite is a read-only estimate. It only uses a High-confidence active recipe cost and one unambiguous active packaging price; missing recipe, cost, UOM alignment, or price blocks margin rather than becoming zero. Pricing remains manual and no product, cost, margin, inventory, production, or finance data is written.

Sprint 7.20.1 labels non-positive margin as Review, not an automated pricing decision, and makes the product and recipe review paths explicit.

## Roles and Permissions

Seri Bako OMS uses permission-based access.

Roles are collections of permissions. A role name alone must not be treated as the final authorization rule.

Access control may include:

- Navigation visibility.
- Page access.
- Record viewing.
- Record creation.
- Record editing.
- Workflow approval.
- Cancellation or rejection.
- Export access.
- Administrative actions.
- Branch / Outlet or organizational restrictions where implemented.

Front-end visibility is not a security boundary.

Sensitive actions must also be protected through:

- Server-side authorization.
- Server action checks.
- Database row-level security.
- Controlled service-role usage.

Legacy or alias permission codes may be supported for compatibility, but canonical permission definitions should remain stable and documented.

## Product UX Direction

All UI and interaction implementation must follow `DESIGN.md`.

At a product level, the experience must remain:

- Clear.
- Fast.
- Consistent.
- Operational.
- Low-friction.
- Easy to scan.
- Reusable.
- Suitable for repeated daily use.

The system should not introduce new page structures outside the approved page skeletons unless the product architecture is intentionally revised.

Workflow actions should appear in the correct page context rather than as unrelated global actions.

## Data and Audit Expectations

Important operational records should preserve:

- Creator.
- Created time.
- Last updated time.
- Status history.
- Workflow actions.
- Comments.
- Attachments.
- Related upstream and downstream records.
- Inventory or document effects.
- Relevant user identity.

Destructive changes should be avoided where an auditable status change or reversal record is more appropriate.

## Role-aware Dashboard and Capability Hierarchy

`/dashboard` is the default authenticated landing page for all six active roles. It is one server-composed workdesk, not six routes: each role receives only the actionable queues, metrics, alerts, and links supported by its effective permissions and RLS-visible scope.

- Super Admin / Owner has company-wide business, finance, and protected system capability.
- Finance is the second-highest company-wide role. It combines read-level Manager and Purchasing operational visibility with AP, invoice, cash-flow, and payment capability. Its PR authority begins at Finance Review; it does not receive Manager Review, owner controls, or Purchasing mutations and cannot approve its own PR.
- Manager and Purchasing are sibling company-wide operational roles: Manager performs Manager Review across the company; Purchasing runs procurement and master-data workflows.
- Kitchen is limited to assigned Central Kitchen work; Outlet Staff is limited to the assigned outlet and today’s daily-record tasks.

Manager, Purchasing, Kitchen, and Outlet dashboards must never expose AP Aging, Cash Flow, aggregate debt, payment controls, Finance-only recipe costing, or Owner controls. Kitchen and Outlet dashboards must not expose operational information outside assigned branches.

## Out of Scope

Unless explicitly implemented in a later sprint, Seri Bako OMS does not guarantee:

- Full statutory accounting.
- Payroll.
- Tax filing.
- Bank reconciliation.
- Enterprise manufacturing resource planning.
- Customer-facing ecommerce.
- Public ordering.
- Franchise billing.
- Full point-of-sale functionality.
- Replacement of all external finance or HR systems.

## Definition of Done

A module is not complete only because its page exists.

A module is considered operationally complete when its intended core workflow has:

- A working entry point.
- Real database integration.
- Required validation.
- Correct server-side authorization.
- Required database policy protection.
- Clear status behavior.
- Correct downstream effects.
- Loading, empty, success, and failure handling at an MVP-appropriate level.
- Responsive behavior appropriate to its users.
- Consistency with `DESIGN.md`.
- Basic end-to-end validation.
- Updated documentation where the product scope or operating rules changed.

## Related Documentation

- `README.md` — local development and repository overview.
- `DEPLOYMENT.md` — production deployment, environment, migration, and recovery procedures.
- `ARCHITECTURE.md` — application architecture, data rules, permissions, and technical boundaries.
- `DESIGN.md` — application shell, page skeletons, visual system, components, and interaction standards.
