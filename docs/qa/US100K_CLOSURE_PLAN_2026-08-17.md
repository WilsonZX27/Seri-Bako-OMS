# Seri Bako OMS — US$100k Closure Plan and Evidence Ledger

**Audit date:** 2026-08-17 (Asia/Kuala_Lumpur)
**Current released baseline:** `v8.64.55`
**Local forward contract:** `v8.64.56` (unreleased)
**Scope:** stability, design, function, extensibility, data trust, decision usefulness, user friendliness, and release proof.

## Executive verdict

Seri Bako OMS is no longer an unstable MVP shell. Its strongest assets are tenant/role boundaries, database-owned transitions, bounded operational reads, explicit unavailable states, branch-aware workflows, and a shared phone/tablet/desktop grammar. The product is already credible as an internal operations system.

It is not yet a defensible US$100k product asset because the proof and decision layer are incomplete. The system often answers **how many** but still needs to answer **why, how urgent, who owns the next action, by when, and what value is at risk**. Production deployment evidence is also separate from local green tests and must remain separate.

The target is not to copy an enterprise ERP. It is to own a narrow, trustworthy operating loop for multi-branch food operations:

```text
immutable event → normalized, complete read model → decision signal → owner/action → measured outcome
```

## Evidence status

| Area | Verified in current worktree | Not yet proven | Release meaning |
| --- | --- | --- | --- |
| P0 annotated UI issues | 23 comments grouped and fixed in source; branch preview deployment succeeded | Custom production-domain rendering after promotion | Branch preview is ready; live custom-domain closure is pending |
| Role separation | UI + server action + migration 157 contract; remote ledger verified at 157 | Post-deploy role matrix on the promoted custom domain | Supabase target is updated; application promotion is still separate |
| Responsive behavior | 751/751 contracts; P0 browser 5/5; Dashboard six roles × 3 viewports 7/7 | Production browser matrix | Strong local evidence, not production proof |
| Build/runtime | ESLint, typecheck through production build, Next build pass | CI/host resource behavior and remote backend health | Release candidate is buildable |
| Data honesty | Fail-closed query boundaries, explicit unavailable states, metric dictionary | Source-owned freshness timestamps in most read models | Trust foundation is strong; observability still needs work |
| Decision layer | AP Aging, cash flow, demand, variance, costing readiness, and auditable low-stock next actions exist | Accepted/rejected/fulfilled replenishment outcomes, supplier SLA, target/comparison context | First decision loop is visible; outcome measurement is not yet proven |

## Deployment receipt (2026-08-17)

- Reviewed application commits pushed to `origin/codex/uiux-round2`: `fd1695f`, then `ac1319d` for the auditable replenishment decision loop.
- Supabase project `nnvdsaftiwpqkekjfrgc` was confirmed before execution; migration `157_purchase_request_workflow_role_separation.sql` was applied and a final dry-run returned `Remote database is up to date`.
- GitHub Vercel check for `ac1319d` completed successfully. The protected branch preview is `https://seri-bako-oms-official-git-codex-uiux-round2-seribako.vercel.app`.
- The public custom domain `https://system.seribako.com.my` still reports `v8.64.55`; it has not been promoted to the forward closure revision. Do not test the P0 patch there yet.

## Version generations and what each achieved

The append-only `DESIGN.md` history contains hundreds of patch contracts. Grouping them by the problem they solved is more useful than treating every patch number as a separate product generation.

| Generation | Evidence range | Main progress | Remaining lesson |
| --- | --- | --- | --- |
| Pilot foundation | `v0.2.15` in `ARCHITECTURE.md` and `DEPLOYMENT.md` | Tenant-aware operational architecture, Supabase-backed workflows, initial deployment/pilot boundaries | Pilot assumptions must be promoted into measurable release gates |
| Workflow safety | `v7.83`–`v8.15` | Stock-count autosave, draft/unposted deletion semantics, filter safety, mobile actions, role/branch guards | Safe mutations are a product capability, not only a backend concern |
| Workspace and document system | `v8.16`–`v8.36` | Canonical list surfaces, document workspaces, PR/PO/GRN flows, responsive detail parity, first drill-through reports | Shared primitives reduce UX drift; route-local overrides recreate it |
| Decision insight foundation | `v8.36.15`–`v8.37.9` | Procurement variance, inventory movement, stock-count variance, costing readiness, product margin, demand and outlet completion insights | A chart must carry a business question, formula, population, and action |
| Trust and provenance | `v8.38`–`v8.55` | Business-date consistency, receipt provenance, source-aware empty/loading states, fail-closed inventory and stock-count reads | Zero, empty, unavailable, missing, and incomplete are different business states |
| Responsive and interaction authority | `v8.56`–`v8.64.55` | Ranking previews, AP aging interaction, tablet shell timing, two-row filters, shared CSS/rail authority, bounded reads | The next gain is release evidence and outcome measurement, not another visual variant |
| Current forward closure | `v8.64.56` local only | 23 P0 annotations, exact PR workflow ownership, Dashboard duplicate removal, PO/document grammar, UOM coverage, density fixes | Must be promoted and reverified before it becomes a release |

