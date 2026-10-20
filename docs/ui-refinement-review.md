# Preview refinement review — 2026-10-21

## Functional preservation (separate from visual changes)

Source: `origin/codex/system-quality-verification` at `a6896b0a`; base: production `bfe3afbb`.

| Area | Preserved change | Location |
| --- | --- | --- |
| Attendance | Request attendance.read before choosing own-schedule fallback; keep full owner workspace; own published schedule route | attendance pages, attendance query, published-schedule-list |
| Roles | Kitchen/Chef boundaries, permission aliases and navigation scope | permissions, route-permissions, information-architecture, dashboard, asset pages/queries |
| Stock counts | Serialize draft/manual saves, retain input on failure, recover line identifiers, reuse created draft | stock-count actions, form, new page |
| Products | Normalize supply-period dates and filter availability | product actions/query and database types |
| Employees | Fix nested table header; retain last-sign-in information | people page, staff-security-panel |
| Notifications | Kitchen scope guard and existing attention-route derivation | topbar query |

Migration 368 is retained as existing branch history/source, not a newly designed schema change. This task does not execute database migrations or reassign staff. Its deployed status must be checked before treating Kitchen database isolation as verified.

Old branch visual-only changes to low-stock, production planning, packaging, insights, stock-count list ordering and broad CSS are deferred to later page review. Existing production actions remain available.

## UI annotations / verification

Pending implementation and viewport evidence. User-supplied screenshots are the before evidence (latest comments 1–7).
