# Annotation fixes — local implementation and verification

Branch: `codex/annotation-system-fixes`

Base: `f6e62066bfe22f843124ec74ade7a2dd28a08cfa`

Workspace: `D:/CodexHome/worktrees/88ec/seri-bako-oms/annotation-system-fixes`

The original dirty checkout was preserved. No remote database mutation, push, main integration or deployment was performed.

## Annotation ledger

“Implemented” below means source changes are present. It does not mean authenticated acceptance or production verification.

| Comment | Implementation | Verification boundary |
| --- | --- | --- |
| 1 | Kuala Lumpur today marker in completion matrix | Populated matrix UAT pending |
| 2 | Shared tablet query/count row and filter/action row | Stock Card at 820px inspected |
| 3 | Stock Card movement summary moved into shared right rail | 820px inspected; populated values pending |
| 4 | Stock Balance uses compact shared rail | 1180px inspected |
| 5 | Dashboard excludes Outlet Daily pending actions and counts | Source and contracts; other pending-action consumers retain them |
| 6 | Low stock appears in dashboard attention metrics, including unavailable state | Live source failure not reproduced locally |
| 7 | Inventory uses flex gap so a hidden phone hub leaves no margin | Source checked |
| 8 | Same hidden-hub spacing fix aligns main content with rail | Populated page UAT pending |
| 9 | Employee directory explicitly owns its surface background | 820px browser DOM confirms white list surface |
| 10 | Employee outlet filter matches any assigned outlet within existing RLS scope | Authenticated scope UAT pending |
| 11 | Schedule planner mounts a shared tablet right rail | Populated planner UAT pending |
| 12 | Stock Count consumes shared tablet two-row filters | Source checked; 1098px populated UAT pending |
| 13 | Stock Balance uses compact rail and two-row tablet filters | 1024px inspected |
| 14 | Branch/status labels have dedicated second-row space | 1024px inspected |
| 15 | Dashboard streams authorized quick access while heavy totals load; excluded Outlet Daily query is skipped | Production timing remains unverified |
| 16 | Removed “Based on your role” | Contract checked |
| 17 | Completion selection changes on click, not hover/focus/pointer-down | Contract checked; populated pointer UAT pending |
| 18 | Chart coordinates follow measured container size; SVG no longer stretches text | Build checked; populated chart UAT pending |
| 19 | Year/month input is available on phones | 393px inspected |
| 20 | Selected-day event list below calendar | 393px inspected |
| 21 | Day buttons select a readable event list; dots are not the sole affordance | 393px click verified with empty data; populated events pending |
| 22 | Compact published-shift rows grouped/filterable by outlet; personal query explicitly scopes current staff | Authenticated staff and manager UAT pending |
| 23 | Attendance tabs retain full labels in a horizontally scrollable strip | Source checked |
| 24 | Shift fields use two columns on phones | Source checked |
| 25 | Save shift occupies a fixed phone action bar | Populated settings UAT pending |
| 26 | Today uses the same 40px height as week controls | Source checked |
| 27 | Schedule workflow controls stay fixed at phone bottom; navigation hides only when controls exist | Populated workflow UAT pending |
| 28 | Schedule actions share the tablet and desktop rail | Populated planner UAT pending |
| 29 | Removed positional recoloring of second/later rail cards | White tablet card surfaces confirmed in DOM |
| 30 | Native field validation names, highlights, focuses and scrolls; server schema errors name field and line | Behavior/build checked; full record UAT pending |
| 31 | Wastage reason/comment align with quantity columns on tablet | Source checked |
| 32 | Difference reason hides when POS is absent or rounded difference is zero | Source checked |
| 33 | Invalid optional sales preserves operational saving and reports sales unsaved; migration fallback retains target status | Executable payload test passed; database UAT pending |
| 34 | Branch and Record Date use two phone columns | Source checked |
| 35 | More-options buttons have full-width rows and consistent gaps | Source checked; dialog UAT pending |

## Additional audit findings addressed

- Mobile operational links preserve keyboard and modifier-click navigation while retaining deliberate pointer double-tap behavior.
- Low-stock reads paginate in 500-row pages with stable ordering. Failed later pages never return partial data as complete; reads above the safety ceiling fail visibly.
- Low-stock replenishment and summary distinguish unavailable data from healthy zero counts.
- Compliance expiry uses the shared Kuala Lumpur business date.
- Migration 263 makes renewal and its history insert one transaction under existing RLS. The action fails visibly if the RPC is unavailable. It has not been applied to any database.
- The personal published-shifts query now limits results to the current employee, in addition to existing database access controls.

## Checks

- 1,169 Node tests passed, zero failures. Existing contracts were updated where the user's requested behavior superseded them.
- Four executable regressions exercise actual source functions: multi-page/partial-failure reads, MYT midnight, keyboard/modifier activation, and invalid sales versus valid operational quantities.
- Complete ESLint and strict unused-symbol TypeScript checks passed.
- Production build reported Supabase Edge Runtime dependency warnings; no middleware code was changed.
- Production build passed using the local-only Supabase URL `http://127.0.0.1:54321`. This is compilation evidence, not database or deployment proof.
- Browser checks used the actual app with empty local mock data: Stock Card 820×1180; Stock Balance 1180×820, 1024×768 and 1440×900; Outlet Calendar 393×852. Calendar day selection was clicked and the selected-day heading verified.
- Docker Desktop was started in the background, but its container/status query did not complete and was interrupted. The daemon was not usable for verification. Database execution, real-record posting, renewal rollback under RLS, role/branch scope and the full route/role/viewport matrix remain pending.
- Existing source audit findings concerning production version drift and live low-stock failure need an authenticated environment with confirmed deployment identity.

Logs are in [evidence](./evidence/). No screenshot or empty-state check is counted as populated authenticated UAT.
