# Sprint 7.23.0 security baseline

Audit date: 2026-07-18

Scope: read-only Supabase Security Advisor plus recent Auth/API/Postgres and Vercel observations.

Change boundary: no migration, RLS/grant change, password rotation, data mutation or platform configuration change.

## Executive summary

Supabase Security Advisor reports **0 errors, 79 warnings and 0 informational suggestions**. The 79 warnings are not 79 proven exploits: 61 are execute-grant warnings across overlapping PUBLIC and signed-in role categories, and the application intentionally uses guarded SECURITY DEFINER RPCs to implement company/role-aware workflows. Even so, the execute surface and 14 permissive write policies require a targeted function-by-function review because the impact of a missing internal authorization check would be high.

No recent Supabase API Gateway, PostgREST or Auth ERROR/5xx event was found in the selected one-hour window. Four Postgres `P0001 Owner / Super Admin access is required.` events aligned with this audit’s non-owner probes of the owner-only backup surface. They demonstrate enforcement, while also confirming a navigation mismatch that creates avoidable error noise.

## Advisor findings

| Finding type | Count | Severity | Exploitability assessment |
|---|---:|---|---|
| Public can execute SECURITY DEFINER function | 31 | P1 review | High impact if any function lacks its own authorization; advisor evidence alone does not prove bypass |
| Signed-in users can execute SECURITY DEFINER function | 30 | P1 review | Same architecture and likely substantial overlap with the public-grant set; validate grants and function bodies together |
| RLS policy always true | 14 | P1 review | Write-policy risk depends on table privileges, RPC-only discipline, triggers and internal guards; SELECT isolation is not implicated by this advisor rule |
| Public bucket allows listing | 2 | P2 | Company assets may be intentionally public; staff-avatar listing has privacy/enumeration risk and needs object-key review |
| Leaked password protection disabled | 1 | P2 | Reduces protection against known-compromised passwords; configuration hardening, not a current workflow failure |
| Function search path mutable | 1 | P3 | `public.set_updated_at`; harden with an explicit safe search path in a controlled migration |

### SECURITY DEFINER interpretation

Sensitive functions visible in the warning set include bootstrap, staff/role permission management, document transitions/payments and hard-delete variants. Existing Production acceptance already proved server denial for forbidden role and branch transitions, which is positive evidence that internal checks exist. It is not a substitute for reviewing each executable function’s grants, caller identity resolution, company/branch predicates and search path.

The PUBLIC and signed-in warning groups overlap conceptually. Remediation should start from a canonical function inventory, not by revoking everything globally; broad revocation could break the verified PR → PO → GRN workflow.

### RLS always-true interpretation

The 14 warnings concern permissive INSERT/UPDATE/DELETE policies, not unrestricted SELECT. A policy may be intentional when writes are constrained by guarded RPCs, table privileges or triggers, but “RPC-only by convention” is not sufficient if direct table grants remain available. The later review should prove all four layers:

1. table privileges by role;
2. policy command and role scope;
3. trigger/business invariants;
4. RPC authorization and company/branch filtering.

## Recent platform logs

### Supabase

| Source | Window/filter | Result |
|---|---|---|
| API Gateway | Recent ERROR/5xx | 0 relevant events |
| PostgREST/API | Recent ERROR | 0 relevant events |
| Auth | Recent ERROR | 0 relevant events |
| Postgres | Recent ERROR | 4 expected owner-only denial events |

The four Postgres events used SQLSTATE `P0001` with `Owner / Super Admin access is required.` Their timing matched Admin/non-owner route probes against `/settings/backups`. No business-data mutation was performed.

### Vercel

Recent route probes returned expected 200/307 responses. The interface showed an aggregate Error count of 4 and no Warning/Fatal count, but selecting the Error filter produced no retained rows; the Hobby plan also displayed a one-hour retention limit. It is therefore not possible to attribute those four historical counters reliably. Correlation with the Supabase owner-only denials is plausible but unproven.

## Risk classification

### Genuine hardening priorities

- Audit every SECURITY DEFINER function executable by PUBLIC/authenticated, starting with bootstrap, role/staff administration, hard-delete and financial/document-transition RPCs.
- Audit direct table grants and the 14 always-true write policies together.
- Review staff-avatar public listing and object-key predictability.
- Enable leaked-password protection after confirming plan/configuration behavior.
- Pin `public.set_updated_at` to a safe search path.

### Not proven security blockers

- A SECURITY DEFINER warning is not itself evidence that callers can bypass the function’s explicit authorization logic.
- An always-true write policy is not automatically exploitable when the role lacks direct table privileges or guarded triggers/RPCs enforce the invariant.
- The four owner-only Postgres exceptions were expected denials, not successful unauthorized actions.
- No current evidence requires stopping the already-approved operational pilot.

## Proposed controlled follow-up

1. Export a canonical function/grant/policy matrix read-only.
2. Rank functions by business impact and anonymous/authenticated reachability.
3. Write negative SQL/contract tests for direct table writes and each high-impact RPC.
4. Propose minimal grant/policy/search-path changes.
5. Dry-run locally from migrations 001 onward and replay the seven-role PR → PO → GRN acceptance suite.
6. Apply only through a separately authorized migration sprint.

## Stop/go statement

Security evidence is sufficient to begin scoped UX consolidation in parallel with a separately planned hardening review. It does not justify a broad policy rewrite, nor does it establish a new operational-pilot blocker.
