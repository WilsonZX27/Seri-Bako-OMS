# System closure review — 2026-09-16

This is repository evidence for v9.2.69. Migration 298 is Production applied and read-back verified; migrations 299–300 and the current application commits are not yet deployed.

## Release gates

| Gate | Evidence | Result |
| --- | --- | --- |
| Strict TypeScript | `npm run typecheck:strict` | Pass |
| ESLint | `npm run lint` | Pass |
| Contract suite | 1,277 tests | Pass |
| Production build | Next.js 15.5.21, 102 routes, 102 kB shared first load | Pass with isolated test environment |
| Stock Count integrity | 148 focused inventory/Stock Count contracts | Pass |
| Responsive browser UAT | Stock Count at 390×844, 768×1024, 820×1180 and 1440×960 | Blocked: the configured local Supabase at `127.0.0.1:55431` is not running and Docker Desktop is not installed |
| Linked schema | Repository migration ceiling 300; linked Production ledger verified through 298 | Migrations 299–300 not yet applied |
| Production runtime | Authenticated Production session expired during this review | Not reverified |

## Findings closed in this review

1. **Design authority drift.** Current rules now live in `docs/DESIGN_SYSTEM.md`; `DESIGN.md` is explicitly historical. `docs/SOURCE_OF_TRUTH.md` resolves product, architecture, design, annotation and dated QA precedence.
2. **Competing geometry tokens.** `globals.css` owns 12px panel and 8px control radius tokens. `design-system-v2.css` consumes them and no longer redefines them. Contract tests reject duplicate selector ownership and token redefinition.
3. **Ambiguous working-time copy.** The schedule editor reports the unsigned scheduled span and no longer revives the obsolete signed comparison against 8.5 hours. The paid cap is labelled `Paid time limit`.
4. **Cross-outlet identity.** Existing structured scheduling requires a real destination branch or the explicit `Event` option. Destination shifts use canonical branch identity; Event alone permits free text. Contracts cover editable destination projections, immutable coverage and attendance recalculation.
5. **Stock Count integrity.** Focused tests cover PJS10 catalog repair, eligibility, KG alignment, zero-only retirement, UOM identity, complete-line submission, exact variance, autosave recovery, atomic create/post/cancel/void, concurrency reconciliation and touch geometry.
6. **Purchase Return load path.** The queue now filters, sorts and paginates in PostgreSQL through a security-invoker view. Its right-rail summary is one aggregate RPC instead of repeated full reads and line downloads.
7. **Local build guard.** The prebuild check now reads `.env.local` before validating the same public variables that Next.js consumes.
8. **Stock-operation summaries.** Stock Transfer and Stock Wastage right rails now use constant-size, security-invoker aggregate RPCs instead of loading each complete queue into the application.
9. **Stock Balance summary truth.** Stock Balance metrics now cover the full filtered scope rather than the visible page, and Movement Ledger valuation no longer downloads every balance row.

## Architecture judgement

The transactional core has strong database-owned invariants: inventory terminal actions are atomic, business identifiers are tenant scoped, high-impact state changes are permission gated, and read failures remain unavailable instead of becoming false zeroes. Stock Count is materially stronger than the earlier UI-only implementation and its critical paths are covered by database and source contracts.

Approval behavior is still implemented by several domain-specific state machines. That is acceptable for the current company because Purchase Request, Production, Schedule, Compliance and inventory documents have different evidence and separation-of-duty rules. A future sellable product should configure approver roles, thresholds, step order and return paths through versioned workflow definitions, while each domain keeps non-configurable safety invariants in its terminal RPC. Do not replace those invariants with a generic client-side workflow builder.

The visual system is more coherent, but `design-system-v2.css` still contains a large compatibility layer with extensive `!important` usage. Duplicate selector/media ownership is now mechanically rejected, which prevents the former silent cascade conflict. The remaining overrides should be retired by migrating legacy route utilities into shared components in small, viewport-verified batches; a bulk deletion is unsafe without authenticated browser evidence.

## Remaining release work

1. Start an isolated Supabase/Docker target, apply migrations through 300, seed the role fixture and run the full responsive matrix.
2. Apply migrations 299–300 to the linked target before deploying application code that invokes their summary RPCs.
3. Reverify authenticated Production routes and performance after deployment; record measured server timing rather than inferring it from build output.
4. Continue reducing the compatibility CSS only alongside phone, tablet and desktop screenshots and geometry assertions.

Until those four items have evidence, the repository is release-candidate quality, not fully closed Production evidence.
