# Annotation Repair Ledger — 2026-08-19

## v8.64.145 Production identity and natural-sort audit

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| BWY and CILANTRO supplier identity remains trustworthy. | production verified (read-only) | Production `/suppliers` and CILANTRO detail show `AutoCount BWYHOLDI` / `AutoCount CILANTRO`, formal names, and independent short-name fields. No code was guessed or mutated; authoritative values are read-only evidence from the deployed database. |
| Supplier Item mapping supports progressive setup. | production verified (read-only) | Production `/supplier-items/new` exposes a keyboard-searchable Item Master combobox, read-only Base UOM ownership, controlled Purchase UOM list, and a clear Item Master hand-off. No mapping was created. |
| Items default natural numeric ordering. | production verified (read-only) | Production `/items?sort=item_code&dir=asc&page=1` returned item codes `1, 2, 3, 5, 6, 7, 9, 10, 11, 12, ...`; no lexical `1, 10, 11` defect observed. |
| AP Aging remains usable on a narrow device. | production verified (read-only) | Production `/supplier-invoices/aging` reported `overflow=0` at 390×844, kept one fixed bottom nav at `bottom=0`, and exposed bucket summaries, filter, export, and cash-flow actions without a clipped table. No invoice mutation was performed. |
| Recipe and Production Jobs entry surfaces remain discoverable and responsive. | production verified (read-only) | Production `/recipes` showed a clear empty state plus New recipe entry with `overflow=0`; Production Jobs at 820×1180 wrapped the status/branch filters into two rows with `overflow=0` and retained the fixed bottom nav. No recipe or job mutation was performed. |
| Manager cannot accidentally enter Finance-owned invoice work. | production verified (read-only) | In the authenticated Manager session, direct navigation to `/supplier-invoices` returned to the Manager dashboard; the visible action surface stayed limited to review/receiving/count work. No invoice mutation was performed. |
| Contract gate remains green after the audit metadata update. | verified locally | `npm run test:contract` passed 850/850; this run did not touch the preserved Supabase temp/config/seed dirty files. |
| Footer and release records remain synchronized. | implemented locally | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger carry v8.64.145. Production currently still reports footer v8.64.142 on the inspected supplier detail, so promotion remains a separate gate. |

## v8.64.144 local closure patch — PR sourcing handoff clarity

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Non-catalog PR lines explain the non-blocking handoff before approval. | verified locally / Production read-only observed, deployment pending | The PR detail side rail now names the unresolved count and explains whether Purchasing must match lines before Finance review or PO conversion. Production Manager read-only inspection of PR/AUG26/018 exposed the previous ambiguity: 11 `Purchasing match required` lines with only “Manager approves the purchase need.” A focused contract test now protects the new wording. No Production mutation was performed. |
| Footer and release records remain synchronized. | implemented locally | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger carry v8.64.144. |
| Production six-role dashboard matrix is role-scoped and responsive. | production verified (read-only) | Super Admin, Manager, Purchasing, Finance, Kitchen, and Outlet sessions were each inspected at 390×844, 820×1180, 1180×820, and 1440×900. Every viewport reported `overflow=0`; compact viewports kept one `position: fixed` bottom nav at `bottom=0`, desktop hid it; role actions remained scoped (Manager review/receiving/count, Purchasing PR/PO/receiving, Finance PR/invoices/stock, Kitchen request/production/receiving, Outlet daily record/history/activity, Owner approval/AP/count). No mutation was performed in this matrix. |
| Production Outlet Daily blocks Posted while Qty Sent is missing. | awaiting migration 191 / Production UAT | Read-only Production list still contains `Posted` rows with `Qty Sent: Missing` and `Needs entry` (including the current Outlet test record). This is the exact pre-191 behavior; the local guard is not claimed as deployed until migration 191 is applied and the same read-only check is rerun. |

Read-only downstream Production checks also remain coherent: PR list defaults to natural latest document order (`PR/AUG26/019`, `018`, `017`, …), PR/AUG26/019 shows the requested-line summary and links to `TEST-PO-PR019-20260822`, PO detail has one visible phone action rail with `Send to Supplier` (not clicked because it is an external side effect), and GRN new shows Purchase UOM/Base UOM inputs plus the required Delivery Order-before-posting guidance. PR new exposes readable Supplier, searchable item combobox, controlled UOM, and urgency controls with `overflow=0` at the inspected phone viewport. These checks are read-only and current deployment evidence only.

## v8.64.143 local closure patch — Qty Sent completion guard

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Outlet Daily cannot become Posted while Qty Sent is missing. | verified locally / linked migration awaiting | Forward-only migration 191 now requires every line to carry an authorised Qty Sent confirmation before `morning_recorded` or `evening_completed`; a missing line returns a bounded product-specific correction message. The previously observed fresh Outlet completion defect is fixed at the database boundary. Local migration 191 is applied and recorded; the authenticated Outlet browser guard passed on the disposable local fixture, and the full contract suite passed 849/849. |
| Footer and release records remain synchronized. | implemented locally | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger carry v8.64.143. |
| Production verification boundary. | awaiting linked/Production UAT | Migration 191 has not been represented as linked or Production verified. Production mutation remains outside the current authorization boundary. |

The local progressive-receiving regression remains green after the Qty Sent guard: `progressive-receiving-uom-local.spec.js` reports `3/3` for unknown `2 CTN → 24 KG`, remembered conversion, and remember-off floating `2 BAG → 17.4 KG`. The Dashboard role audit test was also aligned with the current deduplicated workspace; its historical micro-chart assertion is intentionally no longer valid. These are local fixture results, not Production evidence.

The local master-data and recipe mutation fixtures also report `passed / failedTests: []`: Super Admin created and edited Branch, Supplier, and Item records; then created, edited, submitted, approved, and activated a Recipe. Playwright cleanup required an explicit stop after the successful run; no source failure was reported.

## v8.64.142 dashboard snapshot cleanup

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Dashboard does not repeat role-specific snapshots already owned by canonical panels. | production deployed / authenticated UAT awaiting | Finance, Kitchen, and Purchasing role micro-chart data was removed from the dashboard consumer because it repeated Payables, Operational pipeline, and Exceptions values. The standalone component remains unmounted until a genuinely distinct trend source exists. Focused dashboard contracts passed 9/9; the full local suite passed 848/848, strict typecheck, lint, and production build passed. Read-only Production smoke reaches 15 audited routes with HTTP 200 and footer `v8.64.142`; authenticated six-role/four-viewport UAT remains open. |
| Footer and release records remain synchronized. | production deployed | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger carry v8.64.142. |

## v8.64.141 dashboard signal deduplication

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Owner and Manager dashboards do not repeat the same exception metrics in a second trend card. | production deployed / authenticated UAT awaiting | The duplicate Operational trend card is removed for the roles whose canonical Today&apos;s work and Exceptions surfaces already own stock-count, wastage, and outlet-completion signals. Read-only Production route smoke now reaches the audited pages with HTTP 200 and footer `v8.64.141`; screenshot-level authenticated regression remains pending. |
| Footer and release records remain synchronized. | production deployed | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.141. |

## v8.64.140 keyboard-safe tablet closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Tablet/iPadOS bottom navigation remains at the physical screen edge while the keyboard is open. | implemented locally / Production awaiting promotion | The shared mobile shell now treats touch tablets as compact shells and combines visualViewport measurement with a `100dvh - 100lvh` CSS fallback. The bar is moved behind the keyboard instead of following the reduced edit viewport. |
| Current release records and footer remain synchronized. | production deployed / authenticated UAT awaiting | Read-only `Invoke-WebRequest https://system.seribako.com.my/login` returned HTTP 200 with footer `v8.64.140`. `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger carry v8.64.140. |
| Production six-role, four-viewport regression and mutation validation. | awaiting authenticated Production UAT | No Production business record was mutated by this patch. A signed-in role matrix and disposable mutation boundary are still required before any annotation can be marked production verified. |

## v8.64.139 Production deployment boundary

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| The Production host is reachable and its deployed footer is known. | verified read-only / authenticated UAT awaiting | `Invoke-WebRequest https://system.seribako.com.my/login` returned HTTP 200 and footer `v8.64.139`, matching the current branch. This proves deployment reachability only; authenticated role workflows still require UAT. |
| Production six-role, four-viewport regression is not falsely promoted. | awaiting authenticated Production UAT | No Production business mutation was attempted. Regression must still cover the deployed current release across the six roles and four required viewports. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.139. |

The public endpoint check is read-only and is not Production workflow verification.

## v8.64.138 linked migration verification

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Linked Supabase migrations 185–190 are applied successfully. | remote verified / Production read-only regression awaiting UAT | User-provided complete `npx supabase db push` output shows `Applying migration 185...` through `Applying migration 190...` and ends with `Finished supabase db push.` The pg-delta certificate-cache warning occurred after SQL application and is recorded as a non-blocking catalog-cache issue. |
| Production mutation remains outside this gate. | awaiting Production mutation UAT | No Production business records were mutated by this verification. Production read-only browser regression remains required for final closure. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.138. |

The linked migration result is now verified from user-provided command evidence. It does not by itself prove authenticated Production UI behavior.

## v8.64.137 migration uniqueness guard

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Repository migration version collisions are rejected before release. | implemented | `migration-version-uniqueness-contract.test.js` scans all SQL migration filenames, rejects duplicate numeric prefixes, and requires the AutoCount repair at forward-only version 190. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.137. |

This is a local repository guard; it does not promote linked or Production migration status.

## v8.64.136 post-migration local workflow closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Critical receiving and procurement workflows remain usable after migration 190 is applied. | verified locally / Production awaiting UAT | Fresh authenticated local browser rerun passed progressive receiving `3/3` (unknown, remembered, and floating UOM conversions) and the complete PR → PO → GRN/Delivery Order attachment/payment closure suite `3/3`. A separate first combined run exposed a transient Next dev hydration timing failure; the clean rerun passed without source changes. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.136. |
| Migration version collisions are prevented from returning. | implemented | `migration-version-uniqueness-contract.test.js` rejects duplicate numeric migration prefixes and requires the AutoCount repair to remain at forward-only version 190. |

This is local workflow evidence only. Linked migration and Production regression remain separate gates.

## v8.64.135 migration history reconciliation

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Linked migration push no longer replays a duplicate version 171. | implemented locally / remote awaiting UAT | User-provided `npx supabase db push --include-all` reached the linked database but failed with `schema_migrations_pkey` because version `171` already exists. The repository duplicate `171_fix_autocount_import_confirm.sql` is now preserved as forward-only migration `190_fix_autocount_import_confirm.sql`; the original 171 migration remains immutable. Local `migration up --local` and `migration list --local` now apply and report 190 successfully. User must rerun `npx supabase db push` after pulling this commit and provide successful output before `remote verified` can be claimed. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, this ledger, migration 190, and AutoCount contract paths are synchronized to v8.64.135. |

