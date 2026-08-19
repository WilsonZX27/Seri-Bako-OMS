# Seri Bako OMS — US$100k Productisation and Closure Plan

**Status:** decision baseline, not a claim of production completion  
**Date:** 2026-08-19 (Asia/Kuala_Lumpur)  
**Reviewed branch:** `codex/uiux-round2` at `5f08b8f`

## Executive decision

The product should be positioned as a trusted branch-operations decision system,
not as a larger collection of ERP pages. Its value is the closed loop from a
real exception to a measured operational outcome:

`low stock → purchase request → approval → purchase order → receiving → posted ledger → stock-count / wastage outcome`

Every visible number must have a source, scope, unit, freshness state, owner and
next action. Every validation failure must point to the field that can fix it.
This is the shortest path to a defensible US$100k internal asset and a credible
future multi-branch product.

## Evidence boundary (what is true now)

| Area | Evidence | State | Release meaning |
| --- | --- | --- | --- |
| TypeScript, lint, contract tests | strict typecheck PASS; lint PASS; contract 766/766 | Verified locally | Static quality gate is green |
| Build | 75/75 static pages | Verified locally | Build is healthy, not production proof |
| Responsive contract | `release-mobile-ux-7-5.spec.js` 7/7 | Verified locally | Shared phone/tablet/desktop contract is encoded |
| Role workspaces | role + release gate 8/8 | Verified in fixture | Authorization shell works for available fixtures |
| Admin navigation ownership | 2/2 | Verified locally | Shared right-rail cleanup race is covered |
| Inline daily validation | migration 167 + form contract | Local/linked evidence recorded | Error-to-field recovery path exists |
| Atomic item creation | migration 168 local PASS | Local only | Unified creation path exists; linked ceiling still unverified |
| Current Vercel revision | no current receipt for `5f08b8f` | Unverified | Do not call branch state production-ready |
| Linked migration ceiling | CLI login-role transport error | Unverified | Do not use `--include-all` to bypass the ceiling check |
| Full production matrix | 6 roles × 6 viewports | Not yet captured | Required before production promotion |

The older preview receipt in the closure addendum remains historical evidence for
the functional revision it names. It is intentionally not reused as proof that
`e266959` is deployed.

## Release gates before more feature scope

### Gate A — Trust and promotion

1. Capture a deployment receipt whose commit matches the reviewed branch.
2. Verify the linked Supabase migration ceiling on the same environment; resolve
   the login-role transport problem or obtain an approved, auditable alternative.
3. Run a disposable Manager Review fixture with a real manager identity. A test
   skip is valid fixture hygiene, not authorization proof.
4. Capture 390, 430, 820, 1024, 1440 and 2560 screenshots for Kitchen, Outlet,
   Purchasing, Manager, Finance and Owner. Record both allowed and denied actions.
5. Promote only after the receipt, migration ceiling and matrix are attached to
   the same release record.

### Gate B — Shared UI authority

Keep geometry in shared primitives. Pages provide semantics and data only.

- `UnifiedListHeader` owns search/filter/count geometry and tablet alignment.
- `RightConsole` owns desktop action ownership; tablet uses the bounded split rail;
  phone uses a single create/document action surface.
- Shared controls own height, typography, focus, error and label association.
- Do not repair one page with a one-off width or breakpoint override.
- Remove duplicate status, hero, alert, action and helper copy at the component
  authority, then verify every consumer.

### Gate C — User-helpful errors

For a validation failure, the UI must:

1. identify the affected line/field in the server response;
2. open the relevant disclosure if it is collapsed;
3. smooth-scroll it into view and focus the first invalid control;
4. apply a restrained error ring/border and render one short inline instruction;
5. keep the page state and entered values intact.

A toast may supplement this, but must never be the only recovery instruction.
The daily-record wastage path is the reference implementation.

## Product architecture decision: item creation

The user-facing creation path is one progressive-disclosure form:

1. **Identity:** item code, name, category, base/purchase UOM, cost and safety
   stock.
2. **Sourcing:** optional primary supplier and supplier item code, defaulted from
   known data when safe.
3. **Availability:** explicit active-branch selection and branch safety values.

The transaction remains atomic and tenant/permission scoped. Existing supplier
item and branch-mapping pages stay as correction and bulk-maintenance tools, not
as mandatory steps for first creation. Do not add another wizard, duplicate
master record, or hidden auto-mapping rule without a rollback test and a real-role
E2E proof.

