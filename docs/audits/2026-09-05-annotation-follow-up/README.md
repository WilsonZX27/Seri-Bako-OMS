# Annotation follow-up — 5 September 2026

Base: `118437bb8c78a76a29e23fdfd637018ed2792a9f`, branch `codex/annotation-system-fixes`.

## Production diagnosis (read-only)

Vercel deployment `dpl_8TgL9DQny5iSdJF2wWEo7wi3wXVh` is Production, serves system.seribako.com.my, and identifies commit `118437b`.
The existing signed-in Vercel log UI supplied these failures; no production Post was executed by this verification:

- 2026-09-05 08:04:46.355 UTC and 08:06:40.958 UTC: record `2489f5a3-bf28-434f-bc10-43159b6f6183`, `Invalid outlet daily record action.`
- 08:04:19.732 UTC: record `d322d08e-9ec7-48ea-bb08-63f89b2e029b`, `POS Total Sales is required before completing this record.`
- Dashboard request 08:07:42.986 UTC: canonical low-stock fallback and legacy fallback each returned PostgreSQL `57014` statement timeout. The summary query itself did not log an error. The existing code fell through on a successful empty summary, turning a valid zero into approximately 16.8 seconds of failed ledger queries.

The linked-project `supabase db push --dry-run` succeeded and confirmed these pending migrations:

1. `260_outlet_daily_controlled_posting.sql`: introduces the Post action and permission; preserves the durable reviewed status and audit fields.
2. `261_atomic_compliance_type_creation.sql`: atomic compliance-type setup.
3. `262_sales_reconciliation_non_blocking.sql`: removes the legacy mandatory-sales completion rule.
4. `263_atomic_compliance_renewal.sql`: atomic renewal update/history.

260 and 262 match the observed Outlet Daily errors exactly. Applying these pending migrations requires the user's separate authorization for linked database mutations. None were applied in this follow-up. The application now identifies these two exact stale-rule errors as a database update requirement instead of blaming required inputs. No legacy review fallback or permission bypass was added.

## Changes by comment

| Comments | Change |
| --- | --- |
| 1 | Server-rendered rail marker and placeholder reserve desktop rail width before effect-mounted content; shared loading also uses the tablet split breakpoint. |
| 2–4 | Move status key below matrix, align selected record with the first date column, remove recorded-system-status copy. Keep click selection. |
| 5, 27, 28 | Diagnose live failures and pending 260/262; expose accurate migration recovery message. Production resolution remains pending database approval. |
| 6, 10 | Remove the Workdesk quick-link fallback; use the shared route skeleton. |
| 7, 8 | Pale-green fully assigned dates, person icon/count for working assignments, tighter date labels, white roster and planner surface. OFF/leave remain excluded from working count. |
| 9 | Attendance review Reset/Apply share a row, with Apply twice as wide on phone. |
| 11 | Successful empty low-stock summary returns zero without expensive ledger fallbacks. Real query failures remain unavailable, never fabricated zero. |
| 12, 13 | Calendar obtains names for every referenced compliance type, including types outside the active-required set; location appears as context. Business License titles remain intact. |
| 14 | Shared tablet query row is search + Search; second row is filters + count. |
| 15, 18 | Remove descendant-wide inline-flex stretching from ConsoleSection; quantity controls and status pills retain intrinsic sizing. |
| 16 | Add Default supplier filter using the summary's supplier_id before pagination/counting. The label distinguishes item default sourcing from branch-specific PR-basket sourcing. |
| 17 | Console cards use the shared card shadow token. |
| 19 | Permanent deletion has a trash icon and explicit label; reversible deactivation has a pause icon and neutral trigger. Existing confirmation and eligibility gates remain. |
| 20, 21 | Match supplier-input/button heights and remove the redundant optional helper; retain unmatched-supplier feedback. |
| 22 | Category input suggests existing category values and still allows a new value. Reads remain RLS scoped and paginated. |
| 23 | Remove the two redundant brand/image helper paragraphs. |
| 24, 25 | Square current/selected-image preview; Remove image clears the reference only when the form is saved. A validated replacement takes precedence. Existing stored objects are not deleted. |
| 26 | Reconciliation and retired-item notices use two columns on tablet/desktop with pale-yellow surfaces; phone stacks. |
| 29, 30 | Remove optional-sales helper and present Channel total/Difference together. Calculate in integer cents to prevent negative zero and false RM 0.00 attention. |
| 31, 32 | Shared file chooser is neutral; primary Upload sits at the same height in the same grid; guidance spans below both controls. |

## Verification

- 1,172 tests passed, zero failures; includes behavioral tests for authoritative empty low-stock results, the observed stale database errors, explicit image removal/replacement precedence and company-scoped updates.
- Full source ESLint passed.
- TypeScript no-emit and strict unused checks passed.
- Production build passed, 95 generated pages. Temporary fixture routes were removed before the build. Existing Supabase Edge Runtime warning remains.
- Populated local component fixtures, through the real app shell and styles, were tested in the browser. These are local UI checks, not authenticated production UAT.
  - 1024×768: search + Search share y=87.33; filters y=131.33, count y=132.33; no document overflow.
  - PR basket: real increment changed quantity 1 to 1.01. Input width remained 40px at 820×1180, 105.33px at 1180×820, and 112.67px at 1440×900.
  - 1180×820: query and Search share y=140.67; three filters share y=184.67; no document overflow.
  - 1440×900: loading and resolved layouts both measured main=884px and rail=320px. Matrix preview and first date column both measured x=484.67.
  - 390×844: both sales examples (777.40 and 277.34) reconciled to RM 0.00; file chooser and Upload aligned with full-width guidance underneath.
  - 390×844 schedule: Tuesday with four assignments (one shift, two OFF, one MC) showed all assigned, one working staff, and the expected roster.
  - Item form: existing categories appeared in the datalist; supplier input and Create supplier both measured 36px on desktop; Active pill measured 65.68px inside a 270px row.
  - Image Remove hid the preview; server-action tests verified reference removal, replacement precedence, permission check and company scope.

No push, deployment, linked database mutation, production document posting, or production image change was performed in this follow-up. Local Docker database execution was unavailable because the Docker Linux engine pipe was absent; no local migration execution is claimed.

## Authorized production migration follow-up

On 5 September 2026, the user explicitly authorized production migrations 260–263. The linked project was reconfirmed as `nnvdsaftiwpqkekjfrgc`, and a fresh dry-run listed exactly those four migrations. `supabase db push --yes` applied all four successfully (exit 0). The subsequent read-only dry-run returned `Remote database is up to date.`

The CLI emitted a local migration-catalog cache warning because the Docker Linux engine was unavailable; this did not prevent the remote migrations, as confirmed by the subsequent dry-run. No production daily record was posted during verification. Frontend commit `aba3ba5f` has not been pushed or deployed by this follow-up.