The duplicate-version repair is local source evidence only. No linked or Production migration status is promoted from the failed push.

## v8.64.134 progressive receiving snapshot closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Unknown Supplier UOM receipts derive and persist an immutable conversion snapshot from actual Purchase/Base quantities before posting. | verified locally / Production awaiting UAT | Forward-only migration 189 adds a database trigger that derives `received_base_qty / received_qty` (or the rejected equivalent) when the browser snapshot is absent. Local migration ledger records 189 and the authenticated progressive receiving suite passed `3/3` after application. |
| The remaining high-risk local mutation workflows remain usable after the snapshot repair. | verified locally / Production awaiting UAT | Fresh local browser reruns passed master-data create/edit `1/1`, Recipe create/edit/submit/approve/activate `1/1`, and Purchase Return posting `1/1` with `TEST_MUTATE_WORKFLOW=true`. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, this ledger, migration 189, and its contract test are synchronized to v8.64.134. |

This closes a real local database-boundary defect found during audit. Migration 189 is local-only until linked migration output is supplied; no remote or Production status is promoted.

## v8.64.133 Outlet Daily closure audit

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Outlet Daily history, entry, completion status, Qty Sent correction and detailed export work together across the required responsive surfaces. | verified locally / Production awaiting UAT | Fresh local Supabase browser audit passed `19/19` after restarting the current v8.64.132 service: completion matrix, entry conditional details, direct-post flow at four viewports, fixed filter/action geometry, mobile ordering, Purchasing cross-outlet correction, and dated product-line CSV. |
| Wastage cost and operational reports remain readable and bounded. | verified locally / Production awaiting UAT | The same `19/19` run covered wastage chart point previews, ranking values, Product Margin, Procurement Variance, AP Aging and Cash Flow drill-throughs on desktop and touch/phone surfaces. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.133. |

The first attempt against a stale local server returned raw unstyled HTML and is excluded from evidence; the clean rerun used the current app and passed all 19 tests. This remains local-only evidence; linked migrations and Production regression are separate gates.

## v8.64.132 PR-to-PO error feedback closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| A valid PR converts to one PO and a duplicate AutoCount PO number is rejected with actionable feedback. | verified locally / Production awaiting UAT | `qa-purchase-closure.spec.js` passed 3/3 against the disposable local Supabase fixture, including a second Ready to Convert PR: duplicate submission shows `This AutoCount PO Number is already used`, retains the entered value, and leaves exactly one active PO for that number. |
| Conversion feedback is bounded and user-facing. | implemented | The browser assertion covers the field-level message and retained input; SQL/constraint details are not exposed. Production PR/AUG26/013 remains unclaimed. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.132. |

This closes the dedicated local browser duplicate/error-feedback probe. It does not verify linked migrations or Production behavior; the user-provided `supabase db push` output still ends before a final success result.

## v8.64.131 closure ledger reconciliation

| Current evidence authority | Superseded historical wording | Boundary that remains |
|---|---|---|
| Guided PR line repair is locally mutation-verified by v8.64.128 (`annotation-v8-64-66-uat.spec.js`, 10/10 full file). | The older “Real guided PR repair — mutation UAT incomplete” row is historical and no longer describes the local fixture state. | Production mutation and linked/Production migration evidence remain unverified. |
| Purchase Return now has authenticated local mutation evidence in v8.64.129; progressive receiving and immutable snapshots are locally verified in v8.64.125/129. | Older GRN/Return rows that say browser return UAT is open are retained as historical context only. | Production data and remote migration alignment remain open. |
| AP Aging report interaction and phone geometry are locally verified 2/2 in v8.64.130. | The older “dedicated AP Aging report fixture/UAT remains open” wording is superseded for local report interaction. | Production report regression and linked migration status remain open. |
| PR→PO success is authenticated locally in the 3/3 procurement closure and conversion RPC contract; duplicate/idempotency behavior is locally transactional. | Older local-only conversion rows remain accurate about the missing dedicated browser duplicate/error-feedback probe. | The focused browser probe is now closed by v8.64.132; PR/AUG26/013 and Production are not claimed. |
| Footer and release records remain synchronized. | Historical version notes remain immutable context. | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.132. |

This reconciliation prevents historical ledger wording from being mistaken for current evidence. It does not mark any remote or Production item verified.

## v8.64.130 AP Aging report closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| AP Aging buckets provide readable context, keyboard/touch previews, and filter drill-through. | verified locally / Production awaiting UAT | `outlet-wastage-chart-preview.spec.js` AP Aging checks passed 2/2: desktop hover/focus preview with a `not_due` drill-through link, plus the touch/phone surface with all seven buckets and bounded geometry. |
| AP Aging evidence is scoped to the disposable local target. | implemented | The browser run used `RUN_TENANT_BOUNDARY_E2E=1`, the local Supabase fixture, and no Production mutation. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.130. |

This batch strengthens the local AP Aging UAT gap. Linked migration alignment, authoritative Production data, and Production regression remain separate gates.

## v8.64.129 purchase return browser closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Purchase Return uses the posted GRN snapshot and creates one supplier-return movement. | verified locally / Production awaiting UAT | `purchase-return-flow.spec.js` passed 1/1 against the disposable local supplier-invoice/GRN fixture: create and refresh the draft, post the return, confirm Posted, and find one matching `return to supplier` movement in Stock Transactions. |
| Return evidence remains local-only and does not alter Production data. | implemented | The E2E is restricted to `RUN_TENANT_BOUNDARY_E2E=1`, uses localhost Supabase, and the fixture is disposable. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.129. |

This batch closes the previously open authenticated local Purchase Return mutation path. Linked migration alignment, authoritative Production data, and Production regression remain separate gates.

## v8.64.128 guided PR review mutation closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Manager Review can repair a saved PR line without leaving the request or silently losing the original values. | verified locally / Production awaiting UAT | `annotation-v8-64-66-uat.spec.js` passed the disposable local mutation: replace the unmapped line with `E2E-SOURCE-A-ITEM`, select the mapped supplier and CTN UOM, apply the revised quantity, then assert the persisted line and `document_line_revisions` snapshot/reason in local Supabase. |
| Guided repair remains bounded to local mutation evidence. | implemented | The test is fail-closed to `RUN_TENANT_BOUNDARY_E2E=1` and localhost Supabase; no Production records are changed or promoted. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.128. |

This batch closes the previously unverified local Apply mutation path. Linked migration alignment, authoritative Production data, and six-role Production regression remain separate gates.

## v8.64.127 current local closure audit refresh

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Manager → Purchasing → Finance review gates and downstream PO/GRN/payment workflow remain usable after migration re-execution. | verified locally / Production awaiting UAT | `qa-purchase-closure.spec.js` passed 3/3 on the clean v8.64.126 production-like server. This current evidence supersedes the older “Manager approval fixture awaiting” wording for local mutation coverage; Production mutation remains unverified. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.127. |

This is a local closure refresh only. Linked migration alignment, authoritative Production data, and six-role Production regression remain separate gates.

## v8.64.126 migration 185 retry-safe closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Migration 185 can be retried after a partial application without duplicate index/constraint failures. | verified locally / remote awaiting UAT | The unique index is `if not exists`; named receiving constraints are relation-aware and added only when absent. The complete migration was executed a second time against the local PostgreSQL stack with `ON_ERROR_STOP=1` and completed successfully. |
| The migration re-execution preserves the progressive receiving behavior. | verified locally / Production awaiting UAT | After the direct re-run, a clean v8.64.125 production-like server passed `progressive-receiving-uom-local.spec.js` 3/3, including fixed, remembered, and floating conversions. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.126. |

This is local schema and workflow evidence only. User-provided linked `db push` output and Production regression remain required for `remote verified` / `production verified`.

## v8.64.125 progressive receiving UOM local closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Unknown supplier packaging can be received with actual Purchase and Base UOM quantities. | verified locally / Production awaiting UAT | `progressive-receiving-uom-local.spec.js` passed 3/3 against the fresh local production-like server and local Supabase: 2 CTN → 24 KG, optional Remember, and a floating 2 BAG → 17.4 KG snapshot. |
| Remembered conversions become future defaults without changing the immutable GRN snapshot. | verified locally / Production awaiting UAT | The next 1 CTN receipt auto-calculated 12 KG, posted 12 base units at normalized cost, and the first GRN retained its own conversion/audit record. |
| Remember-off floating conversions do not contaminate supplier master data. | verified locally / Production awaiting UAT | The 2 BAG → 17.4 KG receipt posted the correct base quantity and cost while its supplier conversion remained null and no conversion audit was created. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.125. |

This batch is local evidence only. Migration 185 remains an intentionally preserved untracked boundary; linked migration alignment and Production regression are separate gates.

## v8.64.124 fresh local workflow audit closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Field-level PR validation remains specific and actionable. | verified locally / Production awaiting UAT | `experience-states.spec.js` now asserts the actual supplier-specific message (`Choose one supplier for this purchase request.`) and the test passes. |
| Remaining workspace, receiving, Outlet Daily entry, administration, and responsive checks pass on the clean local production-like server. | verified locally / Production awaiting UAT | `document-workspaces-7-23-5-5.spec.js`, `goods-receiving-detail-responsive.spec.js`, `outlet-daily-entry-contract.spec.js`, and `administration-master-data-ux.spec.js`: 12/12 passed on port 3054. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.124. |

This batch is local evidence only. Remote migration alignment, authoritative AutoCount data, and Production regression remain separate gates.

## v8.64.123 sourcing boundary and fresh local regression closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Changing Supplier clears stale lines that are not supplied by the selected branch-scoped catalogue and explains the reset. | verified locally / Production awaiting UAT | `annotation-v8-64-104-core-flows.spec.js` now passes the complete supplier-scoping scenario. The line is cleared with a plain-language notice, while Item Master re-selection remains available for progressive Purchasing confirmation. |
| Six roles remain reachable and role-scoped across responsive workspaces. | verified locally / Production awaiting UAT | Fresh local production-like server for this batch: Super Admin, Manager, Purchasing, Finance, Kitchen, Outlet routing/dashboard/workspaces passed 20/20, including 390/430/768/1024/1440 widths. |
| PR → PO → GRN → invoice/payment/close remains usable after the sourcing repair. | verified locally / Production awaiting UAT | `qa-purchase-closure.spec.js` passed 3/3 with disposable six-role fixture. |
| Outlet Daily, master data, Recipe, review/return/invoice, annotation and responsive surfaces remain usable. | verified locally / Production awaiting UAT | Outlet Daily/report suite 18/18; master-data + Recipe mutation suite 2/2; review/return/invoice suite 6/6; annotation/P0/responsive suite 26/26. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.123. |

