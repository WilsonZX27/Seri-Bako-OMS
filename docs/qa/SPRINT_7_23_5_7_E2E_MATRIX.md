# Sprint 7.23.5.7 Release Gate Matrix

This matrix records local, sanitized release-candidate verification. It contains no credentials, record identifiers, screenshots, or business values. Browser evidence belongs in ignored `test-results/` paths only.

## Role and responsive coverage

| Role | 1440 | 1024 | 768 | 430 | 390 | 360 | Notification destination | Direct-route denials |
|---|---|---|---|---|---|---|---|---|
| Owner | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Finance | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Manager | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Purchasing | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Kitchen | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| Outlet Staff | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

At every width, the gate asserts settled content, no application error, no generic `Page actions`, no whole-page horizontal overflow, and the expected role workdesk.

## Journey coverage

| Surface / journey | Owner | Finance | Manager | Purchasing | Kitchen | Outlet Staff | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| Login -> Dashboard | Yes | Yes | Yes | Yes | Yes | Yes | Pass |
| Dashboard -> notification -> permitted destination | Yes | Yes | Yes | Yes | Yes | Yes | Pass |
| Procurement workspace and PR list/detail/action state | Yes | Read/review boundary | Company review | Yes | Assigned scope | Denied | Pass, read-only action state |
| PO and GRN list/detail/action state | Yes | Read boundary | Operational read | Yes | Assigned scope | Denied | Pass, read-only action state |
| Supplier Invoice list/detail | Yes | Yes | Denied | Denied | Denied | Denied | Pass |
| Daily Record list/detail/task | Yes | Operational read | Company review | Operational read | Assigned task | Assigned task | Pass |
| Items / Products / Recipes boundaries | Yes | Read including Recipe Costing | No recipes | Items/products | Operational selection only | Denied | Pass |
| Inventory workspace | Yes | Yes | Yes | Yes | Assigned scope | Denied | Pass |
| Activity | Yes | Yes | Yes | Yes | Assigned scope | Assigned scope | Pass |
| Staff administration | Yes | Yes | Denied | Denied | Denied | Denied | Pass |
| Account menu and logout control | Yes | Yes | Yes | Yes | Yes | Yes | Pass; logout verified separately |

## Shared interaction coverage

| Component | Assertions | Result |
|---|---|---|
| FilterBar / More Filters | No nested scroll, canonical elevation, reset only with active filters, Escape and dismiss | Pass in contracts/focused routes; expanded 17-route sweep later blocked by backend `fetch failed` |
| Select dropdowns | Canonical surface/elevation, keyboard selection, visible focus | Pass |
| Account menu | Canonical surface, click-outside, Escape, focus return, valid destinations | Pass |
| Confirmation dialog | Background blur, body lock, focus trap/return, Escape/click-outside, named dialog | Pass in shared contracts; no business action submitted |
| Mobile workflow sheet | One safe primary action, no hidden action, hydration guard, focus trap/return, no body scroll leak | Pass in authenticated browser |
| Tables and mobile lists | Compact selection column, reachable final action, no page overflow | Pass in role matrix/focused routes; expanded route sweep inconclusive after backend failure |

## Prohibited wording and runtime gate

The settled DOM and route sources are checked for no visible `Location`, `barcode`, `scanner`, `satay`, `leftover`, or legacy `Line Note` wording. Console errors, framework overlays, broken destinations, permission leakage, and stale skeletons are release blockers.

## Execution record

- Six-role Dashboard, Activity, notifications, Procurement, Inventory, denial, and responsive matrix: 6/6 tests passed across all six widths.
- Focused annotated visual/accessibility gate: passed, including the hydration-safe workflow sheet, body lock, Escape, and focus return.
- Account logout: passed and resolved to the canonical login screen.
- Document workspace suite: 7/8 passed in one run; the remaining workflow-sheet case was repaired and passed independently.
- Full route-list sweep: an initial sandboxed run was invalidated by blocked backend resources; the production-build rerun later stopped at login with an explicit backend `fetch failed`. No application assertion failed in that rerun, but it is recorded as inconclusive rather than a pass.
- No workflow or business-record mutation was submitted because the configured backend was not a disposable fixture.
