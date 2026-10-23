# Workspace semantic batch — 9.2.132 Preview candidate

Base: READY 9.2.131 `5b58d8954303f61021484a5a74ad789a13920241`. Official Node 22.23.4; same locked dependency directory as the recorded baseline (1721 total / 1711 pass / 10 fail). No original fixture batch reapplied.

## Demonstrated product defect

Actual Dashboard component execution with synthetic summaries, including finance distractor data for every role, showed People Operations receives an AP aging quick action through the common default branch. Baseline: 20/21 new workspace fixtures passed; the People Operations finance-link assertion failed. Finance query execution and payables panels were already properly gated. Minimal fix changes only the default quick action: Owner retains AP aging, People Operations gets My schedule. No grant, RLS, session, query or business action change. Actual nine-role synthetic rendering now rejects finance-only links/panels outside Owner/Finance. These are fixtures, not impersonated users or live role acceptance.

## Complete assertion review / replacements

- Daily posting contract: retain actual pending-query ID and guidance checks; replace exact title-expression syntax with actual component SSR of document, status, target and guidance, with supplier, line-count and amount distractors. A procurement positive control proves those distractors are visible in its proper workflow.
- Semantic layer contract: preserve subtle surface token, attachment muted text and procurement surface checks. Parse all exact layer/backdrop/sheet rule declarations with existing locked PostCSS; require expected semantic variables and integer token definitions. This removes whitespace sensitivity without removing z-index ownership. Real stacking/focus remains pending.
- Dashboard composition: retain all IA role/default-route, financial reader, outlet-only data, identity/actions, unwanted copy and pipeline checks. Replace obsolete context-mode requirement with explicit attached action rail. Actual component fixtures exercise all nine canonical roles; AST-extracted actual optional financial query conditional proves reader invocation only for Owner/Finance and null-on-optional-failure. This is not a full DB/RLS query test.
- Workdesk queue contract: retain role flags, identity, no duplicate role titles, action group, current canonical queue states and permission filter checks. Retire only obsolete context-mode spelling. Execute actual Procurement page for nine roles, checking invoice module role eligibility, canonical role queue status and rejected obsolete states; explicit Owner deny-permission fixture removes modules and creation action. Actual Inventory page execution checks deny-all and each counter permission independently. Query inputs are inert fixtures and shell/chart wrappers are scaffolds.
- Daily filters: preserve page date/branch/status props, no blank primary placeholder, and primary search rendering checks. Remove dependency on whether drawer filters are declared directly from filters or from intermediate candidates. Actual shared header SSR verifies one GET form, date, selected branch, hidden status/qty sent, exactly one submitted value each, zero result count, dialog trigger label and collapsed state. Native select wrappers are isolated fixtures; no real browser submission occurred.

## Explicit pending browser acceptance ledger

These obligations are not removed because a source contract passes:

| Gate | Source owner | Required evidence | Status |
| --- | --- | --- | --- |
| Panel hierarchy / raised body / no nested sage canvas | Dashboard Panel and design-system-v2.css | 390/820/1440 screenshots and computed surfaces/spacing | blocked: no Browser/IAB read tool |
| Today compactness, no duplicate role snapshot, odd metric fit | Dashboard attention summary | widths plus breakpoint edges, keyboard focus | blocked |
| Responsive filter geometry / one visible tablet action | UnifiedListHeader and WorkspaceGrid | 390,767/768,820,1023/1024,1279/1280,1440;44px query targets | blocked |
| Daily date/branch visible, drawer field edits, correct GET after interaction | UnifiedListHeader and Daily page | actual click/keyboard, field edit and navigation | blocked |
| Dashboard/workdesk right panel and finance visibility | Dashboard, Procurement, Inventory | permitted existing authenticated role sessions, viewport screenshots | blocked; fixtures passed separately |
| Overlay stacking/contrast/focus/Escape/return focus | shared CSS/header/dialog focus | actual overlapping layers and keyboard operation | blocked |
| External form native reset, navigation, bfcache and pending recovery | submit-button/FormPendingBridge | actual browser lifecycle, no replay, uncertain outcome | blocked; existing isolated unmount tests retained |
| Live performance / slow query / cache correctness | PERFORMANCE-CACHE.md | authorized per-route timings/sample counts/query measurements | unavailable; no configuration change |

Remaining failing tests are not treated as a complete list of unaccepted requirements. Five previously failing contracts now have nonvisual semantic evidence; their visual portions remain above. No source-only or fixture result is labelled rendered acceptance. No attempt to activate absent Browser tools through generic login/approval.

## Verification outcome

Official Node 22.23.4: baseline 1721 / 1711 pass / 10 fail; candidate 1748 / 1743 pass / 5 fail (exit 1 due to those five retained gates). No candidate-new failure; 27 additional cases execute. Typecheck exit 0. The isolated before-fix workspace run was 20/21; after-fix all 26 workspace fixtures pass.

Resolved original semantic contracts:
- Outlet Daily posting actions never inherit procurement-only supplier and amount copy
- dashboard composition is all-role, task-first, and finance-gated
- outlet daily phone filters keep date and branch visible with secondary filters in the drawer
- role workdesks and workspace links use permitted real queues
- v9 surfaces and overlays use semantic color and layer tokens

Remaining exact failures (not waived):
- Today's work stays compact without a duplicate role snapshot card
- UI smoke keeps the requested routes, console order, current footer, and one tablet action entry
- current annotation batch keeps shared explanation and responsive filter ownership
- dashboard panels retain their hierarchy without a nested sage canvas
- external form submit feedback releases on server rerender and browser lifecycle recovery