## Current feature audit

| Capability | Status | Evidence / gap |
| --- | --- | --- |
| PR → PO → GRN → Supplier Invoice → Payment | **Verified in source** | Server actions and atomic RPC transitions exist; production path still needs post-deploy verification |
| PR Manager/Purchasing/Finance separation | **Local closure** | Exact role gate, migration 157, and contract; production migration not applied |
| UOM entry and conversion | **Partial but directionally correct** | Common UOM entry is available; receiving/master-data conversion needs a visible conversion ledger and exception workflow |
| Branch-scoped inventory, stock counts, transfers, wastage | **Verified in source** | RLS/RPC/read-boundary contracts and viewport evidence exist |
| Outlet Daily provenance and completion | **Verified in source** | Explicit receipt provenance, bounded coverage, accessible matrix/list |
| AP aging, cash-flow pressure, costing readiness, demand/variance insight | **Verified as reports** | Metric dictionary documents formulas and drill-throughs; comparison/owner/due-date context is still uneven |
| Automated replenishment / demand planning | **Branch-preview evidence only** | Low Stock now exposes policy-based Buy now / Fix supplier first / Monitor decisions, but no proven closed loop from recommendation → approved PO → outcome |
| RFQ/tender, blanket/contract purchasing, vendor portal | **No evidence** | Mature-system benchmark capabilities, not current Seri Bako release claims |
| Lot/serial/barcode/expiry execution | **No evidence** | Do not imply warehouse traceability beyond current stock transaction/count scope |
| Landed cost, integrated GL/budget, multi-currency | **No evidence** | Supplier invoices/payments exist; full enterprise finance integration is not proven |
| Supplier performance/SLA score | **No evidence** | Supplier master and invoices exist; on-time, fill-rate, price variance and quality score need a documented source model |

## Market maturity benchmark

This is a directional product benchmark, not a vendor scorecard. Mature products provide the reference interaction patterns; they are much broader and more expensive systems than Seri Bako.

| Dimension | Seri Bako OMS | Odoo | NetSuite | SAP Business One | Dynamics 365 SCM |
| --- | --- | --- | --- | --- | --- |
| Stability / trust | Strong local fail-closed and RLS contracts; production evidence pending | Mature modular ERP; implementation quality varies | Mature integrated transaction/inventory model | Mature SMB ERP with long implementation history | Enterprise-grade process/configuration depth |
| Core procurement/inventory | Strong branch operations and food-ops flow; gaps in enterprise planning | Purchase UOM, replenishment, RFQ/PO, receipts, valuation | Purchasing, receiving, replenishment, demand planning | Purchase requests/quotes/PO/GRPO/AP, inventory, planning | Requisitions, RFQ, agreements, PO, receipt, invoice, planning |
| User friendliness | Focused and increasingly consistent for six operational roles | Broad but configuration-heavy | Powerful but role/configuration dense | Functional but older interaction conventions | Powerful, policy-heavy, training-dependent |
| Extensibility | Next.js + Supabase + RLS/RPC gives fast domain-specific extension | Modular/open ecosystem | SuiteCloud/customization ecosystem | Partner/add-on ecosystem | Deep configuration, workflows, Power Platform ecosystem |
| Data-to-decision | Strong trust primitives and early decision reports | Replenishment and operational reporting are mature | Real-time inventory/reorder and demand planning are mature | Planning, purchasing analysis, inventory reporting | Master planning, supply risk, procurement analytics |
| Best lesson to borrow | Preserve narrow scope and trust | UOM categories + replenishment policies | Recommendation math and real-time transaction linkage | End-to-end document trail and inventory/accounting linkage | Configurable approval policies and supplier collaboration |

