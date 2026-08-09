# Seri Bako OMS — Final UI/UX Audit Ledger

This is the working ledger for the final close-out. Every browser comment must have a source-level fix, a runtime check, and a responsive check before it is marked done.

## Verification rules

- Breakpoints: 390x852, 820x1180 portrait tablet, 1180x820 landscape tablet, and 1440x900 desktop.
- Shared behavior belongs in shared components or `src/app/design-system-v2.css`; do not add route-specific cascade overrides for shared controls.
- Preserve Supabase/RLS, server actions, ledger authority, and existing business state transitions.
- Every submit/action must show pending state and must not create duplicate action rails at tablet widths.
- A data-empty state is only valid after checking the query, permissions, and read-model freshness.

## Current comment matrix

| ID | Route / surface | Finding | Owner | Status |
|---:|---|---|---|---|
| 1 | Purchase Requests / new | Quantity stepper has awkward rounded segments | Shared QuantityStepper | Verified in production browser at 390x852 |
| 2 | Purchase Requests / new | Item, quantity, and UOM line wastes mobile height | Procurement form | Verified in production browser at 390x852 |
| 3 | Stock Balance | UOM should be changeable from the basket row | Stock balance basket | Verified in production browser at 390x852; native UOM select present |
| 4 | Stock Balance | Quantity input is not centered | Shared QuantityStepper | Verified in production browser at 390x852 |
| 5 | Stock Balance | Basket rows are too tall for large selections | Stock balance basket | Verified in production browser at 390x852; compact row and bottom rail spacing |
| 6 | Low Stock | Mobile Filter/records surface is broken | Low Stock + shared header | Verified in production browser at 390x852; fixed bottom sheet covers content/nav |
| 7 | Low Stock | Low-stock data disappeared | Inventory read path | Verified in production browser: 24 records via canonical-view fallback |
| 8 | Stock Transfers / new | Setup card feels structurally wrong | Stock operation form | Verified in production browser at 390x852 and 820x1180 |
| 9 | Stock Transfers / new | Nested card inside setup card | Stock operation form | Verified in production browser: setup and lines are sibling surfaces |
| 10 | Stock Transfers / new | Tablet duplicates the primary action in bottom rail | Document workspace/action rail | Verified in production browser at 820x1180; right rail only |
| 11 | Stock Transfers / new | Mobile action button sizing/spacing is inconsistent | Shared action rail | Verified in production browser at 390x852; inset action with bottom spacing |
| 12 | Purchase Returns / new | Mobile setup fields are misaligned | Purchase return form | Verified in production browser at 390x852 |
| 13 | Purchase Returns / new | Portrait tablet was not checked | Responsive verification | Verified in production browser at 820x1180 |
| 14 | Stock Balance | Tablet should use a true two-column workspace | WorkspaceGrid / page | Verified in production browser at 1180x820; right summary rail visible |

## Earlier comment matrix

The previous 19 browser comments remain part of this ledger and must not be regressed: Dashboard data/identity/density, shared mobile filters, Stock Count action rail and cards, Outlet Daily setup/action rail, Purchase Returns filter width, UOM menus, and global logo/scrollbar rules.

## Evidence log

- `998ec08`: previous shared responsive interaction close-out.
- Working patch: QuantityStepper, field label semantics, procurement density, Stock Balance UOM/basket/tablet split, document action breakpoint, transfer surfaces, low-stock canonical-view fallback, Dashboard canonical low-stock count, stale Stock Count document filtering, and a stable desktop empty state for Actions awaiting you.
- Production browser evidence (local `next start` on port 3144): 390x852 Purchase Request, Low Stock, Stock Balance, Stock Transfer, Purchase Return and Dashboard; 820x1180 Stock Transfer and Purchase Return; 1180x820 Stock Balance; 1440x900 Dashboard.
- Additional local browser verification: UOM Conversions action menu opens at 390px and 1440px as a fixed portal (`role=menu`) within the viewport; Production Jobs uses the anchored desktop More-filters panel and a dedicated mobile Filter sheet without a nested More-filters control.
- Playwright production smoke passed: selected mobile visual language (8 routes), dynamic workflow responsive (Transfer/Wastage/Production at 390/768/1440), auth-shell security (6 viewports), unauthenticated cross-site mutation rejection, experience/error states, and purchasing navigation smoke.
- Full canonical mobile visual route audit passed: all routes declared by `mobile-visual-language.spec.js` at 390x844 (2m 12s), with no legacy brown action, invalid radius, title offset, or horizontal overflow findings.
- Full canonical static workspace audit passed: all 68 canonical routes at 390, 768, and 1440; every route had parsed global styles, no page-level horizontal overflow, and no visible interactive control outside the viewport (5m 0s).
- Playwright suites with legacy assumptions remain non-green: `ui-smoke` expects Action as the last table column although the current shared list grammar intentionally puts it first; `operational-lists` expects tables at 768/1024 and visible H1s on phones although current responsive ownership intentionally uses OperationalList below xl and the mobile context title. These are test-contract drift, not hidden runtime failures.
- Contract checks: security/API/header/filter/dialog/tablet-action contracts passed; three legacy contracts still assert removed fallback/query/radius assumptions and are recorded rather than masked.
- Production checks passed: `npm run typecheck:strict`, `npm run lint`, `npm run build`, `npm audit --omit=dev --audit-level=high` (0 vulnerabilities), and `git diff --check`.
- E2E limitation: authenticated remote-fixture Playwright remains environment-bound and is not represented as a green full-suite result; the production-browser smoke paths above are the evidence for this patch.