This is local evidence only. Remote migration alignment, authoritative AutoCount data, and Production read-only/mutation regression remain separate gates.

## v8.64.122 Recipe and document transition closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Recipe create, edit, submit, approve, and activate complete as one workflow. | verified locally / Production awaiting UAT | `recipe-mutations-local.spec.js` passed 1/1 against the fresh local production server and local Supabase. The test selects the visible Recipe Workflow action, not the generic Document Approval button with the same label. |
| Recipe and linked Document updates cannot silently diverge. | implemented / local evidence | `recipes.ts` now performs sequential `.select().single()` updates and raises a concrete error when either record is missing. Migration 188 qualifies `approval_steps.approval_id` references in `transition_document_atomic`. |
| Release footer and records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.122. |

This is local workflow evidence only. Remote migration 188, linked migration alignment, authoritative Production data, and six-role Production regression remain awaiting evidence.

## v8.64.121 master-data mutation closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Branch, Supplier, and Item creation and maintenance are proven through the UI. | verified locally / Production awaiting UAT | `master-data-mutations-local.spec.js` passed 1/1 on the fresh local production server. Super Admin created all three records, edited each record, asserted persisted values through the local database, and soft-deleted the disposable fixture. |
| Master-data mutation evidence is distinct from structure-only responsive evidence. | implemented | The new E2E uses real forms/server actions; service-role access is used only for company lookup, assertions, and cleanup. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.121. |

This closes the local create/edit evidence gap only. Supplier-item mapping, authoritative AutoCount values, linked migrations, and Production regression remain separate gates.

## v8.64.120 fresh local closure audit

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Production-like browser evidence is collected from a fresh server process. | implemented / local only | Port 3004 returned a stale generic error page; a fresh v8.64.119 build server on port 3005 passed the same authenticated routes without that overlay. |
| Six-role routing, dashboard and responsive workspaces. | verified locally / Production awaiting UAT | Super Admin, Manager, Purchasing, Finance, Kitchen and Outlet: 20/20 passed. |
| Core operational closure surfaces. | verified locally / Production awaiting UAT | Costing, GRN, Outlet Daily, Purchase Return and Supplier Invoice: 8 passed, 2 fixture-dependent skips; administration/master-data: 2/2. |
| Footer and release records remain synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.120. |

The fresh-process result strengthens local evidence only. It does not verify linked migrations, Production data, real AutoCount codes/UOM coefficients, or Production mutation workflows.

