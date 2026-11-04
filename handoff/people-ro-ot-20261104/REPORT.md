# RO reject / OT claim follow-up — 2026-11-04

Request: investigate existing implementation and isolated tests; fix evidenced defects, without real approvals, role acceptance or deployment. Base 5fc88063c2d81f0b0ad68d560b69002f49789422 (available preserved integration snapshot; not asserted current production). Previous /tmp People worktrees and fixture JSON no longer exist. Source checkout untouched; independent clone /tmp/oms-ro-ot-followup-20261104.

## Confirmed defect and fix
RO comp-time catch used text fragments to classify errors: missing rejection reason and missing pending entry became HTTP500; RPC permission denial also became500. OT catch classified database timeout, connection failure and missing RPC as409 business conflicts. These are actual source/API-contract defects, not proof of the reported production incident's cause.

Both routes now use the same safe classifier: explicit SQL permission refusal403, known business failures409, known timeout/connection/schema availability failures503, unknown errors500. Exact business allowlist and generic fallback retained; internal SQL/detail never returned. Existing duplicate OT409 guidance remains intact. No business state transition, permission, notification, payroll calculation or SQL modified. Existing self-review component guards remain intact. Existing success RPC arguments and payloads verified.

## Evidence
- New actual-route VM tests (RPC/actor mocked, synthetic inputs): before 4 pass/9 fail; after13/13 pass.
- Together with safe-error and rendered self-review regression tests:19/19 pass, Node v24.21.0. Node22 was not found at the former runtime or standard checked paths; no installation attempted. Node22 verification remains integration gate.
- Targeted ESLint passes. Full TypeScript no-emit check passes.
- No authenticated browser, production or user-role acceptance performed. No claim that isolated route mocks are DB E2E. Local Docker containers exist (read-only inventory); prior /tmp/oms-ot-concurrency-fixture.json is missing. No shared fixture mutation or production access performed this round.

## Remaining incident evidence
Current production request response/status and deployed SHA are still required to attribute the user's failure. Legal reject/claim success is represented by existing implementation and isolated mocked RPC tests, not newly proven live execution. Unknown runtime failure safely stays an error; no retry or bypass introduced. Main integration should apply this small delta to its current base, verify Node22 and existing API/DB suite, then use the real failing request evidence to determine whether a separate functional defect remains.
