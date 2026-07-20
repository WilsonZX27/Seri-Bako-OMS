# v7.23.5.8 Release Blocker Remediation

Status: local release gate green; not committed, pushed, deployed, or applied remotely.

## Production evidence — read-only, 20 July 2026

No Production record was changed. The exact Aiden match was verified in the Seri Bako Production project:

| Staff profile | Auth account |
| --- | --- |
| Staff code: AIDEN | Display name: Aiden |
| Name: Aiden | Same normalized email as Staff |
| Email: aidenung1024@gmail.com | Exactly one Auth account matched this email |
| Role: Kitchen | Email provider |
| Default branch: Central Kitchen @ PJS10 | Account created 20 July 2026, 12:04 am MYT |
| Status: Invited | Last sign-in 20 July 2026, 12:16 am MYT |
| Setup: Temporary password / Password Required | Stored Staff link matched this exact Auth account |

Aiden's Staff record is correctly linked. The defect was that the Staff read policy recognized only Active staff through `current_staff_company_id()`, so an invited, correctly linked account could not read its own onboarding row.

Production digest `4174358115` was no longer present in retained Vercel runtime logs. Read-only code and permission inspection found that the Manager PR page rendered the shared comment form while the Manager role lacked `documents.comment`. The same visible-form/denied-submit failure was reproduced locally before the grant was added.

## Root causes repaired

1. Migration 076 lets a linked Active or Invited user read only their own Staff onboarding row; operational permission resolution remains Active-only.
2. New Staff rendered temporary-password controls in duplicated responsive Right Console DOM locations. Sign-in setup now belongs to the single canonical Staff form, so the entered password is the password issued.
3. Successful forced password change activates the Staff row and redirects directly to `/dashboard`.
4. Manager receives `documents.comment`, matching the already permitted operational PR comment surface.
5. Page permission resolution is one RPC instead of one concurrent RPC per permission. Requests to a localhost Supabase stack are serialized to prevent the locally reproduced PostgREST connection closures during high-fan-out authenticated rendering; Production fetch behavior is unchanged.

## Authenticated local evidence

Disposable local Supabase was reset through migrations 001–076, stopped, restarted, and seeded with local-only accounts and operational fixtures. A production-mode Next server had one verified listener on port 3013 before the gate.

Final exact-build serial gate: `3 passed (32.0s)`.

- New Kitchen Staff → entered temporary password → sign in → forced password change → linked Active Staff → Kitchen Workdesk: passed.
- Manager comment submit → visible comment → PR reload → persisted comment: passed.
- Owner authenticated 17-route sweep: passed for PR, PO, GRN, Supplier Invoice, Purchase Return, Items, Products, Suppliers, Supplier Items, Stock Balance, Stock Transactions, Stock Transfers, Stock Counts, Stock Wastage, Production Jobs, Outlet Daily Records, and Recipes.
- App-server error log for the gate window: zero lines.
- Local gateway gate window: inspected; all application requests returned 2xx and no upstream-close/5xx event occurred.

Generated screenshots, traces, and server logs remain in ignored local artifact directories and contain no Production secrets.

## Wilson-controlled Aiden recovery after release approval

1. Approve the release and apply migration `076_staff_auth_link_repair.sql` through the normal controlled deployment window.
2. Sign in as Super Admin / Owner and open **Administration → Users & Staff → Aiden**.
3. Confirm **Setup pending**. Do not select **Repair sign-in link** for the verified current Aiden record because the exact Staff/Auth link is already correct.
4. Ask Aiden to sign in with the password he most recently set. He must reach forced password change, then the Kitchen Workdesk for Central Kitchen @ PJS10.
5. If the current password is unavailable, Wilson may use **Reset temporary password**, share it securely, and repeat the sign-in flow.
6. Re-open Aiden and confirm **Auth linked**, Staff status **Active**, and the password-change timestamp.

For a future record that shows **Link needs repair**, only Super Admin / Owner may select **Repair sign-in link**. The action proceeds only for exactly one eligible Staff profile and exactly one Auth account with the same normalized email; it refuses missing or ambiguous matches and records `auth_link_repaired`. Never repair an ambiguous account with direct SQL.

## Release controls

- Do not apply migration 076 remotely until explicit release approval.
- Do not mutate Aiden or any Production business/staff record from this sprint.
- Do not commit, push, or deploy while the user hold remains active.
- Preserve the existing separate Jack and Ashley → Finance controlled data-change checklist; do not apply it with this release.
