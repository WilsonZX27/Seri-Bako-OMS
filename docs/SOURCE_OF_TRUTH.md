# Documentation authority

This repository keeps current rules separate from historical evidence. When documents disagree, use this order:

1. Database constraints, RLS policies and transaction/RPC invariants define persisted business truth.
2. `PRODUCT.md` defines current product behavior and release intent.
3. `ARCHITECTURE.md` defines system boundaries, ownership and extensibility rules.
4. `docs/DESIGN_SYSTEM.md` defines the current visual, responsive, accessibility and performance contract.
5. `docs/ANNOTATION-DERIVED-UI-RULES.md` records recurring review lessons. It may refine examples but cannot override the design foundation.
6. `DESIGN.md` is chronological design decision history. New entries do not become foundation rules until promoted into `docs/DESIGN_SYSTEM.md`.
7. `docs/qa/`, `docs/audits/`, release notes and dated ledgers are evidence snapshots. They describe what was checked at that time and are never current policy by themselves.

## Code authority

- `src/app/globals.css` owns global tokens, base element behavior and legacy structural compatibility.
- `src/app/design-system-v2.css` owns authenticated workspace composition and responsive presentation. It consumes global tokens and must not redefine them.
- Shared components own reusable interaction geometry. Route styles may arrange a workflow but must not redefine shared control height, radius, focus, z-index or semantic colors.
- Business state names, permissions, transitions and identifiers come from database and server contracts. CSS and UI copy cannot invent lifecycle states.

## Current immutable design values

- Panel radius: 12px.
- Control radius: 8px.
- Shared query-control height: 44px.
- Minimum touch target: 44px.
- Release viewports: 390×844, 820×1180, 1180×820 and 1440×900.
- Loading, empty, unavailable and zero are separate states.
- Phone uses document scrolling and a safe-area-aware bottom navigation/action surface.
- Tablet preserves a deliberate 60/40–70/30 list-to-context split when both are needed.
- Desktop keeps dense lists and a stable right action rail.
- Reduced motion and keyboard equivalence are release requirements.

## Change rule

A browser annotation can reveal a defect, but the fix must land in the database invariant, shared query, component, token or documented workflow that owns the behavior. A page-specific override is acceptable only when the workflow is truly unique. Every promoted rule needs representative phone, tablet and desktop evidence plus a contract or end-to-end test that exercises behavior rather than matching obsolete copy.