## v8.64.119 local production-like closure gate

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Local production-like build uses the local Supabase URL and supports authenticated browser testing. | implemented / local only | Rebuilt with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55431`, then served from a local production server; the mobile approval-sheet flow passed without the Next development overlay. Production URL and linked migration state were not touched. |
| Six-role authentication, dashboard, and workspace surfaces remain reachable and role-scoped. | verified locally / Production awaiting UAT | Super Admin, Manager, Purchasing, Finance, Kitchen, and Outlet passed auth routing, dashboard role-awareness, and responsive workspace checks: 20/20. |
| PR → PO → GRN → invoice/payment closure remains atomic and usable. | verified locally / Production awaiting UAT | Disposable local QA fixture completed Kitchen submit, Manager/Purchasing/Finance review, PO conversion/send, GRN, invoice approval, payment, and PO close: 3/3. |
| Outlet Daily, GRN/return, export, and master-data responsive surfaces remain usable. | verified locally / Production awaiting UAT | Production-like local browser matrix passed 7/7 selected tests; one fixture-dependent test was skipped. Detailed dated Outlet CSV and role-gated wastage cost remain explicit. |
| Current code/doc/footer release evidence is synchronized. | implemented | `PRODUCT.md`, `DESIGN.md`, `package.json`, `package-lock.json`, `src/lib/app-version.ts`, and this ledger now carry v8.64.119. |

The local gate is not a Production claim. Remote/linked migrations, BWY/CILANTRO authoritative creditor codes, CTN/BAG/TUB coefficients, and six-role Production regression remain `awaiting UAT` or `blocked` until authoritative evidence is supplied.

## v8.64.118 local closure rerun evidence

The local browser rerun passes `costing-readiness-insights.spec.js` (1/1), `administration-master-data-ux.spec.js` (2/2), and `purchase-return-flow.spec.js` (1/1); the earlier parallel administration run had one transient `ERR_ABORTED` and passed when isolated. Local migration rows 183–187 are present in the disposable Supabase stack. No linked migration or Production claim is made.

## v8.64.117 wastage value summary

The Outlet Daily right rail now exposes a role-gated “Today's wastage value” summary for company-wide roles. It uses active recipe cost snapshots, separates verified/partial/unavailable states, and never shows an invented zero when a product has no cost authority. Authenticated local Purchasing UAT passes the summary (`Unavailable` for the fixture without a recipe snapshot) alongside detailed export and Qty Sent correction. Production data and six-role regression remain open.

## v8.64.116 authenticated Outlet Daily export UAT

The local Purchasing role now passes both the company-wide Qty Sent correction workflow and the detailed export download. The browser verifies `outlet-daily-records_<date>.csv`, product-line columns, Qty Sent provenance, wastage amount, and an explicit unavailable cost state for a fixture without a recipe snapshot. This remains local mutation/UAT evidence; no Production export or role mutation claim is made.

## v8.64.115 detailed Outlet Daily export and return snapshot evidence

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Outlet Daily export contains detailed product lines and a dated filename. | implemented / contract + local source verified / awaiting authenticated download UAT | CSV now exports one row per product line with Qty Sent provenance, received, leftover, wastage, reason, notes, and `outlet-daily-records_<date>.csv` or range filename. The old summary-only filename is removed. |
| Wastage amount is visible only to company-wide operational roles and never fabricated when recipe cost authority is absent. | implemented / local source verified / awaiting role UAT | The export uses the latest active recipe cost snapshot, returns an explicit unavailable state when no snapshot exists, and keeps cost fields restricted outside `outlet_daily_record.view_all`. |
| Purchase Return uses the immutable GRN conversion snapshot. | implemented / local mutation UAT passed | The disposable Supplier Invoice GRN fixture now stores `received_base_qty`, `conversion_to_base_uom_snapshot`, and source metadata; `purchase-return-flow.spec.js` posts one return movement successfully. Production data and migration linkage remain separate. |

## v8.64.109 PR to PO conversion repair

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| A valid AutoCount PO number converts a Ready to Convert PR without the idempotency constraint failure. | implemented / local transactional RPC test passed / awaiting authenticated UAT | Migration 186 explicitly recreates the conversion RPC and writes `purchase_orders.idempotency_key`; a disposable local ready-to-convert PR converted successfully and a repeated call returned the existing PO. PR/AUG26/013 and Production remain unverified. |
| Conversion failures identify the exact condition, focus the PO number field, and preserve the entered value. | implemented / awaiting authenticated UAT | Server action maps stable conversion codes, redirects with a bounded `po_no`, and the detail form restores it through `ActionErrorNotice`. |
| A PR cannot create two active POs and conversion audit records include source and idempotency metadata. | implemented / local transactional RPC test passed / awaiting workflow UAT | The RPC locks the PR, checks existing links, uses the active-PO and idempotency indexes, and writes structured activity metadata. |

Migrations 185 and 186 are applied only to the local Supabase database for this audit. They are not remote or Production verified until the user provides successful linked migration evidence. Current Supabase `.temp`, seed, and local configuration files remain outside this repair batch.

## v8.64.108 portrait-tablet alignment follow-up

Two new browser annotations are implemented locally. The Purchase Order form's hidden submission inputs now use the HTML `hidden` attribute and the visible surfaces use rendered-box grid gaps, preventing a false 12px offset before the first form surface; the form and tablet action rail therefore share one top edge. Production Jobs now opts into a scoped portrait-tablet two-row filter contract, keeping query and command together above Status, Branch, and More filters. Authenticated rendered UAT passes 19/19, including exact 820×1180 top-edge geometry, two-row filter geometry, and horizontal-overflow rejection. Final v8.64.108 evidence passes 833/833 unit/contracts, strict typecheck, lint, 79-route Production build, and `git diff --check`. These rows remain neither remote nor Production verified.

## v8.64.107 workflow stage and keyboard follow-up

New Production annotations are implemented locally in the shared primitives. `StatusBadge` assigns distinct muted tones to Manager Review, Purchasing Review, Finance Review, Ready to Convert, rejected, and awaiting-GRN/sent-to-supplier stages without using color as the only status signal. `MobileAppNavigation` now detects keyboard geometry across the complete phone/tablet shell up to 1279px, records the measured inset, and translates the fixed bottom navigation behind the OS keyboard so it does not rise into the reduced visual viewport. Authenticated rendered UAT passes 17/17, including distinct PR workflow tones and repeated 390×844 / 820×1180 keyboard-inset geometry checks. Final v8.64.107 evidence passes 832/832 unit/contracts, strict typecheck, lint, 79-route Production build, and `git diff --check`. This batch is not remote or Production verified.

## v8.64.106 final local annotation surface closure

The remaining four locally implemented rows now have authenticated rendered-page evidence. Supplier identity retains the official name and AutoCount code while exposing an explicitly labelled operator short name. Item detail action hierarchy passes at 390×844, 820×1180, 1180×820, and 1440×900 with one visible responsive surface and no horizontal overflow. Inventory movement colors and Procurement counters pass at 820×1180, 1180×820, and 1440×900 without borrowing danger or warning color for neutral data. The focused authenticated annotation suite passes 14/14. Final v8.64.106 static evidence passes 831/831 unit/contracts, strict typecheck, lint, 79-route Production build, and `git diff --check`. None of this promotes a row to remote or Production verified.

## v8.64.105 natural PR register order

Completion audit found that PostgREST `request_no desc` still sorted strings lexicographically before pagination. Migration 184 adds an immutable generated `request_sort_key` based on the shared natural-code function and a tenant-scoped partial index. The register maps Request sorting to this key while retaining the public `request_no` control and a same-direction ID tie-breaker. Local migration output reported migration 184 applied before the known PostHog shutdown timeout. Authenticated 390×844 UAT proves default `.../10, .../2, .../1`, explicit ascending `.../1, .../2, .../10`, the submitted-by hierarchy, and no horizontal overflow.

The current-code historical regression rerun also passes 31/31 authenticated scenarios, including six role-specific Dashboards, PR/PO geometry at all four required viewports, stock registers at all four viewports, guided PR review, filter grammar, Outlet Daily, Staff, and structured PR validation. These are local UAT results, not linked or Production verification.

v8.64.105 static evidence: 831/831 unit and contract tests, strict typecheck, lint, 79-route Production build, and `git diff --check` pass. The focused authenticated annotation suite passes 11/11. No result in this section changes the linked or Production evidence state.

Read-only external refresh on 2026-08-21: both repository CLI and the previously compatible Supabase CLI 2.115.0 still fail at `Initialising login role` with `LegacyDbConfigLoginRoleNetworkError: TransportError`, so migrations 173–184 remain not remote verified. The public Production login HTML now renders footer `v8.64.101`; it has advanced from the earlier `v8.64.99` observation but still does not contain local v8.64.105. No authenticated Production workflow claim is made.

## v8.64.104 interaction and sourcing-boundary closure

Implemented locally: Item combobox Arrow/Enter/Escape operation and active-option semantics; PR suggestions identify Supplier, Purchase UOM, and Item Master Base UOM; typed exact item codes can no longer bypass the selected branch + supplier catalogue; branch/supplier changes explain cleared lines; rejected PRs show reason, actor, time, and correction step; PO details disclosure and one Add line ownership remain covered; zero-denominator Outlet records show `Unavailable` and are excluded from percentage trends. The disposable annotation fixture adds two mapped suppliers, natural-sort items, a rejected PR, a Qty Sent-missing record, and a confirmed zero-denominator record.

Current evidence state: `implemented` and local UAT passed. v8.64.104 passes 830/830 unit/contracts, strict typecheck, lint, a 79-route Production build, and `git diff --check`. The new authenticated core-flow suite passes 10/10, covering Supplier Item keyboard/Base UOM ownership, PR supplier scoping and context reset, rejected PR guidance, natural Item Code order, PO disclosure, one Stock Balance basket owner at all four required viewports, and Outlet Qty Sent/zero-denominator role behavior. The current v8.64.105 section supersedes these local counts and records the external refresh; this historical batch itself was neither `remote verified` nor `production verified`.

## v8.64.103 local UAT fixture closure

The localhost-only fixture now creates one recoverable guided-review PR with a real document comment, one active Outlet product, and one completed Outlet Daily record with trusted Qty Sent/Received provenance. The five scenarios that previously depended on absent seed rows now pass 5/5: desktop and portrait guided review dialog, portrait Comments rail, conditional wastage reset, and portrait-tablet trend chart. The Manager Review role-boundary case also executes and passes 1/1 instead of skipping. These fixtures are idempotent, require `RUN_TENANT_BOUNDARY_E2E=1`, and never target a remote host.

Read-only external evidence on 2026-08-21 remains intentionally separate: `supabase migration list --linked` still fails while initializing the login role with `LegacyDbConfigLoginRoleNetworkError`, so migrations 173–183 are not called remote verified. The public Production login page currently renders footer `v8.64.99`, not this local `v8.64.103` batch.

## v8.64.102 annotation closure round — 31-comment register

Status vocabulary: `implemented`, `awaiting UAT`, `blocked`, `remote verified`, and `production verified`. No entry in this batch is remote- or Production-verified yet.

| # | Scope | Status | Evidence / remaining gate |
|---:|---|---|---|
| 1 | PR latest document order | implemented / local UAT passed | Migration 184 sorts generated natural request keys before pagination; 390px default and reversed directions passed. Linked migration remains open. |
| 2 | PR rejected reason | implemented / local UAT passed | Main workspace shows latest reason, actor, time, and correction path; timeline remains audit truth. |
| 3 | PR useful summary | implemented / local UAT passed | Date, location, lines, suppliers, and permitted estimated total are grouped in Request Summary. |
| 4 | Document breadcrumb duplication | implemented / local UAT passed | Document workspace identity is the document number only. |
| 5–6 | PO duplicate Add line/helper | implemented / local UAT passed | Header action and redundant helper removed; one line-area action remains. |
| 7 | Non-semantic exception color | implemented / local role UAT passed | Dashboard signals no longer inherit warning color without an actionable warning. |
| 8 | Dashboard duplication | implemented / local role UAT passed | Today’s work owns actionable tasks; exceptions and role trends own distinct metrics across the six-account dashboard suite. |
| 9 | Supplier AutoCount code | implemented / Production data blocked | List always identifies the creditor code or explicitly says `AutoCount code missing`; BWY/CILANTRO values require real Production evidence. |
| 10 | Supplier short name | implemented / local UAT passed | `supplier_group` is explicitly labelled and editable as Item Group / Short Name; formal name and creditor code remain authoritative. |
| 11 | Searchable supplier item | implemented / local keyboard UAT passed | Native item select replaced by searchable name/code/brand combobox. |
| 12 | Base UOM ownership | implemented / local UAT passed | Item Master Base UOM is read-only in mapping with an explicit Item Master link. |
| 13 | Natural Item Code sorting | implemented / local UAT passed / linked migration blocked | UI fallback and migration 183 provide numeric natural order with a stable ID tie-breaker. |
| 14 | Item action-rail rhythm | implemented / four-viewport local UAT passed | Primary, Sourcing, More Options, and Metadata retain one visible hierarchy with converged spacing and no overflow. |
| 15,19 | Stock basket entry duplication/color | implemented / four-viewport local UAT passed | One responsive basket entry is visible per breakpoint; FAB uses brand-neutral styling. |
| 16 | Filter density/count wrapping | implemented / four-viewport local UAT passed | Shared search/reset slot and two-line narrow record count are in shared components/CSS. |
| 17–18 | Basket summary/noise | implemented / four-viewport local UAT passed | Summary is Location / Suppliers / Items; device and split-copy noise removed. |
| 20 | Stock action gutter | implemented / four-viewport local UAT passed | Shared table/action spacing remains the authority and edge-clearance checks pass. |
| 21 | Calendar history and Qty Sent gaps | implemented / local role UAT passed | History date changes the seven-day window; privileged sent-state filter and row status added. Edit audit remains on the existing authorized record workflow. |
| 22 | Misleading 0% | implemented / local data UAT passed | A zero denominator displays Unavailable and is excluded from trends; real zero remains distinct. |
| 23–25 | PR supplier identity/filter/urgency | implemented / local flow UAT passed | Supplier-scoped item choices, readable option metadata, server revalidation, and semantic urgency menu are retained. |
| 26 | PO details disclosure | implemented / four-viewport local UAT passed | Collapsed summary shows branch, supplier, order, and delivery date; required fields remain visible through validation. |
| 27 | Inventory chart gold | implemented / local viewport UAT passed | Outbound series uses neutral gray and inbound remains brand green at portrait tablet, landscape tablet, and desktop widths. |
| 28 | Procurement metric convention | implemented / local viewport UAT passed | Nonzero queue values remain neutral at portrait tablet, landscape tablet, and desktop widths. |
| 29 | Search/Reset shared position | implemented / local viewport UAT passed | Active filters swap Search for Reset in the same shared desktop command slot. |
| 30 | PR structured validation | implemented / local failure-path UAT passed | Field/line validation and first-error focus are retained; generic-only failure is rejected. |
| 31 | PR mobile hierarchy | implemented / 390px local UAT passed | Two-level rows use location/date, supplier/item count, submitted-by, status, and chevron. |

Release gate: focused contracts, complete static gates, four viewports, six roles, linked migration 183, real supplier-code inspection, Production footer, and Production workflows must pass before any row is promoted to `production verified`.

Local evidence on 2026-08-21: v8.64.103 passes 828/828 unit and contract tests, strict typecheck, lint, production build, and `git diff --check`. Migration 182 and 183 applied successfully to the isolated local Supabase database; the CLI then returned a telemetry shutdown timeout after reporting both migrations applied. Authenticated Dashboard/P0 browser coverage passed all executed scenarios across six roles and the 390×844, 820×1180, 1180×820, 1440×900 and wide-canvas checks. v8.64.103 removes the remaining fixture holes: the five formerly skipped guided-review/comment/outlet scenarios pass 5/5, and the Manager Review role-boundary scenario passes 1/1. None of this is linked, remote, or Production verification.

## v8.64.101 visible PR rejection reason

| Gate | Status | Evidence |
|---|---|---|
| Rejected PR shows the entered reason in the main workspace | implemented / awaiting authenticated UAT | Detail page reads the latest `activity_type = rejected` event, strips the technical prefix, and shows the reason with actor and timestamp in an inline danger notice. Document Timeline remains the audit source. |

## v8.64.100 canonical UOM selection

| Gate | Status | Evidence |
|---|---|---|
| `BTL` and `BOTTLE` represent one UOM | implemented / awaiting linked migration and authenticated UAT | `normalizeUom` canonicalizes `BTL` to `BOTTLE`; supplier-item, PR-line repair, master-data writes, and import writes use the canonical value. Migration 182 safely canonicalizes legacy supplier/document rows without changing quantity, cost, or conversion factors. |
| PR review UOM is controlled, includes `GUNI`, and is alphabetically ordered | implemented / awaiting authenticated viewport UAT | Guided review now uses a native dropdown sourced from current item UOMs, active supplier terms, and the shared catalogue. `GUNI` is included as a controlled option; free-text UOM entry is removed and options are sorted by initial letter. |

## v8.64.99 unified route loading

| Gate | Status | Evidence |
|---|---|---|
| Dashboard, Outlet Daily, Stock Counts, and finance report preloader geometry | implemented / awaiting authenticated viewport UAT | All route-level loading boundaries now use the shared `PageLoadingState` with the same compact progress line, spinner size, status semantics, and spacing. Route-specific labels remain contextual. Local test, typecheck, lint, and build evidence pending this batch; browser/UAT remains separate. |
| Oversized skeleton/centered-spinner initial states | implemented / awaiting authenticated viewport UAT | AP Aging, Cash Flow Forecast, Outlet Daily, and Stock Count loading boundaries no longer render independent skeleton bands or centered spinner layouts. |

## v8.64.98 supplier UOM receiving conversion

| Gate | Status | Evidence |
|---|---|---|
| Purchase UOM and inventory base UOM are distinct | implemented / awaiting authenticated UAT | Supplier-item mappings already persist `purchase_uom` and `conversion_to_base_uom`; PR/PO continue to require the supplier purchase UOM, while Goods Receiving now presents the Item Master base UOM for operator entry and converts the submitted quantity back to the PO UOM for traceability. The atomic GRN posting path then converts the supplier quantity into base-unit inventory and divides unit cost by the same factor. Local evidence: `npm test` 818/818, typecheck, lint, and production build passed; browser/UAT is still pending. |
| Missing CTN/BAG/TUB supplier terms are actionable | implemented / data or migration blocked until factor is supplied | PR readiness and line recovery now explain that a supplier item must be updated with the requested purchase UOM and an authoritative conversion to the Item Master base UOM; no packaging factor is invented. The current CHYI NING rows in the repository seed only prove KG terms, so CTN/BAG/TUB remain data blockers until the real supplier conversion is entered. |
| Receiving without a supplier-to-base conversion | fail-closed / awaiting authenticated UAT | Receiving shows the missing conversion beside the affected line and disables base-unit entry. The server-side posting RPC retains its existing explicit `Supplier UOM conversion is missing` failure. |

## v8.64.97 supplier identity relationship consolidation

| Gate | Status | Evidence |
|---|---|---|
| Duplicate suppliers with existing item relationships | implemented / awaiting linked migration and Production data verification | Migration 181 repoints supplier-item, branch mapping, item, request, PO, GRN, return, invoice, and external-reference relationships to one active canonical supplier, archives conflicts recoverably, and records each relationship change. This is not Production-verified until linked migration status and authenticated supplier/item queries confirm one operational identity. |
| Supplier Items search by Item Group / AutoCount code | implemented / awaiting deployed viewport UAT | The server-side search projection now includes `supplier_group` and `supplier_code`; `400-C005` and `CHYINING` are searchable without changing the visible operator-facing Item Group convention. |

## v8.64.96 active supplier identity view

| Gate | Status | Evidence |
|---|---|---|
| Duplicate suppliers visible after merge | implemented / awaiting deployed viewport UAT | Migration 173 left one active canonical supplier and retained inactive historical rows for recovery. The Supplier register now defaults to Active and keeps All statuses as an explicit option, so operators see one usable identity while audit history remains available. |

## v8.64.95 structured brand migration compatibility repair

| Gate | Status | Evidence |
|---|---|---|
| Migration 176 Items workspace brand patch | implemented / awaiting linked migration retry and Production UAT | Remote push applied migrations 173–175, then migration 176 stopped because the `get_items_workspace` patch expected CRLF-specific function text. The repair uses a whitespace-tolerant SQL-shape patch and leaves the existing function guard in place. Local migration replay and full static gates must pass before the user retries `db push`; no Production claim is made yet. |

## v8.64.94 supplier merge mapping guard repair

| Gate | Status | Evidence |
|---|---|---|
| Migration 173 duplicate supplier consolidation | implemented / awaiting linked migration and Production data verification | The first linked push attempt stopped because a bulk PR-line supplier update violated the branch/item mapping trigger (`A selected supplier is not mapped to this purchase request branch and item.`). The repair keeps the guard enabled, repoints only canonical mappings that match branch, item, and supplier UOM, and clears unresolved supplier references with `supplier_merge_line_audit` plus a visible repair remark. Local disposable `db reset` completed through migration 181; linked migration status and Production rows are not yet verified. |

Do not mark this gate Production-verified from source, local reset, or the failed push. After the repaired migration is pushed, confirm linked migrations 173–180, then inspect audit rows and affected PR lines before retrying AutoCount Confirm.

## v8.64.93 supplier identity and filter apply repair

| Annotation | Status | Evidence / action |
|---|---|---|
| Supplier Items `BWYHOLDI00003` opened as QUIK instead of BWY Holdings | implemented / awaiting linked migration and Production UAT | Local seed audit found three active supplier-item rows for the same item/code: BWY placeholder, BWY Holdings creditor `406-B003`, and Quik `400-Q001`. Migration 180 keeps the recoverable canonical BWY Holdings relationship, retires the placeholder and exact Quik collision, and moves branch mappings before soft-archiving. Linked migration application remains unverified. |
| Reset geometry and filter re-application | implemented / awaiting authenticated viewport UAT | Shared `MasterDataFilters` now keeps Search as the primary action and adds a same-height secondary Reset action when filters are active. The shared header reserves command tracks for both actions so selecting another filter no longer requires resetting first. |

Batch evidence: `npm test` 813/813, typecheck, lint, production build, and the full local authenticated annotation rerun (18/18 across current, historical, reopened, and four viewport scenarios) passed. The new Supplier Items/Items browser comments were not called Production-verified: the public preview route still returned the Vercel login wall to direct verification, and `supabase migration list --linked` remained blocked by `LegacyDbConfigLoginRoleNetworkError` after the CLI login claim.

## v8.64.92 annotation rerun evidence refresh

All 18 current, historical, and reopened local authenticated browser scenarios reran after migration 179 with zero failures. This confirms local regression only; linked migration and Production deployment remain separate.

## v8.64.91 bounded inventory read repair

The local Purchasing mutation workflow posted a supplier return, but its Movement Ledger verification initially hit the fail-closed unavailable state because the bounded read RPC spent roughly 56 seconds in repeated authenticated RLS checks. Migration 179 changes only the bounded read function execution mode to `SECURITY DEFINER`; explicit `can_access_inventory_branch()` authorization remains inside the function. After local application, the same authenticated read returned the exact `ST-PRT/AUG26/004-4798` row in 58ms; this is local evidence only, not Production evidence.

| Gate | Status | Evidence |
|---|---|---|
| Purchasing Movement Ledger after supplier return | verified locally / linked migration and Production UAT pending | Local migration 179 applied; authenticated Purchasing RPC returned one exact return row in 58ms and the mutation suite passed. The linked project still cannot be read through the Management API, so no remote or Production claim is made. |

The post-179 local authenticated annotation rerun completed all 18 current/historical/reopened browser scenarios with zero failures. This refreshes local evidence only; the observed Production artifact and linked migration state remain separate gates.

## v8.64.90 workflow mutation gate repair

The local authenticated mutation gate was corrected to exercise the visible reject trigger before filling its modal reason, to match the rendered return movement label case-insensitively, and to assert the exact changed stock-count item rather than unrelated variance lines in the same disposable count. This is test-evidence repair only; linked migration and Production UAT remain separate gates.

This is an evidence ledger, not a completion claim. A build, source inspection, or unauthenticated route load does not prove a responsive or role workflow is accepted.

Status vocabulary:

- `verified`: reproduced in the stated real viewport/role and passed the relevant interaction.
- `implemented / awaiting UAT`: source owner changed and static gates pass; visual or workflow acceptance is still required.
- `not verified`: no current evidence sufficient for acceptance.
- `blocked`: a named dependency prevents verification.

## v8.64.83 historical scope reconciliation

The historical annotation scope is intentionally cumulative. No earlier screenshot batch is dropped when a newer batch is added:

| Historical scope | Coverage retained | Current evidence boundary |
|---|---|---|
| 17-comment group | Shared list/filter/table density, Dashboard hierarchy and colors, PR creation/sourcing/actions, reject-dialog ordering, Outlet export/layout/table. Covered by `latest-annotation-polish-contract.test.js`, `round2-priority-annotations-contract.test.js`, the four-viewport register audit, and the reopened browser suite. | Local source/viewport evidence is retained; valid PR submission, full Outlet export mutation, role transitions, and Production UAT are not claimed. |
| 34-comment group | Outlet chart/top bar/actions, Branch/table, AP Aging/PO/Recipe alignment, PR/Stock Balance/Supplier Items tables, role/login/right-rail issues. Covered by `historical-annotation-closure-contract.test.js`, `latest-annotation-polish-contract.test.js`, and the four-viewport register matrix. | Local geometry and contracts are retained; end-to-end maintenance, role workflow, and Production data evidence remain awaiting or blocked. |
| 13-comment group (2026-08-20) | Dashboard unread badge, Imports rounding, AutoCount right rail, PR comments/dialog/Qty-UOM/supplier mapping, backdrop, 36px controls, PO chevron, PR section language. Covered by `annotation-v8-64-66-uat.spec.js`, `reopened-annotation-uat.spec.js`, and rows `UI-0820-01` through `UI-0820-13`. | Local authenticated evidence is retained for the exercised cases; Production deployment is still observed at v8.64.68 and cannot be called verified. |
| Reopened defects | Dashboard duplicate queue, Outlet chart/rail, Staff register, PR inline validation. Covered by `reopened-annotation-uat.spec.js` and rows `UI-0819-R1` through `UI-0819-R4`. | Local authenticated checks are retained; Production recheck remains pending. |

The v8.64.79 local authenticated run completed all 18 historical/current browser scenarios before this reconciliation. This updates stale wording below from “browser proof pending” to “verified locally / Production UAT pending” where the same evidence applies; it does not convert any local result into Production proof.

## v8.64.84 supplier mapping fail-closed batch

| Gate | Status | Evidence |
|---|---|---|
| AutoCount source rows without creditor identity | implemented / awaiting authenticated Preview UAT | Read-only analysis of the supplied 729-row Item List found 101 blank `Main Supplier` cells; six groups (`CHINA`, `FINISHED`, `FROMPNG`, `KWANKEE`, `OLDSUPP`, `PAHANG`) have no creditor reference anywhere, covering 86 rows. Of the 403 unique item codes present in the two Central Kitchen workbooks, 19 have a blank Main Supplier in the Item List. The analyzer now blocks each affected item row with a `missing_supplier_reference` issue and an exact repair action; it no longer treats Item Group as an internal supplier code. Existing groups with an authoritative creditor reference continue through staging. |

## v8.64.85 AutoCount Confirm identity guard

| Gate | Status | Evidence |
|---|---|---|
| Direct/older ready jobs cannot bypass supplier identity validation | implemented / awaiting linked migration application and authenticated Confirm UAT | Migration 177 patches the atomic `apply_autocount_import_job` boundary to reject staged supplier rows whose `external_refs` array is empty, using a recoverable validation error. The source contract passes locally; linked migration application and a real authenticated Confirm remain unverified. |

## v8.64.86 role workflow evidence batch

| Gate | Status | Evidence |
|---|---|---|
| Six scoped role workspaces | verified locally / Production UAT pending | Disposable authenticated Playwright checks passed for Super Admin, Finance, Manager, Purchasing, Kitchen, and Outlet (8 non-destructive scenarios). Each role retained one responsive workdesk and safe destinations. Production role UAT is not claimed. |
| Manager approval mutation, manager reject mutation, and purchase-return/stock-count posting mutations | mixed: approval fixture awaiting; reject/return/count verified locally / Production UAT pending | With the explicitly enabled disposable local fixture, Manager reject, Purchasing purchase return, and Kitchen stock-count posting each passed after the visible modal/read-path repairs. Manager approval still lacks a named disposable fixture. No Production mutation is claimed. |

## v8.64.87 Stock Balance reliability batch

| Gate | Status | Evidence |
|---|---|---|
| Stock Balance item-image hydration stays usable with many rows | verified locally / Production UAT pending | A local authenticated dynamic workflow surfaced an optional `URI too long` image query warning. The shared inventory query now reads image IDs in bounded batches of 100 and keeps the image read optional; the targeted contract passes. The dynamic workflow layout still passed at phone/tablet/desktop, while Production regression remains pending. |

## v8.64.88 AutoCount mapping identity batch

| Gate | Status | Evidence |
|---|---|---|
| Branch mappings retain internal creditor code and display Item Group separately | implemented / awaiting linked migration and authenticated Preview UAT | The parser previously copied Item Group into `branch_mapping.normalized.supplier_code`; it now uses each item row's authoritative Main Supplier code and stores Item Group only in `supplier_group`. Missing per-item Main Supplier values create blocking, row-specific repair issues even when a sibling item in the same group has a creditor reference. Contract coverage passes 16/16. Linked Production migration/data and real Preview remain unverified. |

## v8.64.89 supplier-UOM return mutation batch

| Gate | Status | Evidence |
|---|---|---|
| Purchase Return supplier-UOM posting reaches the conversion path | verified locally / linked migration and Production workflow UAT pending | The local mutation gate reproduced PostgreSQL `column reference "po_line.id" is ambiguous` in `post_purchase_return_atomic`. Migration 178 adds an idempotent forward patch that renames only the SQL JOIN alias to `pol`; local migration 178 applied and the authenticated Purchasing return mutation passed. No linked Production claim is made. |

## Historical screenshot groups reconciled — v8.64.67

### v8.64.74 current evidence reconciliation batch

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-13 | Stock-take PDF item-code coverage and brand/name evidence are recorded without treating local seed data as Production tally. | data reconciliation prepared / Production read blocked | Known-prefix extraction records 133 codes in the August PDF (128 local-seed matches, 5 local-seed gaps) and 127 codes in the PJS10 PDF (127 local-seed matches). Brand-like tokens remain in source descriptions; no structured brand mutation was performed. |

### v8.64.75 current brand visibility batch

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-14 | Kitchen users can see an item brand without relying on ambiguous AutoCount codes, and imports never guess a brand from a description. | implemented / awaiting linked migration and authenticated UAT | Migration 176 adds nullable `items.brand_name`, updates Item Master/detail/list/picker/search, and carries the field through operational item creation and AutoCount Confirm. The parser accepts only explicit `Brand`, `Brand Name`, or `品牌` headers; no description heuristic is present. Local migration execution and rollback-only Item/AutoCount RPC fixtures now pass. Existing rows remain blank until authoritative source data or an authorized edit supplies a value. Linked migration application, real import preview/confirm with a Brand column, and four-viewport kitchen UAT remain pending. |

### v8.64.77 migration validation reconciliation

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-16 | The prior tablet 44px choice is superseded by the later global 36px visual-height requirement. | superseded by UI-0821-15 | v8.64.76 applies the shared 36px visual rhythm to tablet/desktop query controls and right-rail actions; phone touch-safe controls remain larger. The stale v8.64.71 wording is retained only as history. |

### v8.64.78 supplier UOM runtime reconciliation

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-09 | PR/PO/GRN keeps supplier purchase UOM visible while inventory posting uses the item base/KG unit. | implemented / awaiting linked migration and authenticated workflow UAT | Corrected migration 175 declares the purchase-order line row used by return conversion. A rollback-only local PO → GRN fixture posted 2 CTN × 12 = 24 KG at RM10 per KG (RM240 total) and rolled back all rows. Linked migration application, authenticated PR/PO/GRN/return workflow, and Production verification remain pending. |
| UI-0821-12 | Supplier UOM and internal base-unit cost semantics are explicit and fail closed when conversion is missing. | implemented / awaiting linked migration and authenticated workflow UAT | Local contract test plus the same rollback-only posting fixture prove conversion and cost normalization; no data was changed. Production migration/UAT are not claimed. |

### v8.64.79 authenticated UAT fixture reconciliation

| Gate | Status | Evidence |
|---|---|---|
| Local authenticated annotation browser suites | verified locally / Production UAT pending | The disposable super-admin password contains a literal trailing `#`; the previous parser truncated it as a comment and caused `Invalid login credentials`. The parser now treats only whitespace-prefixed `#` as a comment marker, matching the other test parsers. After the fix, the 9 v8.64.66/67 annotation scenarios and 9 historical/reopened annotation scenarios each completed with exit code 0. This restores trustworthy local UAT setup but is not Production authentication evidence. |