## The monetizable decision loop

The first productised loop should answer one question: **what needs action now,
who owns it, what is the MYR exposure, and did the action work?**

| Signal | Required display | Outcome to measure |
| --- | --- | --- |
| Low stock | item, branch, current/threshold UOM-safe quantity, owner, create-PR action, freshness | signal-to-PR time; unresolved age |
| Pending PR | PR no., submitter, branch, supplier state, stage, approver, due/age | stage dwell; approval completion |
| Approved PO | supplier, promised/received quantity, MYR amount, due date, owner | PO-to-GRN conversion; fill rate |
| Receiving exception | PO/GRN, missing/over quantity, blocked posting reason | exception resolution time |
| Wastage | product, received, wastage, rate, reason, record status | complete-record coverage; wastage trend |
| Stock count variance | item, branch, signed variance, tolerance, source count | repeat-above-tolerance count |

Do not combine unlike UOM quantities into one “total stock” number. Show a
quantity only with its UOM, and use counts or MYR only where the source grain is
comparable.

## Decision metrics to instrument (after source authority exists)

These are product metrics, not decorative dashboard numbers. They must be added
to `docs/analytics/METRIC_DICTIONARY.md` with formula, grain, permission,
freshness, unavailable behavior and drill-through before implementation.

| Metric | Definition | Why it matters |
| --- | --- | --- |
| Action resolution time | first actionable event → terminal outcome, using audit timestamps | shows whether the system removes operational delay |
| PR-to-PO conversion | approved PRs with a linked PO ÷ approved PRs in scope | measures procurement follow-through |
| Receiving fulfilment | accepted received quantity ÷ ordered quantity, per item/UOM and period | exposes supplier/receiving gaps without mixing units |
| Daily-record coverage | completed or reviewed outlet-days ÷ expected permitted outlet-days | distinguishes missing work from a valid zero |
| Wastage rate | wastage ÷ received for complete/reviewed records only | turns wastage into a controllable signal |
| Count recurrence | above-tolerance posted count lines per item/branch | finds systemic master-data or process problems |
| Supplier mapping coverage | PR lines with an authoritative supplier mapping ÷ PR lines requiring sourcing | measures readiness without inventing supplier performance |
| UX escape rate | validation failures lacking a target field, focus or inline recovery | confirms that “error” no longer leaves users helpless |

No target, forecast, supplier score, days-of-stock or margin trend should ship
until its source population and confidence are approved.

## Phased execution

### Phase 0 — close the release (P0/P1)

- obtain current deployment and migration receipts;
- run the six-role × six-viewport matrix;
- fix only shared CSS/component authorities found by the matrix;
- finish inline validation for the remaining high-impact forms;
- update the closure addendum with evidence links and explicit unknowns.

**Exit:** no production claim without a matching receipt; no open P0; all P1s
have an owner, evidence and due decision.

### Phase 1 — make the loop measurable

- add source-owned timestamps/age to approval and receiving work;
- expose submitter, supplier state, owner and next action in list/detail views;
- add complete numeric alternatives and drill-through for charts;
- measure the seven decision metrics only where data is authoritative;
- add a small event/telemetry contract for inline validation recovery.

**Exit:** a manager can explain every exception and trace it to a terminal outcome.

### Phase 2 — productise the operating system

- tenant/branch onboarding checklist with data-readiness score;
- import validation and reversible correction workflow;
- saved role views and exports only after usage evidence;
- supplier performance and UOM conversion ledgers with effective dates,
  confidence and source drill-through;
- audit-ready release receipts and incident history.

**Exit:** a new branch can be onboarded predictably and the system can prove
operational improvement rather than merely display more metrics.

## Non-negotiable guardrails

- Never convert an unavailable query to zero.
- Never claim current production from a local build, branch, or old preview.
- Never bypass a migration ceiling with `--include-all` when linked scope is
  unknown.
- Never mix quantities across unlike UOMs.
- Never add page-specific CSS to compensate for a shared component defect.
- Never make an error actionable only through a toast.
- Never add another dashboard card when an existing card already owns the same
  decision.

## Definition of US$100k-worth closure

The project is worth that level when it can demonstrate, with receipts and
source-owned data, that branch teams complete procurement, receiving, stock
count and wastage work faster and with fewer unresolved exceptions; that each
role sees only its legitimate actions; and that management can drill from a
signal to the underlying record and outcome. Visual polish is the trust layer,
not the value proposition by itself.
