# Seri Bako OMS security threat model

## Overview

Seri Bako OMS is a multi-tenant internal operations system for procurement, receiving, stock, production, staff administration, documents, imports and company backups. It is a Next.js server-rendered application using Supabase Auth, Row Level Security (RLS), server actions, route handlers, Storage and privileged service-role operations. The security objective is to protect each company's operational records, inventory ledger, staff access, attachments and audit history while allowing six controlled roles to perform their assigned workflow.

This is a repository-wide model, not a claim that every control has been exercised against a live production environment. It applies to the dirty local worktree based on revision `39ff0e17033c2b2d696f771bcec4db3ee102577e` and must be revisited after material auth, database-policy or export changes.

## Threat model, trust boundaries, and assumptions

### Assets that require protection

- Company-scoped operational data: branches, items, suppliers, purchasing, inventory, production, invoices and stock movements.
- Identity and role assignments: Supabase Auth identity, staff profile link, role, branch scope and effective permissions.
- Irreversible workflow effects: posted goods receipts, stock counts, transfers, wastage, production posting and opening balances.
- Sensitive business artifacts: attachments, company branding, imports, backups and audit/activity logs.
- Privileged configuration: document sequences, staff permissions, temporary-password lifecycle and company administration.

### Primary trust boundaries

1. **Browser to Next.js:** form data, route parameters, search terms, files, query strings and JSON payloads are attacker-controlled even for authenticated staff.
2. **Next.js to Supabase:** the normal server client retains end-user RLS. Service-role clients deliberately bypass RLS and therefore must derive actor/company scope before every query and mutation.
3. **Auth identity to staff profile:** a successful Supabase session is not sufficient operational authority; it must map to exactly one active, non-deleted staff record with a valid role.
4. **Company to company:** company IDs, branch IDs, document IDs and storage paths must never be accepted as proof of access. RLS is the authoritative backstop; server code repeats scope checks at privileged boundaries.
5. **Operational workflow to ledger:** UI values are requests, not inventory truth. Posting must be permissioned, idempotent, tenant-scoped and auditable.

### Assumptions

- Supabase project secrets remain server-only; `SUPABASE_SERVICE_ROLE_KEY` is never exposed as `NEXT_PUBLIC_*`.
- Production has correct RLS policies and the referenced RPC functions enforce the same actor/company constraints. Source audit cannot prove a remote database policy not present in this worktree.
- Vercel terminates TLS before this application; HSTS and secure cookies depend on the deployment platform and Supabase configuration.
- Only managed internal staff receive accounts, but a compromised staff account is in scope.

## Attack surface, mitigations, and attacker stories

### Authentication and session routing

The login, setup, reset and password-change paths use Supabase session APIs. `src/server/actions/auth.ts` validates input, re-fetches the current user after sign-in, distinguishes unavailable workspace from missing staff records, routes mandatory password changes and avoids reflecting raw auth errors. `src/server/auth/staff-session.ts` requires a matching Auth/staff email before accepting an invitation.

Primary risks are account/profile desynchronisation, invitation-link replay, password-reset confusion and a disabled staff account retaining a browser session. Server-side linked-staff checks, active-status checks and the forced-change marker mitigate this; session expiry and remote Auth policy still require live E2E verification.

### Authorization, tenant scope and BOLA

Permission checks in `src/server/auth/permissions.ts`, active actor resolution in `src/server/auth/tenant-actor.ts`, RLS and tenant-scoped action queries jointly defend company data. Privileged routes such as attachments, imports, backups and staff administration must verify both capability and record ownership. Newer mutation code uses UUID schemas and active-company filters as defense in depth.

The highest-risk attacker story is an authenticated user changing a route ID, form field or RPC argument to target another company or elevated staff record. A critical failure would allow a role to post ledger mutations, export a backup or alter roles outside its tenant. A high failure would read or modify another company's record or create an invalid inventory transaction. Any service-role call without a derived tenant/actor boundary is a mandatory review hotspot.

### Imports, uploads and exports

JSON imports are bounded to 500 rows and 2,000-character cells, require same-origin browser mutation checks, authenticated active staff and permissions. Company logo uploads permit only verifiable PNG/JPEG/WebP content and reject SVG. Backup generation is owner-gated, scoped dataset-by-dataset, excludes credentials/file bodies and enforces archive limits. Attachments require a company-scoped lookup before signed URL generation.

Threats include parser abuse, spreadsheet formula injection in exported CSV, service-role tenant escape, oversized payloads and malicious active content. The implementation already escapes CSV fields and filters secret-like export columns; file-type and content-signature controls should continue to be applied to all new upload surfaces.

### Rendering, API and browser security

React escapes ordinary text values by default. The global policy disables framing, plugin objects and cross-origin form actions; API mutation endpoints use origin/fetch-site checks. Global search strips PostgREST filter syntax from user-controlled query terms before constructing `or(...)` filters. There must be no direct HTML injection, unescaped rich text, dynamic code execution or user-controlled URL forwarding.

XSS is high severity when it can run in an authenticated owner or finance session; reflected server/database error details are an important secondary risk. CSRF is high on mutation endpoints that rely on cookies. Search/filter injection is medium to high if it can change predicates or produce cross-tenant side channels.

### Availability and operational integrity

Dashboard reads degrade per summary rather than blanking an entire workdesk. Bulk operations and backups impose row/size ceilings. Operational posting must remain atomic and idempotent. Denial of service, dead-end role routing, bad pagination and responsive action loss are business-impacting even without data disclosure because this system is used for daily food-supply operations.

## Severity calibration

- **Critical:** cross-tenant backup/export; role escalation to owner; arbitrary execution/XSS in privileged sessions; bypassing a posting RPC to write inventory for another company.
- **High:** authenticated BOLA against purchasing, staff, documents or ledger records; CSRF of posting/permission actions; service-role mutation lacking an active-tenant boundary; upload that executes active content.
- **Medium:** validation bypass that creates corrupt but tenant-local records; search/parser manipulation contained by RLS; incomplete rate controls on internal endpoints; sensitive error details in UI.
- **Low:** a UI-only permission hint mismatch where server/RLS still rejects mutation; usability regression with a safe workaround; non-sensitive metadata exposure inside an authorised tenant.

Repository: seri-bako-oms
Version: 39ff0e17033c2b2d696f771bcec4db3ee102577e + dirty-worktree