### v8.64.80 Production deployment audit

| Gate | Status | Evidence |
|---|---|---|
| Observed Production artifact | blocked / not deployed to observed host | Read-only `https://system.seribako.com.my/login` HTML includes footer `v8.64.68`, while the authorized branch remote is `4e924244` (v8.64.79). Vercel connector access returns project `404` and an empty project list for the configured team, so no deployment or post-deploy authenticated UAT is claimed. |

### v8.64.81 supplier mapping data audit

| Gate | Status | Evidence |
|---|---|---|
| All item and supplier mappings | data blocked / Production read pending | Read-only local mirror audit: 323 active items, 38 without an active supplier-item record; 425 active supplier-item records, 233 without an active branch mapping; 193 are mapped across CK-ALMA and CK-PJS10. Live normalized supplier-name duplicates are 0 after the recoverable merge contract. No mapping was fabricated because the intended supplier/branch cannot be proven from the source mirror. |

### v8.64.82 Central Kitchen tally evidence

| Gate | Status | Evidence |
|---|---|---|
| Latest two Central Kitchen stock takes reconcile to OMS | data/Production read blocked | Read-only local mirror query found no 2026-08-19 Stock Count for CK-ALMA or CK-PJS10. Latest posted rows are `SC/AUG26/012` CK-ALMA on 2026-08-17 (147 lines) and `SC/AUG26/007` CK-PJS10 on 2026-08-06 (116 lines); inventory movements likewise stop at 2026-08-16 and 2026-08-06. The PDF values and names remain evidence inputs, not proof of OMS tally. |