Primary references: [Odoo inventory](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management.html), [Odoo UOM](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/product_management/configure/uom.html), [NetSuite inventory workflow](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N2251098.html), [NetSuite requisitions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_162444983707.html), [SAP Business One modules](https://help.sap.com/docs/SAP_BUSINESS_ONE/68a2e87fb29941b5bf959a184d9c6727/4510027ecf465d7ae10000000a11466f.html), [Dynamics 365 procurement](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/procurement-sourcing-overview).

## Data → valuable information → decision design

Do not add a number unless it changes a decision. Every decision signal must define:

1. **Question:** what decision is being made?
2. **Population and grain:** which branch/item/date/document rows count?
3. **Formula and UOM:** how are unlike units, currency, partial receipts, and missing data handled?
4. **Completeness:** is the result verified, partial, unavailable, not configured, or truly zero?
5. **Owner and due time:** who acts and by when?
6. **Impact:** quantity, MYR exposure, waste, service risk, or compliance risk.
7. **Drill-through:** one action opens the authoritative queue with the same filters.

The high-value UI should read like this, not like a dashboard of isolated numbers:

> **Buy now** · 12 items below policy · 3 branches · estimated MYR 4,200 exposure · 2 suppliers late · due Thursday · **Open replenishment queue**

Priority decision products:

| Decision | First useful version | Acceptance metric |
| --- | --- | --- |
| Buy now | Branch/item policy, on-hand, on-order, recent reliable demand, purchase UOM, suggested quantity, reason | A buyer can approve/edit a recommendation without opening five pages |
| Supplier follow-up | PO promised date vs receipt date, fill rate, price variance, missing invoice/GRN, owner | Purchasing can identify the top supplier action by value and age |
| Waste reduction | Wastage rate by branch/item/reason, coverage, repeated cause, action owner | Kitchen sees one root-cause queue rather than a raw trend |
| Cash pressure | Outstanding amount, due window, missing due date, approval/payment state | Finance can prioritize payable actions by due date and MYR impact |
| Margin readiness | Recipe completeness, current cost confidence, supplier price movement, missing master data | Finance can distinguish a real margin change from a data gap |

## 90-day closure plan

### Phase 0 — Release truth (1–2 days)

- Migration 157 is applied to the confirmed Supabase project; promote the exact reviewed application revision only after confirming the Vercel project/domain owner.
- Update the released app version to `v8.64.56` only after deployment, not before.
- Run the six-role × six-width production matrix, direct-route denial checks, and the 23 annotated P0 pages.
- Record commit, migration ceiling, Supabase project identity, timestamp, approver, rollback owner, and sanitized evidence.

### Phase 1 — Trust observability (1 week)

- Add source-owned `as_of` / `coverage` metadata to Dashboard, Outlet Daily, inventory, AP, and demand read models.
- Make every decision signal expose `verified`, `partial`, `unavailable`, `not configured`, or `zero` explicitly.
- Add release SLOs: mutation success rate, read-unavailable rate, p95 route latency, E2E pass rate, and stale-data incidents.
- Keep local/mock/production evidence in separate ledgers.

### Phase 2 — Decision layer (2–3 weeks)

- Ship the first “Buy now” recommendation read model using existing bounded stock, safety stock, MOQ, purchase UOM, and reliable demand inputs.
- Add supplier follow-up and waste root-cause queues with owner, age, reason, value, and drill-through.
- Add comparison context only where the denominator and period are documented; never infer freshness from browser render time.
- Preserve accessible tables/lists as the authoritative alternative to charts.

### Phase 3 — Extensibility (2–4 weeks)

- Centralize UOM categories and conversion history with effective dates, source, factor, and receiving exception handling.
- Introduce an append-only domain event/outbox boundary for PO, GRN, invoice, payment, stock, and outlet-day transitions.
- Add approved-vendor/catalog policies before RFQ or vendor portal work; keep integrations behind permissioned adapters.
- Add supplier score definitions only after PO/receipt/invoice data quality is measured.

### Phase 4 — Productization (2 weeks)

- Turn onboarding, master-data import, branch setup, role setup, backup/recovery, and audit export into a repeatable pilot package.
- Publish a sanitized release evidence pack and a one-page operating model for each role.
- Package the differentiator as “trusted branch operations intelligence,” not as a generic ERP clone.

## Release gates

The goal remains active until all of these are true:

- P0/P1 source changes are deployed and post-deploy evidence exists.
- The complete browser suite runs on a resource-sufficient CI/runner; backend-failed runs are recorded as inconclusive, never green.
- Every KPI in `docs/analytics/METRIC_DICTIONARY.md` has a decision, formula, grain, source, freshness, completeness, alternative, and drill-through.
- At least one recommendation closes the loop from signal → action → outcome measurement.
- No role can approve or mutate another role's workflow without an explicit break-glass policy.
- The release ledger separates verified, blocked, planned, and no-evidence claims.

## Current remaining P1/P2 ledger

| Priority | Item | Current state | Next evidence |
| --- | --- | --- | --- |
| P1 | Production promotion of migration 157 and P0 patch | Migration applied; branch preview ready; custom domain remains `v8.64.55` | Domain promotion receipt + post-deploy matrix |
| P1 | Full backend-backed E2E run on a resource-sufficient runner | Local focused suites pass; expanded historical runs include backend fetch failures | CI run with captured environment health |
| P1 | Dashboard command-surface contrast/anti-pattern cleanup | Still requires targeted contrast audit after the current structural cleanup | Measured contrast + fresh screenshots |
| P1 | Decision recommendation loop | Low Stock now exposes Buy now / Fix supplier first / Monitor with reasons; outcome measurement is still missing | Buy-now pilot with accepted/rejected/fulfilled outcome |
| P2 | Source-owned freshness/comparison context | Metric dictionary defines the need; most screens are request-time only | Read-model metadata and UI proof |
| P2 | Supplier performance and UOM conversion ledger | Master data exists; decision model incomplete | Formula, data quality, and drill-through contract |
| P2 | Version/report consolidation | This document is the new cross-cutting index; older reports remain historical | Link each prior report to a current status |

## Evidence limits

- Local tests do not prove Production deployment, remote migration state, or live Supabase health.
- Screenshot evidence cannot prove full WCAG compliance, database authorization, or business correctness by itself.
- A mature-system feature listed in the benchmark is not a Seri Bako feature claim; absent source/runtime evidence remains **no evidence**.
- Commits, push, and migration 157 were performed and recorded above. No custom-domain promotion, staff-data change, or destructive migration was performed in this closure pass.
