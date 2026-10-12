# v9.2.106 (unreleased): reviewed operations integration

This feature-branch candidate integrates the October 10 operations repairs and annotations 1–13. It does not authorize production deployment or database migration.

## Provenance and scope

Git HEAD was 42a228ae (9.2.95), while the deployed application was 9.2.105. The frozen `/tmp/oms-systemic-release-105` source matched all 545 hashes in the recorded release manifest for production deployment `dpl_8LmpSkL2kLeCHiVy5kZb7XszhrBj`. The candidate restores that already-published application baseline and its asset/attendance dependencies before applying the reviewed increments. The six obsolete source deletions are from that published baseline; they are not new speculative cleanup.

Reviewed increments cover shared responsive actions and dialogs, operational quantity semantics, transfer validation recovery and scoped destinations, schedule submission/summary, Outlet input recovery, and annotations 1–13. Packaging query submission now preserves local item/outlet selection. Asset overview shows two-column location checks, visible trends and semantic maintenance badges; the register uses compact grouped columns. Daily record progress filters match current lifecycle; attendance and date controls retain clear search and compact dimensions.

The final local regression found native selects resetting after failed Outlet actions. Submitted select values are restored after React's action reset, including repeated line selects; client-side rejection also releases the submit button. Asset query-only tabs stalled under client transitions in the local production build; scoped full-page navigation provides a verified safe fallback, retaining link modifiers and unsaved-change guards.

Post-release changes to compliance/production-planning permissions and route access were deliberately excluded. The published permission baseline remains unchanged. Local skills, preview harnesses, production data, private fixtures, environment files and output evidence are excluded from the commit. The shared original working tree is preserved.

## Verification

Final checks: complete Node test suite, ESLint, strict unused-symbol TypeScript check, production Next build, diff and targeted secret scans. Runtime verification uses only the pre-existing loopback synthetic Docker backend at 127.0.0.1:56321 and the candidate at localhost:3112. No database reset or migration was performed.

Schedule regression: unchanged draft submission 200; return/save/changed submission 200; stale editor 409 with no week mutation; Kitchen 403 with no mutation; independent Owner approval publishes and persists the edited assignment. Outlet regression: expected missing-receipt error preserves unsaved header/quantities/branch; correction saves one record and survives reload. Packaging selection survives 7→30-day real query navigation. Asset responsive checks cover 390, 820, 1180 and 1440 widths with no document overflow.

Migration 343 is committed for review but applied only in the previously approved isolated DB. Do not promote this application to production until matching database function compatibility is separately authorized and verified. Historical asset migrations 337–342 are source baseline restoration, not instructions to reapply them.

The known `frame.join` development parser limitation is not declared fixed. Production-mode save/post regression does not replace full hardware, weak-network, reduced-motion emulation, cross-tenant RLS or every business workflow validation.
