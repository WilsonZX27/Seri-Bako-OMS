# Historical annotation closure index

This is an inventory for the active full-system closure, not a sign-off. A historical note marked “verified” proves that older build only. Current acceptance requires the present Preview build, relevant role/data state, breakpoint and interaction.

| Source of owner feedback | Scope to recheck in current candidate | Current evidence |
| --- | --- | --- |
| `docs/ANNOTATION-REPAIR-LEDGER-2026-08-19.md` | Older numbered feedback across procurement, stock, dashboard, People, scheduling, tablet and mobile layouts | Historical implementation ledger; current-build visual and interaction recheck pending |
| `docs/uiux-final-audit.md` | Original route and component comments, including PR creation, Stock Balance basket, Low Stock, transfers and returns | Historical Production browser evidence; current-build recheck pending |
| `docs/qa/OWNER_FEEDBACK_2026-10-16.md` | Comments 1–33: asset actions, attendance, import/review, holiday scheduling, production planning, recipe/setup, PDF export | Planning comments 31–32 now have a local compact Show hidden control and 360/393/768/1180/1280/1440px Mock checks; save and real-data behavior remain open. Other comments still need current-build classification |
| `docs/qa/MOBILE_SYSTEM_REFINEMENT_2026-10-17.md` | Comments 1–18: shared mobile filters, sheets, pagination, asset checklist, maintenance, product/recipe, account menu | Prior local checks; current authenticated viewport recheck pending |
| `docs/qa/ASSET_RECIPE_FEEDBACK_2026-10-17.md` | Nine asset/recipe comments: inspection layout, maintenance history, costing caveat, selectors, mobile fields/actions | Prior local checks; current authenticated viewport recheck pending |
| `docs/ui-refinement-review.md` | Recent PR 11px metadata and FAB, asset 12px copy/metric cards, Attendance restoration, Daily filters, navigation dots, notifications, 36px desktop/44px touch controls | Source and v9.2.109 checks; current v9.2.119 candidate recheck pending |
| `docs/qa/2026-10-21-closure.md` | Current PR and Daily breakpoint fixes, phone Daily create entry, screenshot reliability, role-matrix gap | Partial current Preview measurements; open items listed there |

## Recent browser comment batches still requiring current sign-off

- Purchase Requests mobile: 11px specified metadata, complete amount/date, wrapping supplier, a single accessible Create PR FAB, appropriate search/filter density.
- Asset Management: compact 12px checklist help and asset labels, readable location heading, approved metric cards.
- Attendance: Owner sees the full workspace and action entry points; role-specific views keep their legitimate permission boundary.
- Supplier Invoices and shared controls: 36px desktop height with 44px touch targets.
- Daily Records: visible common filters, compact complete record metrics, consistent peer summary numerals, attention dots based on live permission-scoped work.
- Notifications: semantic 16px fixed icons, a button-styled full activity entry, correct destinations and count updates.
- Navigation: section dots aggregate visible children and clear when actionable work is completed.

## Acceptance gate

For each route/component, record page and role, data fixture or live read scope, widths 360/393/768/1180/1280/1440 plus the relevant 1279/1280, 1399/1400 and 1535/1536 switches, screenshot pixel dimensions, interaction result, overflow/truncation, touch and keyboard access, loading/empty/error state, and time to usable content. Record an unavailable fixture or expired session as **unverified**. A route-level no-overflow check does not prove every component.

The current static Owner sweep covered 91 routes at 393px and 1280px only. Dynamic routes, other roles, full interaction flows, and the pending Kitchen/Chef migration boundary remain outside that evidence. This index must be expanded when additional owner annotations are found; no older ledger is silently treated as closed.
