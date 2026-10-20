# v9.2.122 — local candidate for consolidated Preview

This version identifies the local UI batch after v9.2.121. It has **not** been pushed to Vercel or promoted to Production. The detailed evidence and open checks are in `docs/qa/2026-10-21-closure.md` and `docs/qa/HISTORICAL_ANNOTATION_CLOSURE_INDEX.md`.

## Included changes

- Purchase Requests: refine narrow search/filter density and medium-width detail layout; keep the single phone Create PR action, 11px annotated metadata, complete amount/date and wrapping supplier name.
- Daily Records and Delivery Orders: keep all phone workspace tabs and counts visible, clarify Insights filters and summary copy, and restore the 768–1180px date View action.
- Low Stock: keep filters within the middle desktop canvas, repair the phone PR basket placement, make quantity steps visible, and retain selected items and branch across list filtering and reloads. Local representative rows are Mock-only.
- Asset and planning forms: allow narrow asset fields and transfer pickers to fit, restore compact maintenance metrics, and expose Show hidden in compact production planning.
- Upload guidance: use 12px for file restrictions and naming instructions, with the document file input linked to its visible guidance.

## Verification boundary

Local Mock browser checks cover the listed responsive surfaces and read-only interactions in the QA ledger. The latest upload-guidance edit passed strict TypeScript, focused ESLint and whitespace checks; its authenticated rendered state is still open. The most recent full contract-suite recount before this version was 1,661/1,663, with two older Kitchen/Chef role-matrix expectations unresolved. This version number does not certify the full suite or live-data behavior.

Before sharing a consolidated Preview, recheck the final deployed commit across the canonical widths, populated and empty states, non-Owner roles, actual navigation and save flows, notification clearing, and hosted performance. The shared list header still has a small initial desktop-to-compact handoff below 1280px; changing that shared structure requires cross-route regression evidence.
