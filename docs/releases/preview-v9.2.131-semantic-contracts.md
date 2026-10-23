# v9.2.131 (Preview candidate) — semantic register contracts

Base: `7a93b982ced66093ec687a4619bab13cf5c020a6` / 9.2.130.

Three stale contracts are replaced with stronger semantic evidence from real shared-component SSR and the actual release guard. PR columns/data/link and sort preservation are checked; explicit zero and unresolved supplier states have new regression cases. The precise before/after assertions and evidence limits are in `docs/v10/SEMANTIC-CONTRACTS-2026-10-23.md`.

No product UI, query, action, auth, permission or cache behavior changes; only the displayed release metadata advances. Browser acceptance remains open. The separate five-file fixture batch is already integrated and is not duplicated.

Node 22 verification: 1,721 tests / 1,711 pass / 10 fail versus baseline 1,719 / 1,706 / 13; exact comparison shows the three documented originals resolved and no new failure. Typecheck and release checks pass. This is isolated SSR/test evidence, not viewport or role acceptance. Exact hosted build remains a publication gate.
