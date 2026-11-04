# New annotation 1: RO Approve / Reject — evidence checkpoint

2026-11-04. No product change, real approval, role switch or deployment.

Source findings on preserved base5fc8806 plus7b9b47b:
- /people/ro passes effective hasPermission(comp_time.approve) to ActualAttendancePanel. Without permission buttons are absent, not disabled.
- getRoPendingCorrections computes own_request from transaction.submitted_by === current actor.staffId, NOT from the employee whose balance is being corrected. Thus an Owner correcting someone else's balance is still the submitter and cannot decide that correction.
- Both pending action buttons are disabled exactly when own_request===true. Backend decide_comp_time_transaction likewise prohibits the submitter; removing this client guard would merely move the failure to RPC and violate existing rule.
- Disabled reason is only title text; shared Button disabled:pointer-events-none means pointer tooltip is unreliable and unavailable on touch. This is a code-supported feedback limitation, not proof of the screenshot's row identity or a license to change approval policy.
- Existing actual-component tests cover own/non-own RO/OT; query tests cover scoped roster/balance reads. Targeted run results supplied in final response.

Blocked evidence: specified Sentinel_c100ade746488191a1db2721de076306 screenshot not available in this task. Parent read_thread returned no turns. Bounded original-thread pagination and Library search did not resolve that exact image. Do not claim screenshot inspected. Current task IAB has zero tabs; no existing Preview session available to inspect disabled/title/current operator. No new login or alternate-role session opened.

Minimum input for definitive diagnosis: forward the exact Comment1 screenshot (Library ID or local path) and Preview URL/current operator; ideally read-only pending row submitted_by vs actor equality (boolean is sufficient, no credentials). If own_request=true, preserve prohibition and provide visible contextual reason after screenshot comparison. If false, inspect rendered disabled/overlay and matching deployed source before changing code. Current7b9b47b handles API errors only and does not fix this disabled-button complaint.

## Authorised visibility correction
Parent relayed explicit user screenshot context: Pending, grey Approve/Reject, “我不能按按钮啊？”. Identity relationship not visible. Independently authorised fixing the tooltip-only reason without changing permissions.
Added one visible sentence below the action row for an own pending correction: “You submitted this request. Another authorised approver must review it.” Both disabled controls reference it with aria-describedby; React useId keeps separate component instances unique. No new card/control or backend change. Consumers: /people/ro plus both existing attendance/review placements. Other-request actions and OT controls unchanged.
Actual component static-render regression: new own-request visibility assertion failed before, then20 combined component/query tests pass. Targeted ESLint and diffcheck pass. No live role acceptance or real approval. Original screenshot pixels unavailable; rendered responsive/browser comparison remains unverified. Do not infer this fixes the specific Preview row unless submitted_by equality is confirmed.

## Integration on 77f5e23 — 2026-11-04
Code/test patch applied without conflict. The rules-document trailing context had diverged; the new rule was appended while preserving the carryover and browser-comment rules. 27 combined self-review, scoped people, safe-error and mutation-result tests passed; TypeScript, targeted ESLint and diff check passed. No permissions, RPCs or approval state changed. Original screenshot cause and authenticated responsive appearance remain unverified. No deployment or real approval performed.
