# v9.2.129 (Preview candidate) — v10 readiness baseline

Status: Preview candidate; v10 is not accepted or complete.
Base: `ae6bc16423842824a212f0054b52d78b4912badd`.

This batch gives every subsequent published release an explicit version and consistency gate. It records the current route/role/dependency inventory, design contract, cache boundaries and measurement limits before wider optimisation. The existing operational interface and business semantics are retained.

The authoritative programme and open acceptance gates are in `docs/v10/README.md`. Package version remains the release authority; package-lock root versions, displayed APP_VERSION, PRODUCT.md, DESIGN.md and this release note must match. Run `npm run release:check -- --base-ref <full verified deployed SHA>` before every publication; the version must advance beyond that source. Prebuild also rejects mismatched files. Build Ready is not user acceptance.

Validation and deployment evidence will be appended after this exact candidate is checked. Production is outside this release. No schema, permission, business-record, TTL or caching changes are included.

## Candidate validation

Official checksum-verified Node 22.23.4 was used for both baseline and candidate. Base: 1,700 tests / 1,679 pass / 21 fail. Candidate: 1,704 / 1,684 / 20. Exact comparison found no added failure; the stale release-document/footer assertion now passes because the release identity is coherent. The remaining twenty failures remain explicit in `docs/v10/baseline-test-failures.csv`; they are not waived.

Eight focused release/build/version checks passed. Existing prebuild contract was updated to require the new release consistency check before the unchanged secret-free environment guard. Typecheck and full compilation passed with the same nonsecret synthetic settings. Shared first-load JS (102 kB) and Middleware (105 kB) match baseline; this batch claims no runtime speed improvement. No hosted screenshot, authenticated viewport/role pass, or real save has been observed. Browser/observability blockers remain recorded.
