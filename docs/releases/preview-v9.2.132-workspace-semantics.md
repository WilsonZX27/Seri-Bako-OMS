# v9.2.132 (Preview candidate) — workspace semantic verification

Base: `5b58d8954303f61021484a5a74ad789a13920241` / 9.2.131.

Fix People Operations Dashboard quick-action fallback exposing an AP-aging link; use My schedule while retaining Owner's AP-aging action. No permission grants or finance query changes. New actual-source synthetic fixtures cover Daily copy isolation, nine-role finance display and query gating, procurement queue eligibility and Inventory counter permission filtering. Shared filter GET fields and parsed CSS semantic layers replace brittle source-spelling expectations. Full assertion accounting and pending browser gates: `docs/v10/SEMANTIC-WORKSPACES-2026-10-23.md`.

No business writes, migrations, cache-policy, security or Production changes. Exact final test/typecheck/build outcomes are recorded after verification. Live role/viewport/focus/lifecycle and performance acceptance remain open.

Node 22 full suite: 1748 / 1743 pass / 5 retained failures, versus 1721 / 1711 / 10. No added failures; 27 new cases. Typecheck passed. Browser acceptance and exact hosted build remain separate gates.
