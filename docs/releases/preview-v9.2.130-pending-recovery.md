# v9.2.130 (Preview candidate) — scoped pending-state recovery

Base: `154ca2913ccf21baf2585024f355536ef01f19cf` / 9.2.129.

If an active conditional form unmounts, its bridge now releases only the matching external submit button's pending UI. No action is retried and no success is inferred. This fixes a demonstrated UI lock subcase, not every uncertain save/session scenario.

This batch explicitly integrates the previously separate five-test-file fixture patch after a clean patch check and preserves its original worktree. The twenty-failure classification and provenance are in `docs/v10/FAILURE-TRIAGE-2026-10-23.md`. Legacy visual/source contracts remain open unless actual evidence resolves them. No database, role, auth, cache policy or Production change is included.

Validation: 37 focused checks passed using official Node 22.23.4; the two added pending-lifecycle tests failed before the product fix and passed after. Full-suite comparison/build/deployment outcomes are recorded during release verification.

Final same-runtime comparison: baseline 1,704 / 1,684 pass / 20 fail; candidate 1,719 / 1,706 / 13. No candidate-only failures; seven old failures now pass. Typecheck and edited TypeScript ESLint pass. Twelve source/visual contracts and the legacy submit-mechanism contract remain open rather than weakened.

Node 22 full compilation also passed with the same nonsecret loopback/discard build fixture. Shared first-load JS remains 102 kB and Middleware 105 kB; no speed gain is claimed from this recovery fix. Hosted build and visual acceptance remain separate release checks.
