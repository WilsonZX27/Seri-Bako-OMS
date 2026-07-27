# Tablet-first architecture audit — v7.24.20

Date: 2026-07-27

Release candidate: v7.24.21 — Tablet Workspace Architecture

Screenshot evidence was captured from the v7.24.20 visual-audit build; the shared canvas, split-rail, header-density, and accessibility corrections described below are rolled forward in this v7.24.21 candidate.
Scope: shared OMS shell, Stock Count list, Purchase Request creation, and Stock Card.

## Evidence method

The audit used the current local candidate in explicitly isolated mock mode. It did not connect to, mutate, or submit production data. Screenshots were captured with `agent-browser`, then opened and inspected before acceptance:

1. `tmp/ui-audit/v7.24.20/01-stock-count-list-mobile.png` — 390 × 844
2. `tmp/ui-audit/v7.24.20/02-purchase-request-tablet.png` — 1024 × 900, before header density correction
3. `tmp/ui-audit/v7.24.20/03-purchase-request-desktop.png` — 1440 × 900
4. `tmp/ui-audit/v7.24.20/04-stock-card-tablet.png` — 1024 × 900
5. `tmp/ui-audit/v7.24.20/05-purchase-request-tablet-condensed-header.png` — 1024 × 900, accepted correction

The mock data set is intentionally empty. It proves responsive shell geometry, visible controls, empty states, navigation, and action placement. It cannot prove populated-row truncation, live permissions, or production authentication behavior.

## Findings and corrections

### P1 — Status tabs could restore to an offset first position on phone

The active `All` tab could appear visually clipped after a browser restored a previous horizontal scroll offset. `StatusTabs` now resets the tab strip to its zero origin whenever `All` is active. The accepted 390px capture shows the first tab complete, with no page-level horizontal overflow.

### P1 — Tablet was only a desktop shell with its left rail hidden

The shared `WorkspaceGrid` now owns three tablet canvas modes:

- `contained`: touch-focused form and dashboard canvas, 64rem maximum with 1rem outer breathing room.
- `wide`: technical registers and ledgers, 76rem maximum with the same outer breathing room.
- `full`: explicit opt-out for exceptional future surfaces.

At 1024px-1279px, document workspaces may opt into the shared `split` rail: the operating form stays primary and a compact 18rem action/context rail remains visible. At 768px-1023px that rail correctly falls back to the existing on-demand context disclosure. At desktop the existing full inspection rail remains authoritative.

Purchase Request and Goods Receiving creation now use this shared tablet split. No route-specific breakpoint was introduced.

### P2 — Document status duplicated the workflow pipeline at tablet and desktop widths

The compact pipeline already communicates the active state. The separate `Draft` badge above it consumed an otherwise empty header row. The standalone badge is now phone-only; tablet and desktop show the pipeline as the canonical state signal. The accepted 1024px capture confirms the denser, unambiguous header.

### P2 — Semantic table anchoring remains intentional

The Stock Card technical table presents Item as its first semantic identity column, rather than pinning a trailing action/reference column. The wide tablet capture keeps the filter, summary, and ledger inside the workspace without page-level overflow. Populated horizontal-scroll/sticky-row behavior remains a production-data verification item.

## Design contract updates

`DESIGN.md` now defines the tablet canvas modes, the 1024px document split rule, and the rule that tablet/desktop status is shown once through the workflow pipeline.

## Verification

- `npm.cmd run typecheck` — passed.
- Responsive shell, document workspace, and status-tab contract tests — 16 passed, 0 failed.
- `git diff --check` — passed.

## Remaining release checks

Before a production deployment, repeat visual checks while authenticated against real populated data at 390, 768, 1024, 1280, and 1440px. In particular, verify Stock Card's first semantic identity column during an actual horizontal scroll and inspect every populated document split rail for long supplier/item names.
