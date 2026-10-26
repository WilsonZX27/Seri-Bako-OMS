# New annotation batch: offboarding and schedule, 2026-10-26

Local follow-up to 7cd6d406e0fd74a77ae8c817ea51df97104e9160. This is separate from the pure UI154 authenticated Preview acceptance, which remains PARTIAL and has not been promoted.

## Changes mapped to new annotations

1. Resignation guidance leads to Last working day; immediate sign-in restriction remains distinct. Blocked employees no longer receive password repair/create suggestions. Permanent deletion is under collapsed advanced unused-test-profile actions. No account state or deletion executed; existing deletion backend is not certified by this UI change.
2–3. Employee errors use ActionErrorNotice; success notices declare ownership so the global notice does not duplicate them. Unknown deletion outcome wording asks for review, without claiming a specific cause or safe retry.
4. New external schedule RPC projects actual other-outlet shift/leave/OFF records for relevant employees, including borrowed staff. Latest revision and existing tenant/access checks remain. Multiple foreign records are labelled conflicts; unpublished status is visible. Completeness accepts real external evidence without inventing days. Existing local shifts remain editable when an external OFF exists.
5. Planner state remounts on outlet/week/revision identity changes, preventing stale state on client navigation. No refresh policy, account policy, or schedule publication changed.

Additional UI154 residuals: composite source UUIDs now become short references outside folded technical details; the actual shared CSS-module drawer fills both grid tracks. List query control sizing is unchanged.

## Current evidence

`/tmp/oms-offboarding5-evidence-20261026`: 2016 tests passed; full production build exit0; typecheck and lint passed. Actual route/component synthetic browser cases at390/430/820/1440 verify single error/success notices, empty-to-populated outlet client navigation without document reload, audit reference folding; drawer widths156/156,176/176,313/313 at390/430/820. Desktop has its regular list controls, not a fabricated drawer. External OFF is rendered in the schedule; the phone view shows only the selected day. Desktop editor edge case passes with zero write requests.

These are synthetic local checks, not authenticated deployment acceptance. The prior32 real Preview154 samples remain unchanged, with original two residuals pending a deployed recheck. Other roles, real writes, transfer rows without samples, real identity/timeout faults and actual deletion outcomes remain unverified.

## Database prerequisites and blocker

371–374 remain unapplied to business DB.373 and374 must exist and pass postflight before publishing this client: backup includes mandatory store datasets and schedule reads require the v2 RPC.372 is limited to explicit target-company Manager items.view.371 retains raw punches and does not invoke historical recalculation.

374 validator baseline: saved actual definition from `/private/tmp/oms-authorized-business-activation-20261025/el-postflight.json`, collected2026-10-25T04:59:27.224632+00:00. SHA256 `b5dcc2d6c28c4afb32dad488f54849d8196c90cda6c3e19348d3abca30dc2b92`. Only the cross-outlet completeness predicate was extended; Paid EL conflict and rest-kind checks retained. Corrected migration passed fresh isolated SQL assertions, including EL conflict.

371 replaces calculate_schedule_day_base and recalculate_attendance_week_pay_v1. Neither actual definition is included in that EL snapshot. This absence does not prove current equivalence: fresh read-only function definitions and a surgical diff against each are REQUIRED before activation. Fresh drift verification is also required for374. No guess or old migration file substitutes for that gate.

No new publication, business SQL, permission activation, schedule submission, history recalculation, stock write or automatic numbering action was performed.