### v8.64.76 current control rhythm batch

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-15 | Button, filter, textbox, and right-rail action visuals use one 36px height across tablet and desktop while phone touch controls remain accessible. | verified locally / Production UAT pending | Shared design-system authority applies 36px to tablet/desktop query controls and right-rail actions; phone controls retain 44px/48px touch-safe rules. The 18-scenario authenticated local annotation run exercised the four required viewports for the relevant surfaces. Production route-wide UAT remains pending. |

### v8.64.73 current workflow closure batch

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-12 | Supplier purchase UOM remains visible on procurement documents while internal inventory posting uses base/KG units. | implemented / awaiting migration and authenticated workflow UAT | Migration 175 replaces GRN and purchase-return posting with tenant-scoped supplier-item conversion, converts quantity and unit cost, and fails closed when a non-identity conversion is absent. Local contract passes; linked application and a disposable PO→GRN→return fixture remain pending. |

### v8.64.72 current annotation closure batch

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-10 | PR Requested Items has a visible row index plus total requested-item count, including unresolved lines. | implemented / awaiting Production viewport UAT | Desktop table adds a `#` column; compact layout labels each line as `Item N`; unresolved lines continue numbering after catalog lines. Source/test gates remain pending in this batch. |
| UI-0821-11 | Supplier/UOM and non-catalog mapping exceptions use the red danger semantic; retryable stock reads remain warning. | implemented / awaiting Production viewport UAT | Compact PR review mapping and non-catalog messages now use `--sb-danger`; the retryable stock-unavailable message remains `--sb-warning` by intent. |

### v8.64.71 current annotation closure batch

| ID | Acceptance | Status | Evidence |
|---|---|---|---|
| UI-0821-01 | PR detail shows an index/count for all requested items. | implemented / awaiting Production viewport UAT | Header now shows `Requested Items · N items` using catalog plus unresolved lines; source and local gates pending. |
| UI-0821-02 | Supplier-mapping CTN/UOM exceptions use the danger treatment and explain branch/UOM impact. | implemented / awaiting Production viewport UAT | New PR and guided recovery surfaces use shared danger tokens, direct cause, and a right-aligned mapping action. |
| UI-0821-03 | PR new supplier-selection error explains the mismatch and repair action. | implemented / awaiting authenticated mutation UAT | Server action now states the one-supplier rule and tells the operator to reselect a compatible supplier/item set; existing inline focus remains. |
| UI-0821-04 | Supplier duplicates use one canonical identity; AutoCount code is internal and Item Group is the visible label. | data-or-migration blocked | Import staging now separates `supplier_code` (AutoCount code) and `supplier_group` (Item Group). Migration 174 adds/backfills the column and keeps merge 173 recoverable. Linked migration application and Production row verification remain blocked by Supabase Management API login-role transport failure. |
| UI-0821-05 | PR list filter grammar is shared and balanced; Production Jobs has inward tablet gutters. | implemented / awaiting Production viewport UAT | PR list adopts the shared balanced filter authority; Production Jobs changes from full to contained tablet canvas. |
| UI-0821-06 | Stock Count portrait tablet search occupies its own row before filters/actions. | implemented / awaiting 820×1180 authenticated UAT | Shared filter class adds a portrait-query rule; no route-specific control markup was added. |
| UI-0821-07 | Desktop controls are 36px; tablet choice remains explicit. | superseded by UI-0821-15 | This historical wording was replaced by the later global requirement for a 36px visual rhythm across tablet and desktop; see UI-0821-15 and v8.64.77 reconciliation. |
| UI-0821-08 | Latest two Central Kitchen stock-take PDFs reconcile to OMS and naming includes kitchen brand visibility. | blocked by linked read-only Production data | Read-only extraction found 5 pages / 158 extracted lines in `AUGUST - Copy of 1608.pdf` and 5 pages / 132 extracted lines in `STOCK TAKE PJS10 CK - 19 Aug（副本）.pdf`. A known-prefix parser found 133 item codes in the first (128 present in the local seed mirror; missing `CHYINING00045`, `CHYINING00048`, `CHYINING00056`, `CHYINING00057`, `CHYINING00061`) and 127 in the second (127 present in the local seed mirror). Names visibly carry brand tokens such as CAP SAUH, BABAS, CHEK HUP, PENANG ANCHOR, and BRUGGEMAN, but the current Item Master has no structured brand field. This session lacks a valid authenticated Production tally query after the Supabase login-role transport failure, so no count, rename, or brand mapping was fabricated. |
| UI-0821-09 | PR supplier UOM follows supplier purchase UOM while internal calculations remain base/KG. | implemented in data contract / awaiting workflow UAT | Existing `supplier_items.purchase_uom` and `conversion_to_base_uom` remain the purchase-facing route; Stock Count/inventory ledger stays base-unit authoritative. UI now explains incompatible supplier UOM instead of silently treating it as a mapping. Controlled PO/GRN conversion workflow still needs authenticated fixture verification. |

### v8.64.70 Production follow-up annotations and supplier consolidation

