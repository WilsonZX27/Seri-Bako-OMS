# Configuration contract for independent company deployments

One source release, one app/database/storage/Auth deployment per customer initially. Do not fork business code or share runtime credentials/connection pools. Company data guards stay in place: independent deployment is not a reason to bypass tenant predicates. Deployments must pin the same reviewed source and migration versions; customer features are validated configuration, never eval/custom scripts.

## Implemented locally
Company appearance editor uses a validated six-digit primary colour; derived interaction tokens retain white-text contrast>=4.5 and fixed recognisable danger/warning/success semantics. Preview is local to the editor. Saved metadata is nullable/versioned company.ui_theme. Both settings visibility and server action require existing company.update plus activeOwner. Company ID comes only from the authenticated actor. Invalid colours cannot inject CSS. SSR shell and portalled dialogs consume the same tokens; no company-specific localStorage. Restore savesNULL and retains existing default identity.

Company-wide persistence requires the separately reviewed nullable-column proposal. On an old schema the editor previews but cannot save, and the server refuses before UPDATE. No table RLS/ACL/grants were added. Production column installation is not claimed. Before enabling, snapshot and verify existing company read/update policy scope and audit writes; no new permissions implied.

Unauthenticated/failing branding shows genericOperations, never another customer's company name or a discovered bucket logo. Existing authenticated legal identity/logo and product records remain. Display documentation and helpers use generic language; actual inventory/product names are not rewritten.

## Business settings seams — design, not activated
Numbering: keep stable internalUUIDs; format changes affect future records only. Existing document_sequences remains the owner for document formats. Asset sequence is independently readiness-gated and staysOFF. Before initialization verify the exact company, prefix/digit width, maximum existing tail, uniqueness and concurrent allocation; never rewrite oldIDs or reset periodically without explicit rule. A preview must show examples, collision detection and next-number calculation without consuming a number.

Approval routing: use finite versioned templates, not an arbitrary workflow builder. Keep routing separate from role permissions. Simulate a draft against synthetic cases (missing approver/self-approval/thresholds/branch) before publication. Existing in-flight documents retain their route version. Receiving/invoice/payment controls cannot silently disappear when a route is edited. This design does not change current approval order, permissions or pending documents.

Product-specific planning presets/calculation categories still need an explicit configuration inventory before marketing this as industry-neutral. ShorteningKuih example copy does not prove all production forecasting rules are generic. No blanket rewrite of forecasting rules was made.

## Readiness gates
Independent-company synthetic fixtures; default/selected/loading/disabled/error/focus; keyboard; narrow/landscape/wide; contrast; export names and blank/unknown meaning; bounded read counts and server query plans. A passing build or a palette demo is not a security/performance certification. Live latency and database policy/concurrency gates require their own recorded acceptance before release.

## Public deployment labels
Optional non-secret NEXT_PUBLIC_APP_NAME (80 characters) and NEXT_PUBLIC_APP_SHORT_NAME (32 characters) control browser/PWA labels. Defaults are generic. Authenticated legal identity/logo remains company-scoped. Logged-out pages use a generic building mark, never SB or another discovered logo. Native browser/PWA chrome is neutral; the saved palette applies to authenticated application surfaces and portals. These settings do not provision another company or change its account/data access.

## Management email release configuration — required before upgrading this route

The former company-specific sender, pilot recipient and system domain are no longer implicit defaults. Each independent deployment must explicitly configure `MANAGEMENT_EMAIL_COMPANY_ID`, `MANAGEMENT_EMAIL_FROM`, `MANAGEMENT_EMAIL_BASE_URL` (HTTPS origin only), and `MANAGEMENT_EMAIL_PILOT_RECIPIENT`; optional `MANAGEMENT_EMAIL_BRAND` defaults to Operations. Retain the existing `CRON_SECRET` and provider credential checks. Missing/invalid configuration returns503 before any database read or send, so deploying this route without configuration would pause management email. No environment variables or live schedule were changed here, and no email was sent.

Queries bind the configured company, recipients retain existing management-role and single-pilot limits, and staff-role reads bind selected recipient IDs. Only that company's roles (or existing shared role definitions) are allowed. Synthetic route tests cover a foreign company's candidate recipient and missing configuration; they never call a mail provider. Do not enable a new recipient as part of branding setup.

## Repair rule v2 — locally exercised, not installed

The proposed shared company/asset lock and insert/reopen trigger enforce one unresolved ticket per asset. Different reports append audited progress without resetting the existing status or priority. Daily checks start unselected; existing exceptions carry forward, and Checked does not close a ticket. A restricted location receives only a minimal attention flag, not another location's ticket ID, count, description or workflow state. Client v2 calls fall back only when an endpoint is absent, never on denial or an uncertain write error.

The isolated no-network PostgreSQL run passed ten behaviour groups including eight concurrent distinct reports, six identical retries, legacy duplicates left byte-for-byte intact, and exact synthetic function/owner/search_path/ACL restoration while retaining appended history. These authorization helpers are synthetic stand-ins. They do not prove live RLS or the current remote trigger/function/ACL dependencies. The proposal intentionally raises an exception at the start to prevent accidental installation. Before activation, capture fresh definitions/ACL/owners/config/triggers/dependencies and produce an applicable restoration artifact; stop on drift. The legacy endpoints remain for compatibility, but the new server guard is required for the new global rule. Presentation grouping covers the loaded page only and is not data cleanup.

## Remaining commercial acceptance

This local run used Node24.21.0; the package targets Node22. A clean target-Node22 build/runtime check remains a release gate. No dependencies were installed or upgraded. The build used a synthetic local Supabase URL/public placeholder, not production credentials. Browser fixtures render real components with synthetic queries and blocked business actions; no Auth/Storage/online policy or production performance certification is implied. Record real latency/query plans before performance claims.

The nullable theme-column proposal passed isolated constraint/reset/recovery tests but remains uninstalled. Owner preview works on the old schema and Save stays disabled. Automatic numbering, compact and initialization stayOFF. Commercial deployment provisioning, approval-template editing and industry-specific forecast-rule configuration remain design seams, not released features. Salary entry and Excel calculation are tracked separately in SALARY-EXCEL-AUDIT.md; preserving payroll code is not a completed salary repair.
