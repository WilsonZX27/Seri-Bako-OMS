# Outlet Management and People experience audit

Date: 2026-09-03  
Scope: Outlet Daily Records, Outlet Compliance, Outlet Calendar, Employees, and every Attendance workspace.  
Release boundary: Preview only.

## Product rules

- Registers and operational workspaces use the shared `wide` canvas (76rem on desktop, 64rem on tablet).
- Focused profile and document forms may use the shared `contained` canvas (64rem), but their header and body must use the same mode.
- The application right console remains the single owner of actions, summaries, and operational context on desktop.
- Cards group real content; they are not used as decorative wrappers. Lists, filters, notices, empty states, and loading states use shared primitives.
- Phone layouts preserve 48px controls and horizontal table scroll only inside the table region.

## Findings and closure

| Area | Finding | Severity | Resolution |
| --- | --- | --- | --- |
| Shared geometry | Several list headers were full width while their workspace was capped at 76rem. | High | People and Outlet Daily headers now use the same wide canvas as their workspaces. |
| People list | Feedback used a generic card and the summary label implied a company total after filtering. | Medium | Shared Notice state adopted; summary now says Shown. |
| People summary | Setup-pending rows could be visible while the summary reported zero. | High | Row and summary now share the same account-state authority. |
| People detail | A single profile reloaded the complete employee directory to resolve role and outlet. | High | Added staff-scoped role and default-outlet query, executed with the other profile reads. |
| Outlet Compliance detail | One outlet page loaded every outlet requirement and record in the company. | High | Branch filtering is now applied in the database query. |
| Compliance register | Requirements were repeatedly scanned once per outlet. | Medium | Requirements are indexed by branch before summary calculation. |
| Attendance permissions | Pages issued multiple independent permission RPCs. | Medium | Each page and the shared navigation use one permission-map request. |
| Perceived performance | People, Compliance, Calendar, and Attendance had no route loading state. | Medium | Added consistent route loading feedback. |
| Navigation | Outlet checklist detail lacked a clear return path after review. | Low | Added a contextual Back link to the outlet register. |

## Deliberate non-changes

- No glass effects, decorative gradients, oversized radii, perpetual animation, or dashboard-style card fragmentation.
- No Production migration, deployment, or promotion.
- Business permissions and workflow responsibilities remain unchanged.