| Acceptance | Status | Evidence |
|---|---|---|
| Exact duplicate live supplier names are merged without deleting commercial history. | data-or-migration blocked | Migration 173 selects one company-scoped canonical supplier, moves document/item/external-reference ownership, reconciles overlapping supplier-item and branch mappings by soft retirement, stores both pre-merge supplier snapshots in `supplier_merge_audit`, and adds a live normalized-name uniqueness guard. Local migrations 171–173 applied and a transaction-created duplicate fixture passed the merge/audit assertions before `ROLLBACK`. Linked Production remains unchanged: compatible CLI 2.115 currently fails at the Supabase Management API `login-role` call with `LegacyDbConfigLoginRoleNetworkError / TransportError`, and the saved pooler URL requires a database password that is not available in this session. |
| PR Review and apply no longer rejects a valid Supabase `updated_at` offset as `Invalid input`. | implemented / awaiting authenticated mutation UAT | The action now accepts ISO datetime offsets before invoking the recoverable migration-170 RPC. A real line mutation must pass after deployment before this becomes verified. |
| Requested Items combines Qty and UOM so Supplier retains usable width. | implemented / awaiting Production viewport UAT | Desktop table uses one `Qty / UOM` header and one compact value cell; phone presentation was already combined. |
| Guided review dialog is narrower without losing the complete workflow. | implemented / awaiting Production viewport UAT | Desktop cap changes from 72rem to 60rem while retaining the viewport-bound `calc(100vw - 2rem)` rule and scrollable body/footer. |
| Dashboard Low stock uses the critical exception color rather than yellow warning. | implemented / awaiting Production viewport UAT | Low stock explicitly requests the shared critical/danger semantic token; unavailable data remains warning-colored. |

### v8.64.69 AutoCount Production identity recovery

| Acceptance | Status | Evidence |
|---|---|---|
| Production Confirm for job `620fbc6a-0ad1-4f26-aa43-d38987251d8b` exposes and resolves its real blocker without duplicate master data. | verified complete | First authorized Confirm failed atomically with PostgreSQL `23505`: supplier `5e868b4f-afa7-42bf-8563-daabb090df86` and supplier item code `FROMPNG00011` already existed. Read-only evidence showed the active mapping referenced soft-deleted item `f6a84f5f-85aa-45d0-9312-a3d8488c20e9`; staged row 520 matched code, name `Anchor unsalted Butter`, and UOM `KG` exactly. Job-specific migration 172 restored that proven identity and remote history reports `172/172`. The authorized retry persisted `completed` at `2026-08-21T01:22:47.776199+08:00`: 424 items created, 305 updated, 28 suppliers created, 26 updated, 507 supplier items created, 418 branch mappings created, 0 UOM conversions, and **0 inventory movements**. Blocking issues remained empty. |

The user re-supplied three annotation galleries containing 17, 34, and 13 comments. The original task record was reread to recover comment text, route, viewport, selector, and screenshot context. A thumbnail, source file, or previous passing test is not treated as current Production verification.

| Recovered group | Reconciliation status | Remaining or current evidence |
|---|---|---|
| 17-comment group: PR list/filter/table density, Dashboard duplication/colors, PR create sourcing/actions, reject dialog/order, Outlet export/layout/table | mixed: accepted regression locks retained; remaining Production UAT incomplete | PR list layout remains untouched because the user explicitly accepted the later repair. Shared filter/table authorities, 10px headers, Dashboard de-duplication, bottom Add line, one-supplier PR sourcing, and Outlet responsive analytics have local contract/UAT evidence. Production recheck and full Outlet export mutation flow remain open. |
| 34-comment group: Outlet chart/topbar/actions, Branch tablet/table, AP Aging/PO/Recipe alignment, PR/Stock Balance/Supplier Items tables, role/login/right-rail issues | mixed: mostly implemented or locally verified; workflow/data gates remain | Four-viewport register audit previously passed for the named 20 registers. v8.64.67 additionally groups Stock Balance values and Stock Count identity/submitter. Supplier Items update, login, role transitions, and data reconciliation require authenticated workflow evidence rather than geometry alone. |
| 13-comment group from 2026-08-20 | see the itemised UI-0820 table below | Seven focused authenticated checks passed locally; comments clipping, cross-dialog sampling, linked migrations, and Production remain explicitly open. |

### v8.64.67 newly closed source gaps

| Acceptance | Status | Evidence |
|---|---|---|
| Outlet wastage details retract and stale validation values clear when wastage returns to zero. | verified locally / production awaiting UAT | Authenticated browser interaction changed wastage 1 → reason selected → 0 and confirmed details retract and stale values clear. |
| Stock Balance shows Available+Reserved and Avg Cost+Value as compact paired fields without duplicate columns. | verified locally / production awaiting UAT | Shared table and operational-row owner updated; authenticated geometry/content checks passed at all four required viewports. |
| Stock Count shows SC number and submitter in one field. | verified locally / production awaiting UAT | Register header and row grammar updated; authenticated geometry/content checks passed at all four required viewports. |
| Supplier lifecycle destructive controls are hidden without supplier update permission. | implemented / awaiting role UAT | Server-rendered permission check gates lifecycle panel and Save action; contract added. |

### Data and cost evidence added in v8.64.67

| Acceptance | Status | Evidence |
|---|---|---|
| 19 Aug Outlet Daily wastage and percentage are real, not fabricated or directly edited. | verified against read-only local cloud-data mirror / production awaiting UAT | Tenant-safe read-only query found 51 verified lines per outlet and zero unverified lines. TRX is legitimately 100% because received=40 and wastage=40. Other totals: Gurney 196/122 (62.2449%), IOI Puchong 126/54.5 (43.2540%), Jakel 108/86 (79.6296%), Mid Valley 242/28 (11.5702%), Publika 140/84.1 (60.0714%), Queensbay 219/115.2 (52.6027%), Sunway Velocity 125/0 (0%). No data was changed. |
| PR estimated cost does not overwrite master or actual inventory cost. | verified by source/SQL contract / production awaiting UAT | PR revisions write only `purchase_request_lines.estimated_unit_cost`; no item-master write is present. |
| Actual purchasing cost becomes operational only after controlled GRN posting. | verified by source/SQL contract / production awaiting UAT | `post_goods_receiving_atomic` posts each accepted line through `insert_inventory_movement(... line.unit_cost ...)`; inventory average cost is computed from posted inbound ledger purchase cost. |
| AutoCount does not overwrite existing item cost. | implemented / awaiting migration UAT | Migration 171 now seeds standard cost only when creating a new item; updates to existing items preserve their controlled master cost. A SQL source contract protects this boundary. Linked remote migration remains blocked, so no remote claim is made. |

## Latest production annotations — v8.64.66

These rows reconcile the 13 comments captured from `system.seribako.com.my` on 2026-08-20. `Implemented / awaiting UAT` means the source owner and contract were updated; it does not mean Production changed or passed.

| ID | Production annotation / acceptance | Status | Current evidence |
|---|---|---|---|
| UI-0820-01 | Dashboard Workspace Updates unread badge returns to red; Manager, Purchasing, and Finance workflow states keep their own semantic colors. | verified locally / production awaiting UAT | Authenticated 1440×900 browser check confirmed the unread badge computes to `rgb(180, 35, 24)`; workflow-state token ownership remains unchanged. Production recheck pending. |
| UI-0820-02 | Imports overview AutoCount Direct Import directory surface has the canonical rounded panel. | verified locally / production awaiting UAT | Authenticated 1440×900 browser geometry confirmed a non-zero canonical panel radius and no page overflow. Production recheck pending. |
| UI-0820-03 | AutoCount staging error appears in the right panel. | implemented / awaiting UAT | AutoCount rail renders `Import error` after Actions and before status. Live staging-unavailable reproduction pending. |
| UI-0820-04 | AutoCount keeps the right panel at 820×1180 portrait tablet. | verified locally / production awaiting UAT | Authenticated 820×1180 browser geometry confirmed the visible rail, Actions before Import status, rail width >=180px, and no page overflow. |
| UI-0820-05 | PR detail Comments remains fully scrollable and its lower content is not clipped. | verified locally / production awaiting UAT | Authenticated 820×1180 browser check scrolled the portrait rail to the Comments textarea and lower Add comment action; both remained visible, the section did not use hidden vertical overflow, and the page had no horizontal overflow. Comment mutation was not performed. |
| UI-0820-06 | Guided PR review presents Quantity and UOM as one compact field group. | verified locally / production awaiting UAT | Authenticated guided-review browser check found one visible `Quantity / UOM` group. Mutation submission remains outside this geometry probe. |
| UI-0820-07 | Create supplier mapping sits beside the `Needs supplier setup` guidance. | verified locally / production awaiting UAT | Authenticated guided-review browser check confirmed the mapping link is visible in the Supplier guidance row. Navigation/mutation remains pending. |
| UI-0820-08 | Guided PR review offers real supplier choices, not only `Needs supplier setup`. | verified locally / production awaiting UAT | Authenticated cloud-data mirror check confirmed the real supplier catalogue is non-empty and the selector contains options beyond `Needs supplier setup`. Production data recheck pending. |
| UI-0820-09 | Guided PR review dialog uses a complete large working area. | verified locally at desktop and portrait tablet / phone and landscape tablet awaiting UAT | Authenticated checks confirmed width >900px at 1440×900 and >700px at 820×1180, bounded inside the viewport with the final Apply action visible. |
| UI-0820-10 | All dialog/filter backdrops use a black translucent overlay, not green. | verified for guided PR and Filter More samples / production awaiting UAT | Native guided dialog computed backdrop is `rgba(0, 0, 0, 0.6)` at 820×1180 and 1440×900; shared Filter More overlay sampling also passed. Remaining uncommon dialogs are not claimed page-by-page. |
| UI-0820-11 | Buttons, filters, and textboxes use a shared 36px visual height on tablet/desktop while phone stays touch-first. | verified locally for exercised routes / Production UAT pending | Authenticated PR/PO and historical register checks passed at 390×844 (48px) and 820×1180, 1180×820, 1440×900 (36px), without page overflow. Unexercised routes and Production remain open. |
| UI-0820-12 | PO new has no unexplained 44px chevron/disclosure control. | verified locally / production awaiting UAT | Authenticated PO-new checks at all four required viewports found no disclosure/chevron control and no page overflow. |
| UI-0820-13 | PR new Request details and Requested Items use one section/header language. | verified locally / production awaiting UAT | Authenticated PR-new checks at all four required viewports confirmed matching computed header backgrounds and stable control geometry. |

### Data, workflow, and production gates retained

| Gate | Status | Evidence / blocker |
|---|---|---|
| Migration 170 linked remote state | verified complete | Compatible CLI 2.115.0 connected to confirmed project `nnvdsaftiwpqkekjfrgc` (`Seri Bako Project`) and reported local/remote `170/170`. The earlier failure was isolated to repository CLI 2.109.1. |
| Real guided PR repair | verified read-only / mutation UAT incomplete | Authenticated remote Super Admin opened the real guided review surface, real supplier choices, quantity/UOM group, mapping entry point, and complete dialog at desktop and 820px. Applying a line mutation still requires a named disposable PR fixture and is not claimed. |
| AutoCount Preview → validation → Confirm | verified on disposable local cloud-data mirror / remote blocked | Authenticated probe proved file/row/actionable validation, ready preview, one Confirm, and `inventoryMovementsCreated: 0`. It first exposed migration 169's uninitialised-branch/premature supplier-item checks; migration 171 repairs the function and the probe then passed. Linked remote migration state and Production confirmation remain unverified. |
| Migration 171 AutoCount Confirm repair | verified deployed / full remote Confirm UAT incomplete | CLI 2.115.0 dry-run proved 171 was the sole pending migration; it was then applied to confirmed project `nnvdsaftiwpqkekjfrgc`, and a second migration list reported `171/171`. Authenticated remote RPC execution reached the new function and returned expected `P0002 AutoCount import job was not found` for a nonexistent disposable UUID, proving permission/function reachability without writing data. A real staged job Confirm remains unclaimed pending a recoverable fixture. |
| Production regression / release | implemented app not deployed / authenticated linked-data UAT passed | The v8.64.68 local app connected to the real linked Supabase and passed nine authenticated read-only annotation checks. This does not prove the current Production deployment contains v8.64.68; deployment and post-deployment verification remain open. |

Current v8.64.68 gates: strict TypeScript passed; lint passed; 799/799 contracts passed; production build generated 79/79 pages. The linked migration history is aligned through 171. The local app connected to the real linked Supabase and passed 9/9 authenticated read-only annotation checks; the remote AutoCount RPC also passed a non-mutating reachability/permission probe. Earlier local register/form suites remain green. The application itself is not deployed at v8.64.68, and a real AutoCount staged-job Confirm is still intentionally unclaimed because no recoverable Production fixture has been authorised. These boundaries prevent local or linked-data evidence from being mislabeled as deployed Production verification.

## Shared closure pass — v8.64.65

This pass addresses the repeated cross-page root causes identified across the annotation history; it is deliberately narrower than a claim that every authenticated workflow is complete.

| Root cause | Implementation evidence | Verification |
|---|---|---|
| Tablet filter bars created blank tracks or inconsistent control widths | `UnifiedListHeader` now derives tablet tracks from query controls and command groups, rather than child-count arithmetic that included the search control twice. | 793/793 contract tests, strict typecheck, lint, and production build passed. |
| Portrait tablet split workspaces hid the action/context rail | Shared `[data-tablet-document-split]` rule keeps the medium-tablet rail visible with a compact `minmax(13rem, 28%)` rail. | Contract suite passed; real authenticated four-viewport UAT remains required for each affected route. |
| Table header typography drifted between registers | Shared `Table` emits `data-ui-table="true"`; v2 table authority sets the first header row to 10px with a shared line-height. | Contract suite and build passed; visual sampling remains required for tables that bypass the shared component. |
| Production Jobs used a route-specific filter variant | Production Jobs now uses the shared query grammar. | Contract suite and build passed. |
| Release evidence/version drift | Footer/package/docs version updated to `8.64.65`; this ledger records the distinction between implementation evidence and UAT evidence. | `npm test`, `npm run typecheck:strict`, `npm run lint`, and `npm run build` passed locally. |

The remaining rows below are intentionally retained as open gates. They require authenticated role transitions, real Supabase data, mutation fixtures, or viewport screenshots; they cannot be closed by static CSS or a successful build alone.

## Reopened defects from user UAT

| ID | Acceptance criterion | Status |
|---|---|---|
| UI-0819-R1 | Dashboard does not duplicate the same pending approval queue in the page and Workspace Updates. | verified at 1180×820 as Super Admin: the page retains `Actions awaiting you`; Workspace Updates contains no `MY PENDING ACTIONS` section. |
| UI-0819-R2 | Outlet wastage chart fills its assigned analytical column on desktop and portrait tablet. | verified at 820×1180: rendered SVG width is at least 90% of its analytical panel. |
| UI-0819-R3 | Outlet Daily Records shows the right action/context rail at 820×1180. | verified at 820×1180: the rail is visible, at least 180px wide, and positioned beside the primary workspace. |
| UI-0819-R4 | Staff register content does not collide or overflow. | verified at 1440×900 plus the four-viewport register audit: grouped Staff, Assignment, and Status columns render without page overflow. |

## Outstanding acceptance scope

| Scope | Current evidence status |
|---|---|
| Key list pages at phone, portrait tablet, landscape tablet, and desktop | verified for 20 registers at 390×844, 820×1180, 1180×820, and 1440×900: Branches, GRN, Items, Outlet Daily, Products, PO, PR, Recipes, Roles, Staff, Stock Balance/Card/Counts/Transfers/Wastage, Supplier Invoices/Aging/Items/Suppliers, and UOM Conversions |
| Supplier Items and remaining register table width, clipping, density | Supplier Items is verified by the four-viewport geometry audit; routes outside the named 20-register matrix remain unverified page-by-page |
| PR creation: one supplier per PR, supplier-filtered items, UOM, Add line, new item request | supplier-scoped selection, UOM mapping, top/bottom Add line, and lossless unmatched-description contracts verified; authenticated invalid supplier/item guidance verified without creating a record; final valid submission and downstream new-item completion remain unverified |
| PR review permissions: Kitchen, Manager, Purchasing, Finance | verified for read-only workspace and action-leakage safety across six accounts; the state-changing Manager → Purchasing → Finance transition sequence still lacks a disposable fixture and is not claimed |
| Outlet Daily export, inline validation, and complete status transitions | implemented in part / full authenticated workflow not verified |
| Unified Item, Supplier, and Branch creation/maintenance | not verified end-to-end |
| Dashboard state colors and role-specific presentation | not verified across roles |
| All form errors scroll, focus, highlight, and explain inline | PR supplier/item validation verified at 1180×820; Outlet Daily line validation is implemented; remaining forms are not yet verified form-by-form |
| Supplier duplicates and supplier-code authority | pending data reconciliation; no cloud mutation in this UI batch |
| Migration state, real Supabase data, and production regression | not verified in this UI batch |
| AP Aging, Recipe, and Purchase Order alignment/workflow details | implemented in part / viewport and workflow UAT pending |

## Release gates for this repair batch

1. Historical TypeScript gate: passed on v8.64.64 after the PR validation and verification-infrastructure changes; the current v8.64.65 strict gate is recorded in the shared closure pass above.
2. Targeted contracts: 15/15 PR sourcing/lossless-entry/role contracts passed; the authenticated PR field-guidance browser contract passed against the cloud-connected localhost without creating a record. The reopened-annotation suite is now 4/4, and the safe read-only role workspace matrix is 6/6 for Super Admin, Finance, Manager, Purchasing, Kitchen, and Outlet. Earlier evidence remains 30/30 unit contracts and 5/6 P0 browser contracts; one fixture-dependent case was skipped and remains unverified.
3. Authenticated register browser UAT: 20 routes × 390×844, 820×1180, 1180×820, and 1440×900 passed (80 route/viewport checks).
4. Cloud migration/data verification: intentionally not claimed by this UI-only repair.
5. Historical production build: v8.64.64 passed across all 76 routes after the latest field-guidance and verification-infrastructure changes; the current v8.64.65 build passed locally and is recorded above.
6. Localhost:3001: restarted outside the restricted runtime and authenticated Dashboard verification passed against the configured cloud Supabase environment.
## v8.64.110 progressive receiving UOM learning and local migration closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Goods Receiving accepts Purchase UOM first and learns unknown conversions at the point of receipt. | implemented / local transaction, focused UI contract, and authenticated browser workflow passed | The form now accepts actual Purchase UOM and Base UOM quantities, calculates known conversions, derives an immutable snapshot for unknown conversions, and offers an opt-in Remember choice. Migration 185 was applied locally after correcting its invalid backfill join; functions and constraints compile. The no-route QA browser workflow created and posted a GRN; Production remains open. |
| PR to PO conversion returns a stable result and never duplicates an active PO. | implemented / local transactional RPC test passed | Migration 186 is applied locally. A disposable ready-to-convert PR converted successfully, a second call returned the same PO with `already_existed=true`, and blank/not-ready assertions returned stable business codes. Linked/Production migration evidence remains open. |
| GRN and return posting retain immutable Purchase/Base UOM snapshots. | implemented / GRN authenticated mutation passed, return UAT open | Local function definitions, snapshot columns, audit table, and grants are present; the QA browser workflow posted a GRN and local rollback transaction coverage passed. Purchase Return browser mutation and Production remain open. |

The local Supabase migration ledger reports 184, 185, 186, and 187. This is local-only evidence; it must not be promoted to `remote verified` or `production verified` without linked migration output and read-only Production regression.
## v8.64.111 receiving posting lock repair

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| A posted GRN can advance a committed PO line without reopening ordinary PO editing. | implemented / local rollback and authenticated browser E2E passed | The committed-PO line trigger now permits only the transaction-local flag set inside the SECURITY DEFINER GRN posting RPC. A local disposable `2 CTN → 24 KG` GRN posted successfully, advanced the PO to received, and the no-route QA browser workflow also posted GRN successfully. Production remains open. |
## v8.64.112 purchase-order transition repair

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| PO submit → approve → send advances both PO and linked document state. | implemented / local rollback and authenticated browser E2E passed | Migration 187 replaces the invalid `pending` document enum assignment with `pending_approval`; a disposable local PO completed submit, approve, and send in one transaction and rolled back cleanly. The no-route QA browser workflow converted, sent, and closed the PO. Production regression remains open. |
| AP Aging and Recipe mutation workflows have disposable local business fixtures. | recipe fixture / AP Aging UAT incomplete | The local fixture includes an active `E2E-RECIPE-001` with one costed line. The focused AP Aging, Recipe Costing, and PO transition contracts pass (18/18). The full no-route QA browser workflow now covers invoice draft, Finance approval, payment, and PO close; a dedicated AP Aging report fixture/UAT remains open. Production remains open. |
## v8.64.114 local workflow closure

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| Local six-role, responsive and workflow evidence is current and traceable. | implemented / local evidence only | Six role auth routing passed (7/7), core annotation flows passed 11/11, master-data UX passed 2/2, supplier invoice responsive UAT passed across 390/820/1180 viewports, and no-route procurement QA passed 3/3 including AP Aging visibility. Remote migration and Production regression remain unverified. |

## v8.64.113 progressive PR sourcing

| Acceptance | Status | Evidence / remaining gate |
|---|---|---|
| PR item selection can begin from Item Master before a supplier route exists, while Supplier remains required. | implemented / local browser and contract evidence | Item picker now searches all active Item Master rows, the supplier chooser includes all active suppliers, and the selected Supplier is stored as a provisional suggestion. Missing route validation is non-blocking for PR create/update and review, while supplier-grouped stock-basket creation remains strict. A deliberate no-route local QA fixture completed PR creation, Manager/Purchasing/Finance approval, PO conversion/send, GRN creation/posting, Finance invoice approval, payment, and PO close (3/3 browser tests); disposable ledger rows are now cleaned in afterAll. Production remains open. |
