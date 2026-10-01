### v9.2.73 (deployed) — Packaging workspace consistency

- Restore the shared contextual right console with Daily Records access, report coverage and selected-day outlet usage; mobile uses the existing actions sheet.
- Use the shared filter controls and interactive line chart. Missing dates break the line; recorded zero remains a valid point.
- Read a bounded 30-day report once, then switch period, outlet and product locally. Stream the header and loading state before the report read completes.
- No database schema, permission or stock calculation changes.

### v9.2.72 (deployed) — Packaging report read latency

- Latest-outlet reads and the trend-record read run together; monthly packaging line batches use at most four concurrent requests. Exact-count guards still reject truncated data.

### v9.2.71 (deployed) — Packaging stock and usage clarity

- Packaging Usage reads completed Outlet Daily Records directly. Latest active-outlet closing balances remain independent of the trend period and retain record dates and coverage; balances are recorded, not verified physical stock.
- Seven packaging rows replace the repeated outlet/product ledger. Outlet details and daily usage details open on demand; desktop stock and trend panels sit together, while touch layouts stack. Missing days remain distinct from recorded zero.
- Inventory reconciliation, SKU mapping, the empty action rail and unbounded history tables were removed from this report because the owner needs outlet stock and usage trends. Existing mapping schema/data remain intact; no database migration is needed.

### v9.2.70 (unreleased) — Operational clarity and roster coverage

- Kitchen employees share the canonical roster eligibility path with Outlet Staff and Supervisors; tenant, branch, role-date and workflow permissions remain enforced. Migration 287 was applied and its four function bodies verified against the repository on 2026-09-14; live ALMA and PJS10 rosters show 8 and 12 staff respectively.
- Schedule completeness checks group missing dates by employee without merging identities, inventing OFF days or bypassing submission blockers. Staff codes distinguish similar names.
- Mobile document actions remain on one row with an accessible More options icon. Receiving summaries and purchase-chain links use two phone columns. PR rows display the submitter name without redundant wording.
- Posted receipts show the remaining quantity after that receipt, preserving the original pre-receipt snapshot and distinguishing it from later PO activity. Receiving document and purchase-chain reads run concurrently.

- Topbar pending actions omit unused exact counts; Dashboard totals retain exact counting and unavailable-state handling.
- Recipe submit, approve, activate, reject and archive now share one tenant-scoped database transition. Recipe, Document, revisions, activity and the one-active-version invariant commit together; migration 301 is Production applied and read-back verified.
- Cross-outlet shifts now retain their source roster identity. Removing, repatriating, moving or copying a staff-day updates the exact destination projection atomically, and Manager corrections use the same structured destination path. Migration 302 is Production applied and read-back verified.
- Attendance review now bounds outlet data to the selected branch, limits repeated-missing calculations to the visible month, and loads company-wide comp-time history only for staff present in the selected week. Scheduled days without punches remain visible, repeated punches are debounced, and incomplete punch inference remains explicit and auditable.
- People Operations and Managers may import schedule workbooks into guarded drafts. Submission and approval remain separate permissions.
- Stock Count list failures now stop explicitly instead of falling back to unbounded full-history hydration. Queue totals use one constant-size, RLS-preserving database summary.
- Outlet Daily loads its bounded page and Today rail concurrently. The Today rail is one constant-size, RLS-preserving aggregate and retains the distinction between verified zero, unavailable sent/received data and no records.
- Outlet Daily shares one request-local outlet/product option catalog across its list, seven-day trend and completion matrix instead of repeating the same permission, branch, product and supply-route reads three times.

Repository migrations reviewed through `318`; the linked Production ledger is verified through `311`. Migrations `312–318` are repository-only until the target database is explicitly verified; 312–313 repair part-time punch policy, 314 restricts outlet compliance, 315 adds management email delivery logs, and 316 retires sensitive payroll access, 317 exposes staff home outlets in the schedule RPC, and 318 introduces explicit packaging product-to-inventory SKU links. Migration `311` makes the Attendance overview count distinct affected current results and adds the matching tenant-scoped partial index, so multiple flags on one attendance day and immutable superseded revisions remain auditable without inflating the live queue. Migration `310` adds the bounded Outlet Daily Today summary; its function, grants, PostgREST schema reload and 2026-09-19 summary values were applied and read back successfully. Migration `309` adds the bounded Stock Count queue summary. Migration `308` grants People Operations the guarded schedule read and draft permissions used by workbook import without granting submission or approval. Migration `307` adds bounded attendance-review indexes. Migration `306` hardens punch-evidence calculation and incomplete-punch inference. Migration `305` retires the duplicate BOMBA outlet requirement while preserving historical records and attachments. Migrations `298–311` are Production applied; the latest application deployment is tracked separately from database migration evidence. See `docs/qa/SYSTEM_CLOSURE_2026-09-16.md`.

- Follow-up verification: SQL timestamp validation dates preserve their calendar day; mobile list rows no longer prefetch every unopened document. Migration 288 indexes the ready-to-post daily queue; migration 289 aggregates inventory once per Dashboard request with identical verified results. Migration 290 reuses parent SELECT RLS for daily lines and evaluates the request-constant view permission once; verified visible rows are unchanged.
- Observability follow-up: migration 291 adds filter-and-sort indexes for the Documents approval queue, active Purchase Request status queue and newest-first Notifications read. Production catalog and migration ledger were verified after application; workflows and row visibility are unchanged.
- Attendance review now makes completed imports unmistakably disabled, shows exact recorded post-shift time to the minute beside 30-minute RO units, wraps repeated-missing warnings, keeps report tools in the desktop action rail, and opens searchable choices inside their modal layer. Shared buttons and selects respond immediately on press while respecting reduced-motion settings. Business rules, permissions and mutation workflows are unchanged.

### v9.2.68 (unreleased) — Faster workspace reads

- Schedule overview loads only overview data. The outlet planner fetches independent reads concurrently while preserving authorised branch selection, workflow state and cross-outlet assignments.
- Dashboard low-stock counts use the same branch-item eligibility source without transferring full detail rows. Missing counts remain unavailable, not zero.
- Workspace updates load independently of the topbar shell and omit unused procurement detail hydration. Their workflow permission checks are batched; session verification is reused only within one server render.
- Slow upstream request logs contain endpoint names, durations and status only, without credentials, filters or business records.

Repository migrations reviewed through `286`; this patch adds no migration. Production remains on the separately verified release until this patch is deployed and checked.

### v9.2.67 (Production verified 2026-09-14) — Cross-outlet employee-day integrity

- An employee-day already recorded in another Submitted, Published or Locked roster satisfies completeness whether it is a shift, OFF, public holiday or leave. The destination outlet does not duplicate or contradict the immutable disposition.

Repository and Production migrations are verified through `286`. This boundary was identified by Production corrective-replay UAT and was rechecked against the linked migration ledger on 2026-09-14.

### v9.2.66 (Production verified 2026-09-14) — Schedule import replay integrity

- Workbook import treats an existing Submitted, Published or Locked assignment as the canonical employee-day owner and does not recreate the same working day in an editable outlet draft.
- A parser-versioned replay can repair a prior import of the same file and week exactly once. It replaces only editable drafts, preserves immutable rosters, retains assignment revisions and embeds the previous batch metadata in the audit record.
- Invited staff remain schedulable consistently across catalog, persistence and submission validation; deleted or genuinely inactive staff remain blocked.

Repository and Production migrations were verified through `285` before the parser-v2 corrective replay. Production workbook UAT exposed this consistency gap after the v9.2.65 import; the replay then preserved immutable employee-days and replaced editable drafts only.

### v9.2.65 (Production verified 2026-09-14) — Historical schedule backfill integrity

- Past roster dates with no recorded primary-role history may use the employee's current schedulable outlet role during an audited workbook backfill; this closes false import rejections caused by role records created after the historical schedule date.
- A known role covering the historical day remains authoritative, and future schedules continue to require an exact date-effective `outlet_staff` or `outlet_supervisor` role. Role history itself is never backdated or rewritten.
- Workbook preview and database persistence now share the same eligibility rule so an assignment accepted in preview cannot fail later for a hidden role-window mismatch.

Repository migrations reviewed through `284`. Local schema and focused contracts passed; linked migration application, deployment, authenticated workbook UAT and Production verification remain separate release evidence.

### v9.2.64 (unreleased) — Attendance publish reliability

- Schedule completeness failures return the named employee and day as an actionable conflict instead of a generic server error.
- Manager correction preserves the existing Published → Amendment Pending → Submitted → Published audit flow while safely handling PostgreSQL composite schedule rows.
- End-to-end mutation coverage now exercises a complete outlet roster through submit, independent approval, copy and corrected publication.

Repository migrations reviewed through `283`. Local schema and authenticated mutation UAT passed; linked migration application, deployment and Production verification remain separate release evidence.

### v9.2.63 (unreleased) — Staff credential handoff clarity

- New Staff account creation lands directly on the one-time credential card instead of repeating the same instruction in a page-level success banner and card helper line.
- The one-time title, copy action, secure-sharing instruction and first-login password-change requirement remain visible; account creation and credential handoff behavior are unchanged.

### v9.2.62 (unreleased) — Partial draft schedule import

- Schedule workbook preview applies the same active primary `outlet_staff` / `outlet_supervisor` role window enforced by schedule persistence.
- Editable outlets can receive every verified assignment as a Partial Draft while ambiguous or ineligible employee-days remain empty and auditable. Existing Submitted, Published and Locked weeks remain immutable.

### v9.2.61 (deployed) — Production schedule catalog repair

- Production UAT repaired schedule workbook catalog resolution to use the canonical `staffs.default_branch_id` ownership field.
- Catalog failure remains a hard stop: the system does not import, overwrite, or infer a roster without verified live staff and outlet identities.

### v9.2.60 (deployed) — Audited schedule workbook import

- Authorised schedule editors can upload the established monthly `.xlsx` roster from Schedule, select the visible Monday–Sunday window and review a live branch/staff/status reconciliation before writing.
- The import is fail-closed and auditable. It imports only verified Draft/Returned/Rejected/Amendment Pending outlets, preserves the source filename/hash and issue ledger, never replaces Submitted/Published/Locked weeks, and leaves source-blocked outlets untouched for explicit correction.
- Cross-outlet staff retain one canonical timed shift at the destination outlet with a read-only home projection. Standalone location notes without a named employee or time, HR instructions such as `Resign`/`Clear OT`, incomplete pairs and shifts over 16 hours are surfaced instead of guessed.

### v9.2.59 (deployed) — Roster integrity closure

- Full-time home-outlet staff now require an explicit assignment for every day before submission. A canonical shift already submitted or published by another outlet resolves that day without duplicating the shift or disguising it as OFF.
- Home rosters show cross-outlet shifts as read-only `At [outlet]` projections. Borrowed staff are added from the company roster and only their actual destination shift days count toward that outlet. Central Kitchen is available as a real roster location; an optional bounded work-site label records Event or temporary sites without creating a fake branch or granting branch permissions.
- Publishing requires an explicit confirmation. Published, unlocked schedules can be corrected and republished by an authorised Manager with a mandatory reason, immutable assignment revisions, approval history and Attendance recalculation; locked Attendance periods remain protected.
- Phone Schedule actions use the attached shared bottom-action pattern, the seven-day strip has deliberate spacing, and the desktop Add employee control remains pinned to the employee column.
- Outlet Daily phone rows use bounded Qty sent, Received and Wastage fields; Outlet Calendar exposes its urgent list below the calendar on phones; device mappings use a denser mobile action layout; Attendance replaces ambiguous `Posted` with `Calculated` in result context.

Repository migrations reviewed through `282`. Local verification, linked migration application, deployment, authenticated UAT and Production verification remain separate evidence.

### v9.2.58 (deployed) — Operational quality closure

- Hydration-sensitive selection controls remain inert until the client owns them, preserving server/client geometry and preventing first-paint action races.
- Phone purchase-request lines use equal Quantity/UOM tracks with a token-sized action column, and dense operational tables switch to touch-first lists below `xl`.
- Production UAT on the custom domain completed a real Schedule Draft → Submitted → Published flow for Kwan Kee Store @ Mid Valley; the persisted OFF assignment and Published state survived reload.

Repository migrations are reviewed through `281`. The final tree passed 1,235/1,235 contracts, lint, strict typecheck, the 102-route Production build and local `V9_SCHEMA_OK`; Production runtime logs recorded both Schedule mutation requests as HTTP 200. Native Supabase log review was unavailable because the dashboard session was signed out and the CLI transport failed, while Vercel retained only the most recent hour.

### v9.2.57 (deployed) — Attendance stability and weekly roster refinement

- Imported raw punches remain visible as explicit unscheduled evidence until a roster exists; publishing a later schedule recalculates the immutable batch into a new Attendance result revision.
- Weekly outlet rosters can include any eligible company outlet employee without changing permanent outlet ownership, and removing a person clears only the current week.
- Schedule actions have independent loading states, quick assignment is single-use, OFF uses the danger semantic, working time shows the selected employee/date and the raw span against 8.5 hours.

Repository migrations reviewed through `281`. Migration `281` passed the local schema gate, was applied to the linked Production database, and the v9.2.57 application was verified on the Production custom domain.

### v9.2.56 (deployed) — Attendance workflow convergence

- Restores the mobile Add Employee action and compacts attendance schedule controls for a usable 430px workflow.
- Requires an explicit outlet selection before attendance review data loads.
- Starts employee missing-punch tracking from 2026-09-11 without deleting historical punch evidence, with profile-level monthly review and adjustment access.
- Gives schedule decision failures a safe support reference and actionable recovery message.
- Repairs composite-row handling across schedule save, submit, copy, approval and workbook-import RPCs so business blockers return actionable responses instead of UUID conversion failures.
- Restores active Attendance adjustment and OT-decision RPCs to the released result schema, and removes the superseded Timecard finalisation RPC so raw punches remain the single ingestion authority.

Repository migrations are reviewed through `280`. Migration `280` passed isolated local schema/UAT verification and was applied to the linked Production database before application promotion. Production application and authenticated workflow verification remain separate release evidence.

### v9.2.54 (unreleased) — Attendance action and picker correction

- Actual Attendance reserves stable width for row actions, keeps default actions white until hover/focus, uses regular-weight labels and replaces ambiguous `Repeated` copy with the monthly missing-punch count.
- Schedule restores direct OFF, AL, PH and UPL quick actions while retaining a compact Working time selector for shift templates.
- Select menus opened inside Working time stay in the native dialog top layer, and Manager self-decision failures now explain that another authorised Manager is required.

This is repository implementation evidence only until committed, deployed and verified with authenticated roles.

### v9.2.53 — Attendance adjustment and RO traceability

- Actual Attendance uses calm vertical row actions, localised day headings, label-free compact filters and a dedicated RO tracking column.
- Adjust opens an audited form for actual clock-in, clock-out, payable minutes and mandatory remarks while preserving raw NGTeco evidence.
- People may submit dated historical time-off corrections through the existing approval ledger; employee Documents use an equal-height 50/50 workspace and device mappings include row numbers.

This is repository implementation evidence only until committed, deployed and verified with authenticated roles.

### v9.2.52 (unreleased) — Attendance review density correction

- Actual Attendance fits the operational canvas with seven decision columns, pairing scheduled and actual clock times with their variance instead of forcing a 12-column horizontal table.
- Attendance filters remain in one bounded desktop row; payroll rules lead Settings while device mappings are collapsible.
- Outlet Calendar removes the redundant outlet query surface, Dashboard metric tiles explicitly use the white surface, and Purchase Orders restores its table from the desktop breakpoint.

This is repository implementation evidence only until the change is committed, pushed, deployed and verified in an authenticated environment.

### v9.2.51 (unreleased) — Attendance workflow and UI convergence

- Schedule submission atomically saves, validates and submits current assignments. Managers may return with a mandatory reason or publish an audited correction revision.
- Actual Attendance groups staff days by date, uses responsive employee cards on phones, hides payroll-only values and calculation JSON from the normal review surface, and prioritises weekly close.
- Attendance controls converge on searchable compact selects, AM/PM display and a spaced mobile filter sheet while People documents use a list-and-add layout.
- The fixed 31 August–6 September 2026 workbook importer is dry-run first, exact-match only, fingerprinted and unable to replace Published or Locked weeks.

Repository migrations reviewed through `279`. Migration `279`, authenticated Preview UAT, linked database application, schedule Draft import, publication, Attendance recalculation and Production verification remain separate evidence and authorization steps.

### v9.2.50 (unreleased) — Attendance OT, RO and weekly close

- NGTeco Raw Punch remains the attendance source. The weekly calculation now records expected punches, missing-punch follow-up and Full-time post-schedule OT candidates.
- Supervisor submits OT; People/Owner decides credit. Published partial RO reserves approved balance, weekly close confirms actual use, and FIFO allocations preserve the source earning.
- Protected People data stores passport and basic salary outside the general staff row and is used only for the People/Owner workbook after close.

Repository migrations reviewed through `278`. Migrations `275`–`278` restore attendance recalculation for published direct-time schedules and ordinary non-holiday workdays, preserve immutable revision ordering, and reapply raw-punch coverage suppression after manual recalculation. Schema application and Production verification remain separate release steps.

### v9.2.49 — Raw Punch attendance and schedule repair

- Schedule validation names blocking staff and treats a missing weekly rest marker as an audited warning that does not prevent submission.
- People Operations can read outlet employees wherever it has schedule-read branch scope, including published rosters.
- Actual Attendance accepts only NGTeco View Attendance Punch, splits multi-week files into Monday–Sunday batches, flags sparse date coverage and excludes historical Timecard-derived events from calculation.
- Attendance displays use 12-hour AM/PM time while database values remain unchanged.

Repository migrations reviewed through `273`. Migration `273` is implemented locally and remains unapplied until the linked database dry-run and release are separately approved.

### v9.2.48 (unreleased) — Attendance weekly operations, pay rules and Kitchen GRN access

- Actual Attendance combines weekly import, Schedule-versus-punch comparison, server-side filtering, pagination, exception details and time-off review in one workspace.
- Employment type is editable throughout Staff and People, Compliance records own their supporting documents, and outlet visibility follows the Supervisor boundary.
- Migration 269 repairs canonical and legacy Kitchen GRN posting grants and adds bounded weekly Attendance review indexes.
- Migration 272 separates presence, worked, payable and approved OT time, applies employment-type break rules, and adds branch public holidays with effective-dated payroll-equivalent multipliers.

Repository migrations reviewed through `272`. Migration `272` is implemented locally and remains unapplied until the linked database dry-run and release are separately approved.

# Seri Bako Operations Management System

### v9.2.45 (unreleased) — Manager scheduling and Timecard import

- Managers can prepare, submit, and publish their own audited rosters while Supervisor self-approval remains blocked.
- NGTeco Timecard Report files become actual punch evidence with an inferred Monday–Sunday week, explicit one-sided-punch exceptions, and immutable source rows.
- Attendance mapping includes Central Kitchen and uses a compact Location table; Schedule leave shortcuts use distinct restrained semantic colours.

Repository migrations reviewed through `269`. Migration `269` repairs canonical and legacy Kitchen GRN posting grants and narrows outlet Compliance/Calendar access to Supervisor-and-above status visibility. It is repository evidence only until applied to the linked database.

> Current repository authority: forward-only migration 历史已到 `269`.

### v9.2.39 (unreleased) — Finance PR return permission

- Finance can return a purchase request from Finance Review to Purchasing Review through the audited correction workflow.

Repository migrations reviewed through `267`. Migration `267` grants the existing Finance correction permission required by the server-authoritative return RPC; Production application remains a separate release step.

> Current repository authority: forward-only migration 历史已到 `267`.

### v9.2.38 — Right rail spacing closure

- Applies the shared 12px card gap through `display: contents` wrappers so Timeline, Revision History, and other nested right-rail sections follow the same rhythm.

### v9.2.36 (unreleased) — Operational density and Finance access alignment

- Uses a consistent 12px action-label scale and a visible 12px gap between cards in desktop and mobile action rails.
- Keeps Purchase Orders readable under browser zoom, restores direct-PO outlet and creator context, and removes duplicated Direct PO labels.
- Aligns Finance inventory navigation with database grants and returns Finance corrections directly to Purchasing Review.

Repository migrations reviewed through `266`. Migration `266` is repository implementation evidence only and must be applied before this application version is deployed; it is not Production proof.

### v9.2.35 (unreleased) — Published roster and actual attendance separation

- Keeps Manager-approved schedules immutable while daily MC, emergency leave, punch corrections, and compensatory-time use follow a separate approval trail.
- Adds an approved minute-based comp-time ledger with no overdraft, no self approval, and no automatic expiry.
- Adds auditable NGTeco source changes and inactive unbinding, plus consistent Schedule and Review interfaces across supported viewports.

Repository migrations reviewed through `265`. Migration `265` is repository implementation evidence only and must be applied before this application version is deployed; it is not Preview or Production proof.

### v9.2.34 (unreleased) — Outlet Daily implicit-column closure

- Clears inherited explicit grid-column and grid-row placement from all four Outlet Daily tablet filters. This prevents CSS Grid from generating a third and fourth implicit column after the container is set to two columns.

The fix targets the computed layout cause observed on Production v9.2.33. Local contracts and strict TypeScript pass; final Production geometry awaits deployment.

### v9.2.33 (unreleased) — Outlet Daily tablet authority correction

- Replaces the older four-column Outlet Daily tablet rule at its source. At 820px, date, branch, status and Qty Sent now occupy four equal controls in a two-column grid, with Search and result count on their own row.

The correction was derived from computed Production geometry rather than screenshot inference. Local contracts and strict TypeScript pass; deployment and final Production geometry remain separate evidence states.

### v9.2.32 (unreleased) — Tablet composition and dashboard density correction

- Outlet Daily portrait-tablet filters use four equal controls in a stable two-column flow with a separate action/count row. Outlet Compliance restores its operational right rail from the 768px tablet breakpoint.
- Dashboard removes the outer sage wrapper around its panel grid. Compact metrics place the icon and larger value on one line with the label below, avoiding three-line tiles on phones.
- Dashboard low stock remains evidence-based: a successful zero-result read is shown as zero, while transport or query failures remain `Unavailable`.

Local lint, strict TypeScript and 1,178 contracts pass. Production deployment and authenticated viewport acceptance remain separate evidence states.

### v9.2.31 (unreleased) — Schedule, filters and purchasing interaction polish

- Schedule working time is centered at every viewport and asks only for check-in and check-out. Submit now saves pending cell changes automatically before sending the roster to a Manager, while Save draft remains available for incomplete work.
- Attendance navigation is more compact. Outlet Daily uses a readable two-column portrait-tablet filter layout, and More filters stays above the persistent bottom navigation.
- Item identity uses a deliberate image-left, fields-right composition on wide screens with a larger preview. Right-rail sections use one consistent spacing rhythm.
- Stock Balance PR baskets show supplier item counts and row indices, and allow the purchase UOM to be selected from the item's supported units.

Repository migrations reviewed through `264`. Local contracts, lint, strict TypeScript and the 95-page production build pass; authenticated viewport UAT, push, deployment and Production verification remain separate evidence states.

### v9.2.30 (unreleased) — People and schedule interaction closure

- People and Staff rows remove redundant open copy, keep identity lines contiguous, and restore the raised list surface. New Staff always generates a temporary password and no longer exposes generated setup fields. Staff actions stay out of the narrow portrait-tablet rail, and permission switches use a quieter platform-familiar track and thumb.
- Schedule navigation uses equal tracks for every permitted destination. Work times are chosen only after Add is clicked, while the palette retains leave and off shortcuts; controlled half-hour selectors replace the browser-native time picker. Outlet Calendar centers its month axis, and Purchase Orders protect the PO/PR identity column by narrowing Request context.
- Migration 264 preserves Owner authority while an Owner updates their own unchanged Owner assignment, retains last-Owner protection, and closes pre-2026-09-05 historical Outlet Daily records with reviewer attribution and audit entries.

Repository migrations reviewed through `264`. Source, contracts, schema execution, authenticated browser UAT and Production application are reported as separate evidence states.

### v9.2.29 (unreleased) — Operational polish and complete low-stock scope

- The People profile removes its duplicate employment edit link while Staff access keeps one clear management path and higher-contrast permission switches. Outlet Daily uses a compact horizontal status key and a dedicated landscape-tablet filter row. Attendance navigation and schedule period controls share equal, bounded tracks. The Dashboard restores a stronger Seri Bako green hierarchy.
- Low Stock now includes active branch-mapped items before their first ledger movement, so a zero-balance item below safety stock is visible instead of being reported as healthy. Local typecheck, lint, 1,172 contract tests, and the 95-page production build pass; authenticated browser UAT, push, deployment, and Production verification remain separate.

### v9.2.28 (unreleased) — Mobile workflow and posting closure

- Outlet Daily phone actions share one equal-width row and sales inputs use a compact two-column numeric layout. Outlet users can correct and resave a Ready to post record until an authorised Purchasing, Manager, Finance or company-wide role posts it; posting then locks the record.
- Ready to post records join the authorised role's shared `Actions awaiting you` queue. `Ready to post` and `Posted` remain separate workflow states in lists, matrices, dashboards and seven-day coverage totals.
- Loading states replace only route content and retain the fixed five-item app navigation. Compliance attachments use a 70/30 file/action row, More Actions cards have explicit spacing, and the dashboard pipeline no longer draws broken grid dividers.
- Attendance phone scheduling uses a compact day strip and per-day employee assignment list instead of squeezing the desktop weekly spreadsheet into the viewport. Outlet Calendar uses one month axis and a compact mobile event grammar.

Repository migrations reviewed through `263`. Migration `260` introduces the controlled Outlet Daily post permission and transition; migration `261` makes Compliance type creation plus active-site requirement rollout atomic; migration `262` keeps sales reconciliation optional so wastage completion and posting are not blocked by blank or mismatched sales. Migrations 260–261 were applied only to the isolated local Supabase stack; migration 262 is implemented but awaits a running isolated database target. Local evidence comprises 1,165 passing contracts, ESLint, strict TypeScript, a 95/95-page isolated Next.js production build, `V9_SCHEMA_OK` at migration 261, six focused phone workflows, and the five affected routes at 390×844, 820×1180, 1180×820 and 1440×900. Preview commits `4a06cb5`, `96a16ab`, `54411fd`, `913aad6`, `8bfc5b7` and `638cebd3` have READY Vercel deployments; the latest Preview (`638cebd3`) passed remote public auth/setup UI E2E 8/8, the legacy Purchase Request validation-copy assertion passes locally, and Preview UAT now has an explicit isolated-target guard. All-role authenticated regression, remote feature mutation UAT and Production observation remain separate open gates.

### v9.2.27 (unreleased) — Mobile detail and layout closure

- Loading workspaces retain the normal mobile app navigation and never expose a placeholder `More actions` bar. Real mobile action buttons keep their icon and label as one centered 8px group.
- Dashboard metric grids use row- and column-aware borders, removing the broken divider fragments created by applying one-dimensional sibling dividers to a two-dimensional grid.
- Outlet Calendar uses one stable mobile toolbar with Today, previous/next controls and a single month identity; Calendar and Compliance reference rails no longer replace the mobile navigation.
- Outlet Daily renders a stable two-column workflow legend and removes the false mobile chart height that left empty space beneath the SVG.
- The shared mobile console sheet uses deliberate 12px outer spacing when a page genuinely owns secondary actions.

Locally verified with 1,148 contracts, strict TypeScript, ESLint, an isolated Next.js production build, focused 390×844 route UAT, a real seeded Compliance detail flow, and a clean Impeccable layout scan. This remains local evidence until pushed and observed in the deployed environment.

### v9.2.26 (unreleased) — Deterministic builds and systemic closure

- Restores the failed Production build by keeping Schedule approval reads on the established Attendance query authority and correcting the generated `Database.public.Tables` boundary that had stranded late-added operational tables outside the typed schema.
- Pins Vercel to Node.js 22 LTS and replaces mutable `npm install` deployment resolution with `npm ci --no-audit --no-fund`. Package, lockfile and visible application versions are synchronized and protected by release contracts.
- Converts repeated annotation feedback into permanent gates: truthful data states, one component vocabulary, role-owned actions, database-aligned workflow labels, four-viewport responsive release checks and compile-time database table coverage.
- Full local source gates pass: 1,142 contracts, strict TypeScript, ESLint and zero production dependency vulnerabilities. The production compilation and type-validation phases pass; local static generation still requires the configured Supabase public environment values.

This release candidate is locally verified only until the commit is pushed and the resulting Vercel deployment is observed. No database migration is introduced by v9.2.26.

### v9.2.25 (unreleased) — Visible approvals and actionable upload feedback

- Submitted outlet schedules now join the same Dashboard `Actions awaiting you` queue as procurement decisions for users with Schedule approval authority. The action opens the exact outlet and week, and renders schedule-specific context instead of supplier or value placeholders.
- Compliance uploads enforce the production-safe 4 MB request boundary before submission, show the selected file size and accepted formats, and repeat the same precise validation on the server. Oversized evidence no longer falls through to a generic workspace failure.
- Outlet Daily `Attention` uses a prominent amber warning treatment. `Ready to post` is a blue pending-finalisation state, while `Posted` is a solid green final state; each badge exposes a concise workflow explanation.

Focused Dashboard, Compliance, Outlet Daily and loading contracts pass locally. Dependency installation remains blocked by the pre-existing lockfile mismatch, so TypeScript, build, authenticated browser UAT and deployment are not verified.

### v9.2.24 (unreleased) — Loading, weekly oversight and checklist closure

- Route loading now mirrors the real page hierarchy: the page-heading skeleton sits on the header baseline, list search is an independent surface, right-rail placeholders have no fake headings, and authentication uses a dedicated sign-in skeleton instead of the operations workspace.
- Dashboard exception panels suppress unavailable source tiles instead of presenting failed reads as operational KPIs; supporting PO text is removed and section identity uses one restrained brand tint.
- Outlet Daily uses `Attention` as its complete warning label, aligns wastage insight to the selected Calendar history seven-day window, excludes zero-denominator records from the rate chart, and lets the graph occupy the available card height.
- Schedule keeps the existing outlet planner and adds a separate weekly overview across accessible outlets with Not started, Draft, Submitted, Published and Locked workflow states plus assignment coverage.
- Migration 259 retires DBKL from every company checklist and assigns Pest Control to every active Outlet and Central Kitchen. It is implemented locally only and has not been applied to Preview or Production.

Repository migrations reviewed through `259`. Focused loading, Dashboard, Outlet Daily, Compliance and Schedule contracts pass locally. Dependency installation did not complete in this isolated worktree, so TypeScript, build, authenticated browser UAT, migration application and deployment remain unverified.

### v9.2.23 (unreleased) — Compliance and Schedule Workflow Repair

- Rebuilds site Compliance as one calm disclosure list with aligned record fields and a clear primary file picker; repeated missing-detail copy is removed while status and recorded expiry remain visible.
- Gives every active Outlet and Central Kitchen the same required checklist during staged rollout, repairs canonical requirement names, multi-attachment policies and attachment audit events through idempotent migration 258.
- Shows only workflow-valid Schedule actions: Draft controls disappear after submission, Manager approval owns the submitted state, and failed actions return readable feedback.
- Removes the decorative loading progress stroke while retaining the shared content and right-rail skeleton, and suppresses an empty Purchase Request supplier summary until a real supplier exists.

Repository migrations reviewed through `258`. Migration 258 is implemented locally as a forward-only repair; remote migration status could not be confirmed because the linked Supabase status request timed out. This is not Production deployment evidence.

### v9.2.22 (unreleased) — Clear Outlet Daily Workflow States

- Aligns the seven-day Outlet Daily matrix with the detail workflow: `QS` means Qty Sent pending, `OE` means Outlet Entry pending, and `P` means Posted. Ambiguous `D`, `AM`, and `C` abbreviations are removed.

### v9.2.21 (deployed) — Direct Compliance Upload and Attendance Matching

- Removes Outlet Compliance approval entirely: an upload becomes current immediately, and authorised staff can replace or remove the current document.
- Matches imported NGTeco people automatically to unique active OMS employee names; only device-source-to-outlet mapping remains manual.

Repository migrations reviewed through `257`; migrations 255–257 retire Outlet Daily review approval while preserving its audit history, correct AutoCount PO `PO-000207` exactly, and extend site compliance to named multi-attachments and Central Kitchen. These migrations are implemented locally and remain unapplied until the linked database target is verified.

### v9.2.20 (deployed) — Unified Loading and Workflow Reliability

- Uses one shared loading workspace with a consistent right-side action and summary rail across People, Attendance, Compliance and procurement routes.
- Prevents Attendance mapping and Goods Receiving lists from overflowing at compact desktop widths, simplifies shift settings, and defaults purchase orders to newest document number.

### v9.2.19 (unreleased) — Direct AutoCount PO and Receiving Repair

Direct Purchase Orders now require the exact AutoCount PO Number, start ready to send, and never consume an OMS document sequence or enter Manager approval. Migration 252 removes legacy PO submit/approve role grants and RPC transitions, safely corrects `PO/SEP26/001` to `PO - 000207` when the target number is free, and grants Kitchen the exact create/receive/post permissions used by Goods Receiving.

Goods Receiving lines now prioritise Received and Rejected quantities, reduce missing pack conversion to one explicit factor, keep Traceability fields visible, and use the same compact item-card grammar when editing a saved draft. The duplicated tablet PO rail has been removed.

Repository migrations reviewed through `252`; migration 252 is implemented locally and remains unapplied until the linked database target is verified.

### v9.2.18 (unreleased) — Flexible Purchase Order Lines

New Purchase Order numbers every line and keeps Item, Ordered Qty, UOM, Unit Price and an optional line Comment together in the desktop entry grid. Changing Branch or Supplier preserves the complete draft for correction instead of removing buyer input.

Purchase Orders now record the buyer's actual ordered UOM without requiring that exact UOM in the supplier mapping. The selected supplier must still cover the Branch and Item; receiving remains responsible for confirming the delivered quantity and conversion into inventory units. Migration 251 retains line comments in `purchase_order_lines` and the atomic PO creation path.

Repository migrations reviewed through `251`; migration 251 is implemented locally and remains unapplied.

### v9.2.17 (unreleased) — Reliable AutoCount File Selection

AutoCount Direct Import snapshots files selected through the native picker before clearing its input, so click-to-choose and drag-and-drop now enter the same parsing workflow. Successful confirmation leads the main workspace instead of appearing below the impact and warning surfaces.

### v9.2.16 (unreleased) — Recoverable Purchase Order Entry

New Purchase Order keeps the complete in-progress editor mounted when supplier/UOM validation fails, returning the actionable error beside the form instead of redirecting and clearing the document. Supplier choices are alphabetised, UOM choices are limited to the selected branch/supplier/item relationship, and desktop line entry follows Item, Ordered Qty, UOM, Unit Price. Its route-owned loading state now mirrors the document canvas and right action rail at every supported viewport.

### v9.2.15 (unreleased) — Dynamic Scheduling and NGTeco Attendance

People Operations gains Monday–Sunday outlet rosters, Manager publication, staff shift requests, a branch-scoped Outlet Supervisor role, immutable NGTeco punch imports, exact-second OMS attendance calculation, exception review, reconciliation-only Attendance Report uploads, and protected period locks. Direct Check In/Check Out entry follows the outlet roster workbooks; break and recognised-paid caps are editable per selection, while templates remain reusable four-time-window shortcuts. PH and EL (Emergency Leave) are explicit roster states.

Repository migrations reviewed through `250`. Migrations 241–248 are applied to the linked Preview Supabase project; migration 249 keeps invited outlet Staff and Supervisors visible in the roster before login activation, while continuing to exclude disabled, deleted and office-role profiles. Migration 250 keeps sales difference reasons optional while persisting a back-office `needs_review` attention state; migrations 249–250 remain unapplied. The Preview application is deployed separately from Production, and authenticated role/responsive UAT remains outstanding.

### v9.2.14 (unreleased) — Receiving control and procurement clarity

- Draft Goods Receivings expose editable Received and Rejected quantities before posting. A supplier over-delivery is permitted only with a retained exception reason; migration 240 applies the same rule atomically and grants Kitchen the canonical `grn.post` permission checked by the posting path.
- Outlet Daily fallback preserves an already confirmed status when sales reconciliation is unavailable, and partial saves use warning feedback instead of a false success treatment.
- Procurement workflow badges distinguish Sent, Approved and Received with related but visibly different semantic tones. Required attachment labels fail inline with a focused red field state.
- Document console sections retain independent spacing so actions, files, comments, timeline and revisions do not read as one continuous panel.

Repository migrations reviewed through `240`; migration 240 is implemented locally and remains unapplied until separately approved for the target environment.

### v9.2.13 (unreleased) — Operational UI recovery and reversible retirement

- PR item matching dropdowns remain above the shared modal surface; purchasing actions use a direct approve / return / destructive hierarchy, and mobile actions keep one full-width primary action.
- Stock Count recovery dialogs use compact helper copy, Post errors identify the affected item, and retirement state is removed from count rows.
- Items can be filtered by `Retired from counts`; authorised staff can restore an item to a branch's future Stock Counts with an audit reason.
- Outlet compliance uses a responsive requirement-card grid and adds FOSIM as a required outlet record through migration 235.
- Purchase-chain labels use full document names; PO lists nest the clickable PR number without the redundant `From` prefix.

Repository migrations reviewed through `235`; migration 235 remains an unapplied release dependency until the target environment is explicitly promoted.

### v9.2.12 (unreleased) — People Operations workspace access

People Operations authentication now resolves to Employees as its preferred workspace. Migration 234 idempotently restores the canonical role for every company and grants its Dashboard, People, compliance, staff, branch and document workspace permissions, preventing a valid People Operations account from terminating at `no-permitted-route`.

### v9.2.11 (unreleased) — People records and procurement table hierarchy

Employee Compliance now separates the status Summary from the Add compliance record form as two sibling work cards. The Documents tab gives authorised People Operations users a visible Add employee document form rather than ending at a read-only empty state. Email presentation preserves identity semantics and displays a normalized lowercase value without mutating the account identity.

Purchase Order and Goods Receiving tables place clickable source provenance beneath the primary document number, return the released column width to supplier identity, and use a stable top-aligned two-line row rhythm.

### v9.2.10 (unreleased) — Supplier-locked matching and confirmed count actions

Purchasing Review now matches each non-catalog PR line through a focused dialog that shows the request description, quantity, UOM and canonical PR supplier. Candidate items are limited to the same branch, supplier and requested UOM. Migration 233 preserves the existing RPC signature while enforcing the same boundary under a row lock, recovering a legacy PR supplier only when its existing lines identify exactly one supplier.

Stock Count quantity controls reserve one consistent UOM column, and Replace, Remove and Retire use a complete icon and confirmation vocabulary. Removing a line requires explicit confirmation and states that Item Master and inventory history remain unchanged. Negative ledger starting balances remain valid while physical counts remain non-negative; validation identifies the affected item instead of collapsing to a generic required-fields error.

Document attachments require a recognisable business label at both client and server boundaries. People Profile email display is lower-cased without applying title-case styling to an address. These changes are implemented and locally contract/type/lint verified; migration 233, authenticated mutation UAT, Preview deployment and Production verification remain separate gates.

Repository migrations reviewed through `234`; migrations 229–234 remain unapplied Preview dependencies until the target environment is explicitly released.

### v9.2.9 (unreleased) — Workflow retry and session recovery

The Stock Balance PR basket now consumes its submitted idempotency key and deterministically derives one key per sourcing group. A double tap, network retry or retry after a partial multi-group interruption reuses the matching draft PR instead of silently creating duplicates. All groups still receive full item, branch and sourcing preflight validation before the first write.

People Compliance upload and database failures return to the same employee Compliance section with visible recovery feedback instead of falling through to the retired mixed `/compliance` route. The shared application layout now resolves an expired or detached profile before tenant-scoped permission RPCs, preventing stale sessions from replacing every protected workspace with one Server Component error boundary.

Local browser verification covered Stock Balance, Outlet Daily Records, Outlet Calendar, People and Purchase Requests at 390×844, 820×1180, 1180×820 and 1440×900 with no horizontal overflow or browser console errors. Production v9.2.3 currently returned the same safe error reference `3304477461` for Dashboard and the audited protected routes; this Preview repair is not Production verification and no Production data or deployment was changed.

### v9.2.8 (unreleased) — Actionable People profiles and recoverable Stock PRs

People Profile now provides a direct Employment and outlet-assignment edit path instead of presenting read-only facts without a next action. Authorised People roles may add a staff compliance record with its supporting PDF/image, and authorised sensitive-document readers may open recorded originals from the Documents section. Supporting privacy and assignment copy uses the compact 10px helper scale requested in the annotated Production review.

Outlet Daily removes the redundant Dispatch and Receiving sublabels from the Today summary. Outlet Calendar now states its real boundary: dated expiry and renewal work appears on the calendar, while missing dates and review queues remain in Outlet Compliance.

Stock Balance now applies the same sourcing hierarchy as the server. A branch mapping wins; otherwise an active Item Master default supplier and Purchase UOM are used. An Item with neither may still create a separate Draft PR for Purchasing to map before submission. Ambiguous branch mappings and failed sourcing reads remain blocked rather than guessed. This is implemented and locally verified only; the current Production v9.2.3 screenshots do not prove these Preview changes deployed.

### v9.2.7 (unreleased) — Progressive Daily Sales and Kitchen task navigation

Kitchen mobile navigation now follows the requested operational order: Home, Count, Request, Stock and More. Stock Wastage remains available through More without displacing the frequent Purchase Request workspace from the fixed bottom bar.

Outlet Daily sales reconciliation no longer blocks an operator from saving Received, Wastage or other in-day progress when POS Total has not been entered. POS Total becomes mandatory only when completing the record; an entered non-zero difference still requires an explanation. If the v9.2 sales RPC is not yet available in the connected database, the established daily record is saved through the legacy transaction and the operator receives an explicit notice that sales was not recorded instead of a generic failure.

Migration 232 carries the progressive database rule and is an unapplied Preview dependency. Repository migrations reviewed through `232`; migrations 229–232 have not been applied to Production.

### v9.2.6 (unreleased) — Branch-authoritative Stock Balance PR basket

Stock Balance now resolves the active branch supplier relationship before presenting an Item for PR creation. A branch mapping overrides the Item Master default supplier and purchase UOM; ambiguous or unavailable mappings remain visibly blocked instead of producing a late server error after Kitchen submits the basket.

The basket uses the mapped purchase UOM as a fixed operational unit, preserves its contents when creation fails, reopens with a recovery message, and validates all supplier groups before creating the first draft PR. Legacy locally stored basket rows are retired so stale supplier/UOM choices cannot be resubmitted.

### v9.2.5 (unreleased) — Ordered Stock Count register

Stock Counts now open in descending document sequence instead of `updated_at` order. Revisiting or correcting an older count no longer moves it above newer SC numbers, and the SC No header visibly identifies the active default sort. Sequence sorting follows creation order so month labels do not introduce alphabetical month-order errors.

### v9.2.4 (unreleased) — Clear PR decision and recovery hierarchy

An authorised Purchase Request creator who accidentally submits a request may use `Revoke submission` while it is still in `Manager Review`. The database locks the request and permits the transition only to the original requester or Owner; once Manager has approved or returned it, revoke fails closed. A successful revoke returns the request to Draft, where the normal revise, cancel or resubmit actions apply.

The revoke reason, actor, status transition and document revision are recorded atomically. This closes the previous gap where the UI restricted the control to the requester but a broader company-scoped actor with `pr.cancel` could attempt the RPC directly. Migration 231 is a Preview dependency and has not been applied to Production.

Reviewer decisions, requester correction controls and Owner recovery tools no longer appear as equal actions. Manager Review presents `Approve as Manager` and `Return for correction` as the decision pair. The original requester receives a separate `Request controls` surface for revoke; Owner recovery and permanent deletion remain available behind collapsed `More options` without impersonating the requester.

Repository migrations reviewed through `231`; migrations 229–231 remain unapplied Preview dependencies.

### v9.2.2 (unreleased) — Seven-role full-system audit authority

The release audit now treats People Operations as the seventh system role instead of silently reusing the legacy six-role matrix. All 106 application pages are classified across Owner, People Operations, Finance, Manager, Purchasing, Kitchen and Outlet Staff at 390×844, 820×1180, 1180×820 and 1440×900. Dynamic route parameters, including Outlet Compliance branch IDs, resolve to inert audit identifiers rather than literal bracket paths.

People Operations is limited to its approved People, staff, branch-read and Outlet Compliance responsibilities. It does not inherit Outlet Daily sales, Procurement, Inventory or Document Sequence authority. Manager retains staff administration and scoped People status without sensitive-file access. A new source-wide contract requires every route-owned mutation to expose a responsive action owner, and the static/dynamic layout audits now include Outlet Compliance, Outlet Calendar, People, System Health and AutoCount surfaces.

This is implemented and contract-verified locally. Authenticated seven-role browser UAT is awaiting a disposable local Supabase environment; the current worktree has no `.env.test.local` and cannot access the Docker API. No remote environment or Production operation was performed.

### v9.2.1 (unreleased) — Procurement correction and operational attribution

Kitchen can withdraw its own assigned-branch Purchase Request from Manager Review back to Draft, correct it, and resubmit through the full approval path. Draft cancellation remains available; later Purchasing and Finance review stages must return a request rather than permit silent requester edits. Every transition remains branch-scoped and audited.

Users who may read a Purchase Request or Outlet Daily Record can see the responsible submit/update actor through a bounded display-name resolver without gaining People Profile or sensitive staff access. Procurement stages share one icon and semantic-colour vocabulary, linked documents remain readable at constrained widths, and record actions/files remain reachable at the four canonical viewports. Goods Receiving posting failures return to the record with an actionable message instead of replacing the workspace with a generic error page.

Migration 230 is a Preview dependency. It has not been applied to Production; authenticated mutation UAT and Production verification remain pending.

Repository migrations reviewed through `230`; migrations 229 and 230 remain unapplied Preview dependencies.

### v9.2.0 (unreleased) — Outlet Management, People Operations & Sales Reconciliation

The mixed Compliance workspace is replaced by two bounded OMS modules. Outlet Management owns Outlet Daily Records, an exception-first Outlet register, a seven-item outlet checklist (BOMBA, Business Permit, DBKL, Tenancy Agreement, Insurance, Fire Extinguisher Inspection and POS Licence), a real monthly expiry calendar, and progressive evidence upload with reference number, issued/inspection date, expiry/next-inspection date, notes and review. People owns the existing staff directory and one sectioned People Profile per existing `staffs ↔ auth.users` identity, including restricted vaccination/working-permit status and documents/access sections. People Calendar is intentionally absent. Attendance, payroll, leave, recruitment and employee scoring remain roadmap-only; AMS remains an external reference.

Outlet Daily now reconciles POS Total against DuitNow, Credit Card, Voucher, GrabFood and FoodPanda in the same database transaction as daily product lines. The database derives channel total and difference; any non-zero difference requires a reason and enters `Needs review` without blocking inventory close. Kitchen Qty Sent updates use the legacy ownership path and cannot overwrite sales.

Migration 229 replaces the broad compliance permission with outlet status/upload/document/review and People status/sensitive-document boundaries. Kitchen and Outlet Staff receive no staff-compliance visibility; Outlet Staff can upload outlet evidence without metadata, signed URL, view or download access; Manager receives scoped employee status but never sensitive originals. This source is not Production verified: migration 229 has not been applied remotely, the Preview has not been promoted, and role/viewport UAT remains pending.

Repository migrations reviewed through `229`; migration 229 remains a Preview dependency and has not been applied to Production.

Internet, electricity, water, rent and other outlet operating expenses are not compliance documents. A future Outlet Cost workspace must model recurring, scheduled and actual costs, billing periods, suppliers, payment status, Finance visibility and audit evidence separately; this Preview does not create a misleading amount field inside the checklist.

### v9.1.0 (Preview deployed; authenticated UAT pending) — Compliance & Staff Operations

Compliance is a module inside the existing OMS identity and branch-access model. It tracks outlet business licenses, insurance, fire-extinguisher inspections and POS licenses, plus restricted vaccination-compliance and working-permit status for existing staff accounts. Asset subjects retain an external AMS reference only; this Preview does not merge or mutate AMS data.

The first vertical slice provides an exception-led register for expired, 7/30/60/90-day, missing-document and pending-review work; responsible-owner assignment; branch drill-down; draft/submission/review history; configurable reminder arrays; and sensitive attachment enforcement at both RLS and download boundaries. A dedicated People Operations role carries HR-sensitive access. Manager manages staff plus outlet compliance status and review, but cannot read health-file originals. Owner configures types, Finance has no implicit compliance authority, and all branch access continues through `staff_branches` and existing permissions. Payroll, leave, recruitment, algorithmic scoring and outlet-health scoring are explicitly out of scope.

Migration 228 was applied transactionally to the linked Production Supabase project on 29 August 2026 after the user explicitly changed the original Preview-only boundary. Remote read-back confirmed six compliance types, one active People Operations role per current company, five compliance permissions, seven compliance RLS policies, and migration-ledger version 228. The application remains an isolated Vercel Preview from `codex/v9.1-compliance-preview`; it has not been merged to `main` or promoted as the Production application. Authenticated role and mutation UAT remain pending.

Repository migrations reviewed through `228`; remote schema verification applies only to migration 228 and does not imply migrations 224–226 were applied.

### v8.65.23 (deployed) — v9 interaction and audit closure

The final local v9 audit keeps the accepted dense operational language while closing three shared interaction defects found by the real production-mode route matrix. Direct-page pagination now provides a practical phone touch target, Stock Count row menus retain the shared 44px mobile control instead of shrinking locally, and Purchase Order mobile rows expose the PO and source PR as separate valid links without nesting one anchor inside another.

The authenticated audit runner also waits for the intentional `/stock-balances` → `/stock-balance` canonical navigation before inspecting the React tree. The meaningful gates remain unchanged: named icon controls, practical touch targets, reduced motion, hidden native scrollbars, contained horizontal reachability, concise copy and fail-closed role access are still required. Local evidence is not Production verification; the sanitized Production-like clone remains awaiting its source database password.

All 52 canonical six-role/four-viewport shards now have passing local evidence, alongside 1011 contracts, strict typecheck, lint, the 79-page environment-backed Production build, migration 227 schema verification and an up-to-date migration dry-run.

Commit `77efd376` was fast-forwarded to `main` and Vercel reported the Production deployment complete on 29 August 2026. The Production login page and authenticated Owner session display `v8.65.23`; Dashboard, Item Master, Supplier Items, Stock Balance and AutoCount Import completed a read-only smoke check with no browser console errors. Production currently exposes 755 Item Master records, 752 Supplier Item records and 271 Stock Balance rows. These counts do not imply every Item has a Supplier or branch mapping: records without an authoritative Main Supplier intentionally remain master-only, while purchasing continues to fail closed until an authorized mapping is supplied. The sanitized Production-like clone remains awaiting its source database password and is not claimed as complete authenticated workflow UAT.

### v8.65.22 (unreleased) — Canonical AutoCount supplier reuse

AutoCount Confirm now treats a creditor code as an external identity of the canonical Supplier. When an imported creditor carries a normalized name that already exists, Confirm reuses that Supplier, records the new AutoCount reference, and preserves the established OMS supplier code instead of attempting a duplicate insert. Confirmation is serialized per company so concurrent retries cannot race the active-name identity guard.

The prepared Preview remains retryable and the import stays atomic: a failed confirmation changes no OMS records, and a successful confirmation still creates no inventory movement. Migration 227 was applied to the Production project and the user's staged four-file job completed successfully with no duplicate active Supplier names and no inventory movements; application deployment of the improved recovery copy remains a separate gate.

### v8.65.21 (unreleased) — One purchase chain, one evidence surface

Purchase Requests now expose their full downstream chain: source PR, one or more POs, Goods Receivings and Supplier Invoices remain individually addressable while appearing together as one purchase. PO lists link back to the source PR, and converted PR rows show the furthest PO fulfilment state such as Received instead of stopping at Converted to PO.

Attachments from every linked document are aggregated without copying or losing their source. Each file names the originating PR, PO, GRN or invoice; stage-specific evidence rules still apply to the document that owns the action. Owner removal is a confirmed soft archive, comments can be archived by Owner, and the audit trail remains intact. Tablet and mobile move files, actions, timeline and revisions into one bounded sheet so the main document stays compact and fully scrollable. Supplier/item price history remains a follow-on reporting slice based on immutable PO, GRN and invoice line snapshots rather than an item-master overwrite.

### v8.65.20 (unreleased) — Concise receiving and reliable AutoCount Confirm

Goods Receiving removes the repeated posting explanation and asks for the required Delivery Order only when the operator presses Post. The compact dialog offers upload first and a documented exception second; Delivery Order ownership is marked with `*`, comments use the dense operational type scale, and tablet document scrolling remains reachable above the fixed navigation.

AutoCount selected files can be removed individually. Migration 226 brings Confirm into line with Preview: an Item Master row with no Main Supplier imports under its real Item Group without fabricating a supplier, supplier-item or branch mapping. A full local reset through migration 226 and an authenticated atomic confirmation proved the item imported with a null supplier and zero inventory movements. Application deployment, linked migration application and authenticated Production import remain separate gates.

### v8.65.19 (unreleased) — Truthful wastage rate and stable pagination

Outlet Daily pagination now returns the workspace to its top after a page change instead of preserving the previous page's bottom scroll position. The register separates wastage quantity from its rate and limits the displayed percentage to one decimal, so `76.75` quantity cannot be mistaken for `76%`.

The 30-day headline is now a weighted operational rate—total wastage divided by total received—rather than an arithmetic average of daily percentages. Only completed records with trusted Received values contribute to the result. Local authenticated browser evidence and the focused contracts pass; Production verification remains pending deployment.

### v8.65.18 (unreleased) — Activated global record search

Global search now queries Purchase Requests and Purchase Orders directly under their own read permissions instead of depending on a matching generic Document row. Searchable enum statuses are no longer passed through PostgreSQL `ILIKE`, which previously made an otherwise valid record-number search fail for every role that could read those modules.

The search dialog now distinguishes an active request, a genuine empty result and an unavailable API. It no longer flashes or reports “No results found” when the backend request has actually failed. Local authenticated interaction found `PO-UAT-RECEIVING` by full and partial number; Production verification remains pending deployment.

### v8.65.17 (unreleased) — Workflow evidence and dense table clarity

AutoCount now accepts exports in successive drops: Location Snapshots append, while a newly selected Supplier or Item export replaces the older singleton source. A completed staged job is reported as already imported instead of offering a failing duplicate confirmation. Non-blocking notes are grouped into supplier-mapping and UOM follow-up actions with raw source rows available only on demand.

Delivery Orders uploaded to a Purchase Order after its GRN already exists now synchronize into every linked active Goods Receiving document; migration 225 also backfills historical omissions without duplicating an attachment. The backup page now states the real boundary: PR, PO, GRN, Outlet Daily and document/attachment metadata are included, while uploaded file bodies and secrets are excluded.

Purchase Request recovery removes explanatory duplication, leads with Item Name and Item Code, and reduces UOM guidance to one problem plus one next action. Outlet Daily uses a shared timeline, suppresses rapid duplicate activity, removes redundant Confirmed copy, identifies the last updater, widens Qty Sent, and labels the final date as Last Updated. These changes are locally verified only until migration 225 and v8.65.17 receive authenticated Production UAT.

### v8.65.16 (unreleased) — Operational input and visual alignment

Dashboard work surfaces now share one restrained sage heading treatment instead of mixing similar but visibly different greens. Outlet Daily uses the same column definition for its wide-screen heading and each product row, while tablet layouts keep wastage details on a deliberate second row. Shared number inputs ignore Arrow Up/Down stepping and release focus on mouse-wheel input so incidental navigation cannot silently change operational quantities.

Workflow badges retain their semantic role colors and now use recognizable icons for Manager, Purchasing, Finance, Ready, converted and rejected states. Goods Receiving removes duplicated Delivery Order instructions, shortens the upload action to “Attach DO”, and adds meaningful icons to posting, navigation and upload actions. These source changes require localhost interaction and four-viewport verification before release; the current Production screenshots remain v8.65.15 evidence.

### v8.65.15 (unreleased) — Modal layer ownership correction

Shared dialogs now portal to the document body instead of inheriting the stacking context of the control that opened them. A Delivery Order dialog launched from the fixed mobile receiving rail therefore dims the complete page—including the header and bottom action bar—while keeping only the dialog active and visually clear. The underlying receiving action can no longer appear above the modal backdrop.

### v8.65.14 (unreleased) — Receiving workflow and branch-mapping closure

Purchasing can cancel an unposted Purchase Request through the existing audited removal boundary; sent, converted, or otherwise posted work remains protected. A read-only authenticated Production audit checked all 268 Stock Balance rows and found exactly two mapping defects: `FROMPNG00006` lacked its CK @ PJS10 relationship, while `QUIKGROC00025` had two active relationships with no preferred supplier. Migration 224 repairs only those guarded canonical records and grants `pr.cancel` to active Purchasing roles.

Purchase Order receiving now uses a green primary action and requires a supplier document before quantities are recorded. The attachment dialog is available from both the action and mobile Activity & files, and a new GRN atomically inherits the PO attachment so the operator uploads the Delivery Order once. Mobile PO summary data uses a compact two-column composition. Goods Receiving reduces each line to delivered/rejected input plus one ordered/received/pending strip; batch, expiry and remarks move behind progressive disclosure, known base-UOM quantities remain derived, and the fixed mobile action bar hides only for a real software keyboard. The AutoCount action rail retains separate full-width controls with explicit spacing.

### v8.65.13 (unreleased) — PO mapping idempotency and truthful AutoCount import

The two reported PR failures were not PO-number collisions. Authenticated Production RPC diagnostics identified `supplier_items_supplier_code_active_idx`: the PO-line guard searched supplier-item relationships by purchase UOM, then attempted to insert a second relationship that Item Master identity normalized to the same supplier/item code. Migration 223 now reuses the canonical supplier + item relationship across PO UOMs and keeps branch availability idempotent. It was applied to Production on 26 August 2026; PR/AUG26/023 converted to approved PO-000201 and PR/AUG26/025 converted to approved PO-000208, and both PR/PO relationships were read back through the authenticated Production API.

AutoCount `Main Supplier` is optional Item Master metadata. Blank cells import the Item Master but create no supplier or branch-supplier mapping; `Item Group` is never promoted into a supplier identity. Preview analysis is versioned so an older staged job cannot preserve obsolete blocker semantics. The supplied 26 August workbook stages all 737 items; its 102 blank Main Supplier cells are non-blocking notes, while genuinely missing Supplier List and Location Snapshot files remain blocking. The upload surface accepts multi-file drag and drop, its rail uses one clear full-width action hierarchy, and Branches uses an explicit raised data surface on desktop and mobile.

### v8.65.12 (unreleased) — Orphan PO document recovery

Legacy PR conversion now reuses an active Purchase Order document when the old non-atomic workflow created that document but never created its `purchase_orders` row. The real AutoCount number is preserved, the existing document audit trail receives a recovery revision, and PO header, lines, PR status and activity are committed in one transaction. A document that belongs to another record remains fail-closed with a specific message. Migration 222 is locally reset and schema-verified; Production application and authenticated read-back of PR/AUG26/023 and PR/AUG26/025 remain separate gates.

### v8.65.11 (deployed; authenticated Production PR read-back pending) — Legacy PR-to-PO reconciliation

Historical PRs stranded in `ready_to_convert` now finish through one guarded reconciliation action. If the PO is already linked to the same PR, the workflow completes idempotently. An unlinked PO may be attached only when company, branch, supplier and active state match exactly; a PO owned by another PR or business order remains blocked with a specific operator message. Correcting a legacy AutoCount number and creating the PO occur in the same database function, so the Ready stage no longer calls the Purchasing-only number RPC. Production migrations 216–221 were applied and commit `27091933` was deployed on 26 August 2026; authenticated read-back of the two reported Production PR/PO relationships remains the final workflow gate.

### v8.65.10 (unreleased) — Atomic Finance-to-PO handoff

Finance approval now creates the approved Purchase Order in the same database transaction using the AutoCount PO Number already recorded by Purchasing. A duplicate or invalid number rolls the approval back, so the PR cannot remain in a half-approved `ready_to_convert` state; historical records already in that state retain one clearly labelled recovery action. Purchasing can send an approved PO through either canonical permission alias, and the database transition now evaluates the same aliases as the application. Outlet Daily activity records only real Received, Wastage, Qty Sent, Leftover, note, or status changes, folds identical rapid historical saves, and always identifies the record creator without inventing unavailable history. Dashboard removes the non-operational master-data tile, strengthens the restrained sage attention band, and the mobile workspace sheet uses plain task language. Clean reset through migration 220, the authenticated procurement closure, and the affected four-viewport localhost matrix pass; deployment, current Production record repair, and authenticated Production UAT remain separate gates.

### v8.65.9 (unreleased) — Localhost visual audit correction

The post-implementation review now uses the actual authenticated localhost UI rather than source inspection alone. Purchase Request and Outlet Daily desktop tables fit their shared working canvas without relying on an invisible horizontal journey; 820px Purchase Request details reflow to two readable columns and phones use one column. Inventory renders a compact verified-empty movement state instead of a large zero chart, while Dashboard quick actions use one flat segmented command bar rather than three floating cards. The v9 browser runner no longer demands the rejected scrollbar-edge gradient; it keeps the meaningful gate that any remaining horizontal table is a named, keyboard-focusable region. After focused screenshot inspection, the complete production-mode localhost gate passed all `52/52` shards across 99 routes, six authenticated roles, and the four fixed viewports, then exited cleanly. Real-data Dashboard density and Production-like authenticated UAT remain separate evidence boundaries.

### v8.65.8 (unreleased) — Browser hierarchy and dialog-layer correction

The rejected scrollbar-edge treatment is removed across shared tables: native scrollbars remain hidden, but no gradient, fade, inset shadow or scroll-state decoration obscures the final business column. Dashboard groups now retain deliberate internal padding and a restrained sage surface hierarchy instead of flush white cells. PR review item suggestions portal into the owning native dialog top-layer, Quantity/UOM remain visible before item selection, 820px documents return vertical scrolling to the page, and commercial unit cost sits directly below purchase quantity. Local authenticated Owner browser verification passed the four fixed viewports and exercised Replace and Add line against a disposable 17-line PR; Production-like authenticated UAT still requires the source database password and Production is not verified.

### v8.65.7 (unreleased) — Annotation workflow and density closure

The 26 August browser review is implemented at shared product authorities rather than as screenshot-only overrides. Dashboard work, exception, pipeline and payable signals now use compact grouped surfaces instead of oversized nested cards; Production Jobs returns to the standard wide list canvas; Outlet Daily removes duplicate status copy and clarifies Today’s hierarchy. PR review now opens the canonical supplier-item search immediately and permits the active Manager or Purchasing reviewer to update or replace item, quantity and UOM, or add a line with a required reason. A new Stock Count exposes Replace, Remove and Retire from each row plus a final dashed Add item tile; line-scope actions persist the draft first so audit and fixed-scope rules remain intact. Verified-empty Inventory insight cards are omitted while unavailable sources still fail visibly. Migration 219 is required for Manager review add-line authority. Source and local checks are implementation evidence only; authenticated Production-like UAT is awaiting the source database password and Production is not verified.

### v8.65.6 (unreleased) — V9 local system audit closure

The v9 release gate now exercises 99 routes across Owner, Finance, Manager, Purchasing, Kitchen, and Outlet at 390×844, 820×1180, 1180×820, and 1440×900. It fails closed on route authority, runtime/page errors, horizontal overflow, inaccessible icon actions, undersized touch controls, verbose or oversized headings, visible native scrollbars, unreachable scroll content, and reduced-motion regressions. The owned Playwright server now shuts down through an authenticated same-origin endpoint, so a completed browser run exits cleanly instead of being confused with a product failure. Migrations 216–218 reconcile the canonical audit-log schema and the intended Finance/Manager read and authoring boundaries. Local authenticated UAT passed 52/52 shards; Production-like authenticated UAT is still awaiting the source database password, and nothing in this release is claimed Production verified.

### v8.65.5 (unreleased) — Production UAT environment guard

Production UAT now requires an explicit environment file, confirmed Production intent, the canonical `system.seribako.com.my` origin, a non-loopback Supabase host, and an exact expected project reference before authentication or mutation begins. Local and Production credentials can no longer be silently combined. The exact cancelled test PO cleanup completed through the Owner-only guarded RPC after migrations 209–215 were applied; authenticated verification found zero remaining records and restored the source PR to `ready_to_convert`.

### v8.65.4 (unreleased) — Database executable stability closure

The cancelled-PO Owner cleanup path now cooperates with committed-line immutability through a transaction-local, RPC-only bypass after dependency and typed-confirmation checks. Executable schema lint is clean: obsolete Location, barcode, recipe identity, notification-column, and Production/Item ambiguity references are repaired without weakening tenant or workflow guards. Migrations 211–215 are locally applied and lint-clean; linked Production application and authenticated mutation UAT remain separate gates.

### v8.65.1 (unreleased) — Stock Count balance authority repair

Stock Count posting now uses the same canonical parent-or-line movement balance as the count seed and inventory summary. Multi-line GRN, transfer and other documents no longer create a false snapshot-conflict error merely because their quantities live on `stock_transaction_lines`. Genuine movements after a draft began still block posting, but the operator now sees the affected item code/name plus starting and current balances; the saved physical count remains intact. Migration 207 must be applied before the runtime fix is Production-active, and authenticated posting UAT remains separate evidence.

### v8.65.0 (unreleased) — Reliability v5 foundation

OMS introduces a tenant-scoped reliability foundation without silently changing business facts. Safe reads use a bounded transient-only retry and short circuit breaker; writes remain unretried unless their workflow already owns an idempotency key and server-authoritative result. Stock Count creation is the first tracked-operation pilot, while autosave failures create grouped Owner incidents without blocking device recovery. An Owner-only System Health workspace separates recovered signals from action-required incidents, with three-occurrence or fifteen-minute escalation. Migration 206, authenticated role/viewport UAT, staged deployment and Production observation remain separate release gates.

## Current closure policy (2026-08-23)

Production UAT mutation is now Owner-authorized only when it is traceable, isolated, recorded in `docs/PRODUCTION-UAT-TEST-DATA-2026-08-23.md`, and cleaned up after verification. Historical release notes that describe Production mutation as unauthorized remain historical evidence and are superseded by this current policy.

### v8.64.172 (unreleased) — Guided Stock Count completion

Stock Count keeps its primary Save action available when physical quantities are incomplete. Submission validates the whole frozen scope, presents an exact missing-item summary, switches the list to the missing rows, then scrolls and focuses the first required quantity. Missing rows receive inline accessible error state, while Show all returns to the complete count. This follows the established validation-summary plus first-invalid-focus pattern instead of leaving staff with an unexplained disabled button. Local focused tests, typecheck, and lint passed; authenticated mobile interaction UAT, deployment, and Production verification remain separate.

### v8.64.171 (unreleased) — Reliable Stock Count draft progress

Stock Count now reports completed and remaining physical counts instead of labelling every loaded row as ready. Incomplete work is retained locally without calling the server autosave endpoint, so an expected unfinished count no longer appears as a save failure. Versioned recovery snapshots distinguish explicit edits from an unchanged historical prefill, preventing a refreshed branch scope or starting balance from manufacturing hundreds of false adjustments. Pre-version snapshots remain recoverable: matching item quantities are retained, retired old lines are ignored, and newly scoped lines use the current source value. The operator tolerance setting is removed; exact quantity and variance evidence remains visible while the legacy database field is written as zero for compatibility. Local focused tests and typecheck passed; authenticated mobile UAT, deployment, and Production verification remain separate.

### v8.64.170 (unreleased) — PO restore and Outlet draft progress

Cancelled Purchase Order restoration now casts validated recovery values to their PostgreSQL enum types before updating PO and Document state. Outlet Daily supports a repeatable same-day draft workflow: Received may be entered and saved in the afternoon, the record remains editable, and Wastage can be completed later before posting. Unverified receiving is displayed as an exact pending food-line count rather than an unexplained Unavailable state. Redundant Purchase Order attachment, no-action, and revision helper copy remains removed. Migration 205 is remotely applied and the linked dry-run is current; application deployment and authenticated workflow UAT remain separate.

### v8.64.169 (unreleased) — Operational row and action refinement

Purchase Request and Dashboard queues now share one labelled, fixed-track information grid for location, supplier, date, user, item count, and estimated cost. Stock Count moves branch retirement behind a More menu below the visible row number while preserving the pending lifecycle state. Movement Ledger owns wider fixed columns with horizontal scrolling instead of compressing business identity. Cancel remains visually neutral; destructive triggers no longer duplicate a visible Confirm label; Purchase Order attachments use the shared Supporting Attachments grammar with an empty operator-owned label and one Upload action. Local verification does not constitute deployment or authenticated browser UAT.

### v8.64.168 (unreleased) — Outlet Daily table and form refinement

Outlet Daily keeps Date readable by using the correct two-column sticky lead band, provides server-authoritative Date, Outlet status, and Updated sorting, distinguishes Posted from Draft with semantic success/neutral tones, and removes redundant missing-state helper copy. Wastage details remain inside their line instead of creating horizontal overflow. PR review uses a controlled UOM selector and starts attachment labels empty. Stock Balance supplier group headings use the shared muted surface rather than a floating white label. Local verification does not constitute deployment or authenticated browser UAT.

### v8.64.167 (unreleased) — Outlet Daily ownership and food-only metrics

Outlet Daily draft rows resolve the responsible user through submitted, updated, then created ownership. Qty Sent is confirmed as its own Kitchen/company-wide step before posting, while Outlet may keep saving Received and Wastage as a draft. Packaging stays editable on the record but is excluded from Received and Wastage Rate analytics. The detail identity removes the duplicate location, stays on one line on desktop, and uses a 14px branch line followed by the date on phone; Today metrics now have explicit Dispatch, Receiving, and completion hierarchy. Local verification does not constitute deployment or authenticated Production UAT.

### v8.64.166 (unreleased) — Procurement alignment and explicit selection

Purchase Request and Dashboard operational rows now use stable two-column context and four-column date/user/quantity/cost alignment, with supplier names constrained to one ellipsized line. PR entry shows its selected supplier in the collapsed quick view, searches only exact branch-and-supplier mappings, and never converts typed text into a selected item without an explicit click or keyboard confirmation. Attachments use one Upload label, omit MIME noise, and align actions beside uploader/time. Returned-request feedback uses the shared icon vocabulary, one readable type scale, a subtle danger surface, and a full Malaysia timestamp. Purchasing and Finance may send approved POs; Owner-only permanent deletion is available for cancelled POs only when receiving, return, and invoice history are absent, with a permanent tombstone. Migration 204 is remotely applied and the linked dry-run is current; application deployment and authenticated four-viewport UAT remain separate.

### v8.64.165 (unreleased) — Branch Stock Count item lifecycle

Stock Count eligibility is now branch-owned and includes active mapped items even before their first ledger movement. Kitchen can mark an item to retire after the current count, with a required category, explanation, and final physical quantity; posting preserves the final inventory evidence, retires the item only from future counts for that branch, records the lifecycle on Item detail, and notifies Purchasing and Finance. New mappings activate future-count scope without silently reactivating a retired item. Visible row numbers follow the current Name/Code view. AutoCount APIs return JSON for expired sessions and the client refuses HTML responses with an actionable sign-in-and-retry message. Migration 203 and the application are locally implemented; authenticated role/viewport UAT, remote migration application, deployment, and Production verification remain pending.

### v8.64.164 (unreleased) — Safe procurement actions and compact document tools

Destructive actions now open a visible danger confirmation dialog across document, production, stock, profile, attachment, recipe, and master-data surfaces. Cancelled unposted purchase orders remain in the Cancelled register and can be restored when no downstream record or replacement PO conflicts; migration 202 owns the server-authoritative recovery contract. PR attachments use one compact upload row and icon actions, Purchasing sees an explicit required AutoCount PO number, PR/Dashboard mobile rows share one aligned composition, and Add Line searches item-code-ordered items scoped to the selected supplier. These changes are locally implemented; migration 202 deployment, authenticated role/viewport UAT, application deployment, and Production verification remain open.

### v8.64.163 (unreleased) — Annotation layout and correction closure

Portrait tablet workspaces now share a contained canvas and a two-row, no-wrap query contract. Purchase Requests gain a six-field summary, compact operational rows, clear rejection context, submitter-owned correction and dialog-based line entry; migration 201 keeps rejected/returned edits server-authoritative without advancing workflow. Stock Balance enforces a single-branch basket and filters restored browser state against accessible branches. Items hides operational Category presentation, and Outlet Daily separates Kitchen Qty Sent from Outlet Progress with readable column widths. These changes are implemented locally; authenticated role/viewport UAT, remote migration application, deployment and Production verification remain outstanding.

### v8.64.162 (unreleased) — Production UAT cleanup closure

Production migrations 196–199 are applied and the remote migration dry-run reports no pending work. Migration 200 performs an exact, marker-guarded, idempotent cleanup of the single manifested `PR/AUG26/020` fixture through the existing Owner hard-delete RPC, preserving its permanent deletion tombstone. Production read-back confirms the PR is absent from search and unavailable at its former URL.

### v8.64.161 (unreleased) — Procurement closure verification

The isolated PR-to-stock workflow now verifies Kitchen submission, Manager approval, Purchasing AutoCount PO entry, Finance approval, PO conversion and supplier sending, Goods Receiving draft/attachment, and final inventory posting in one repeatable browser scenario. Goods Receiving keeps its required setup and Delivery Order Number visible on first render so a preselected PO cannot hide the next required action before hydration.

### v8.64.160 (unreleased) — Reliable long-form mobile scrolling

Long Outlet Daily entry forms now preserve vertical pan gestures across their dense input grid and reserve the full fixed-action height plus iPhone safe area. The final product lines can scroll completely above the action rail without changing the browser-level document scrolling contract.

### v8.64.159 (unreleased) — Purchasing workdesk correction

Pending PRs are ordered newest-first and expose supplier, item count, submitter, and estimated cost on the Dashboard. Purchasing can identify submitters, add or revise request lines with an audit record, must record the AutoCount PO number before Finance Review, and can send approved POs to suppliers. Pending line revisions block Finance/PO progression. Outlet Daily removes the draft choice and presents one posting action only after Kitchen Qty Sent is complete.

### v8.64.158 (unreleased) — Outlet entry while Qty Sent is pending

Outlet Staff can enter Received and Wastage even when Kitchen has not yet confirmed Qty Sent. The primary action saves the entry as a draft, while completion remains unavailable until every line has an authorised Qty Sent confirmation. The server-side completion guard remains authoritative, and the error copy now explains the safe next step instead of implying that line entry is blocked.

### v8.64.156 (unreleased) — Converted PO cleanup boundary

Converted purchase orders that have not been sent or posted now retain the audited `Delete unposted order` action. This keeps the normal cancellation path available for operator corrections and traceable UAT cleanup; it does not permit cancellation after supplier sending, receiving, or accounting impact.

### v8.64.157 (deployed) — Kitchen Outlet Daily branch visibility

Kitchen already owned the explicit Outlet Daily visibility and Qty Sent permissions, but the tenant `branches` RLS policy filtered Kitchen out before the form could resolve outlet labels. Migration 195 adds a narrow, company-scoped read policy for `branch_type = 'outlet'` gated only by `outlet_daily_record.view_all`; it does not grant generic branch administration. Production migration application, v8.64.157 deployment, and Kitchen four-viewport Qty Sent read-only UAT now pass.

## v9 design direction (baseline, 2026-08-23)

v9 upgrades the shared OMS experience in controlled batches: stronger typographic hierarchy, calmer information density, role-adaptive work surfaces, and subtle state transitions. It keeps the Seri Bako green identity and operational vocabulary; it does not imitate macOS chrome, hide business labels behind icons, or change workflow authority while visual work is in progress. From v9.2.2 onward every batch must retain the four-viewport and seven-role acceptance matrix, semantic color rules, fixed mobile/tablet bottom navigation, and explicit unavailable/error states; earlier six-role evidence remains historical.

### v9 batch 01 — Shared type hierarchy (implemented; local acceptance passed)

The shared shell now owns a display scale for page identity, a readable supporting-copy scale, optical font sizing, and restrained motion tokens. The change is visual-only. Local six-role × four-viewport checks found no horizontal overflow, and the fixed mobile navigation stayed fixed at every target size. The release footer remains v8.64.157 until this batch is promoted and rechecked in Production.

### v9 batch 02 — Motion and interaction preference (implemented; local acceptance passed)

Shared table state transitions now consume the v9 motion token, while the existing reduced-motion contract keeps operational state visible without animation. The CSS-only change preserves the batch 01 six-role × four-viewport geometry evidence and remains local-only until promotion.

### v9 batch 03 — Dashboard identity and panel hierarchy (implemented; local acceptance passed)

Dashboard identity and panel headings now consume shared type tokens so role context reads as one deliberate hierarchy across the shell. Local Owner, Manager, Purchasing, Finance, Kitchen, and Outlet dashboards passed all four target viewports with no horizontal overflow; the fixed mobile navigation remained fixed and identity text stayed within the responsive clamp. This is visual-only; role data, metric ownership, and workflow actions are unchanged. Production remains on v8.64.157 until promotion.

### v9 Production visual checkpoint (2026-08-23)

The accepted v9 visual batches are now on `main` and served by Production. Owner, Manager, Purchasing, Finance, Kitchen, and Outlet dashboards passed `390×844`, `820×1180`, `1180×820`, and `1440×900` read-only checks with no horizontal overflow, no settled loading state, and fixed mobile navigation. The Production Purchase Requests page-header also passed all four viewports (`21.6px` phone through `24.288px` desktop). Footer remains `v8.64.157`; no business data was mutated.

### v9 batch 04 — Advanced visualization audit (accepted; no code change)

The existing interactive trend surface already follows the v9 chart contract: neutral/brand semantic colors, hover and touch selection, keyboard arrow/Home/End navigation, a bounded tooltip, and a screen-reader data list. No duplicate chart layer was introduced; this preserves one source of truth for operational trends while keeping the v8.64 business semantics intact.

### Production UAT checkpoint (2026-08-23, current evidence)

The authorized Production mutation run completed the real PR workflow for the isolated fixture `PR/AUG26/020`: WILSON created and submitted it, TEST MANAGER completed Manager Review, TEST PURCHASE completed Purchasing Review and converted it, and TEST-FINANCE completed Finance Review. After main deployment, the approved unsent PO `UAT-20260823-PO-001` (`4fac5716-8c99-46a3-8ed3-80c015804bc6`) was removed through the audited cancellation action at 09:31 MYT. No inventory, GRN, invoice, payment, or supplier-send effect was created; the PR remains only as an audit history row. The local release and Production cleanup are now verified for this fixture; this does not by itself close the remaining six-role workflow gates or trigger v9.

### v8.64.155 (unreleased) — Stock Count compact control fix

Stock Count quantity controls now preserve a readable 40px input on the 390px phone card: the +/- controls use the shared compact 40px touch target and the group closes its small-screen gap before the UOM label. Desktop and tablet rhythm remains unchanged. Local responsive evidence is required before this batch is considered complete; Production regression remains separate.

The earlier read-only checkpoint below recorded the then-deployed v8.64.148 surface; it is historical evidence and is superseded for current status by the authenticated UAT checkpoint above. The current six-role read-only batch confirms Owner, Manager, Purchasing, Finance, Kitchen, and Outlet dashboards/workspaces at all four target viewports with no horizontal overflow or settled loading state. Outlet Daily keeps Qty Sent unavailable to Outlet Staff; Kitchen sees the outlet matrix and has 51 enabled Qty Sent controls while Received/Wastage remain read-only. No Production business values were changed during this final check.

Local E2E fixture hygiene: the disposable records and six local test identities used for this closure audit were removed from the local Supabase target after verification. `scripts/cleanup-local-e2e.mjs` is local-only and refuses non-local database URLs; no Production data was mutated.

### v8.64.154 (unreleased) — Local workflow audit hardening

The local closure audit now exercises the remaining mutation surfaces instead of treating browser smoke as completion: PR Manager/Purchasing review navigation, Stock Count/Transfer/Wastage posting, progressive GRN UOM learning, Supplier Invoice payment, and Outlet Daily ownership. The Manager review test uses the explicit accessible row action, and optional reset-local ledger fixtures are skipped before fixture-specific assertions so a truthful empty ledger is not reported as a product failure. Local evidence is recorded separately from Production verification; the six-role Production mutation gate remains awaiting UAT.

### v8.64.153 (unreleased) — Qty Sent ownership closure

Outlet Staff can view their daily record and enter Received/Wastage, but Qty Sent is visibly marked as Kitchen-owned and remains disabled. Kitchen and authorised company-wide roles can confirm dispatch quantities; the server RPC and RLS remain authoritative. Local disposable E2E now proves the Outlet UI and direct RPC cannot alter Qty Sent while Kitchen can confirm it. Production role regression remains a separate gate.

The refreshed local annotation audit now passes the 19-case core-flow suite and the 10-case historical PR/UI suite after provisioning the disposable annotation fixture. These results cover supplier/item identity, natural sorting, PR/PO disclosure, semantic stage colors, keyboard-safe navigation, basket ownership, and Outlet Daily visibility; they remain local evidence only.

The follow-up historical density suite passed `5/5`, and the P0 browser-comment regression passed `6/6` across filter grammar, role-safe PR review, procurement UOM, dashboard deduplication, AP aging, production canvas, Outlet Daily density, and low-stock decisions.

The local dynamic workflow responsive audit also passed `1/1` across Stock Transfer, Stock Wastage, and Production Job forms at 390×844, 768×1024, and 1440×960 with no control overflow.

### v8.64.152 (unreleased) — Receiving and invoice UAT closure

Local downstream workflow evidence now covers progressive receiving UOM learning (known, remembered, and one-time floating conversions) plus the flat Supplier Invoice matching surface across phone and tablet orientations. These are disposable local mutations/read checks; Production GRN, Invoice, and payment mutation remain outside the current boundary.

### v8.64.151 (unreleased) — Role-scoped PR detail closure

Purchase Request detail now resolves the Owner-only hard-delete preview only for Super Admin. Manager, Purchasing, Finance, Kitchen, and Outlet detail views no longer invoke a guaranteed-denied RPC or emit misleading permission errors during normal navigation. The deletion control remains unchanged for the Owner role.

### v8.64.150 (unreleased) — Six-role viewport audit closure

The local six-role workdesk regression now runs the exact release matrix: 390×844, 820×1180, 1180×820, and 1440×900. Each role must retain its scoped dashboard, safe destinations, no horizontal overflow, and responsive action rail. This is local evidence; Production login, migration 194 application, and authenticated read-only regression remain separate gates.

### v8.64.149 (unreleased) — Kitchen Qty Sent visibility closure

Kitchen can now reach company-wide Outlet Daily records before confirming dispatch quantities. The dedicated Qty Sent permission grant is preserved, while the Outlet Daily RLS policies use the outlet-specific access helper rather than the generic tenant branch helper; no unrelated Kitchen company-wide table access is broadened. Local disposable E2E remains the evidence boundary until migration 194 is applied and Production read-only regression is rerun.

### v8.64.148 (unreleased) — Qty Sent role boundary closure

The local and mock permission matrices now match the database contract: Kitchen, Manager, Purchasing, Finance, and the protected Super Admin path may confirm Qty Sent; Outlet Staff never receive that permission. Kitchen also retains company-wide Outlet Daily visibility so the dispatch step is reachable. The Qty Sent field stays disabled for Outlet users and the server RPC remains authoritative. The disposable local E2E fixture now exercises Kitchen confirmation while keeping Received and Wastage read-only.

### v8.64.147 (unreleased) — Kitchen dispatch visibility closure

Kitchen now receives the company-wide Outlet Daily visibility required to inspect outlet records and confirm Qty Sent before an Outlet submits its own receiving and wastage values. The new forward-only migration 193 is additive and idempotent; Outlet Staff remain outside `view_all` and `qty_sent`. Production read-only UAT on the deployed v8.64.145 surface exposed the previous Kitchen loading/visibility gap; no Production mutation was attempted.

### v8.64.146 (unreleased) — Qty Sent ownership and truthful totals

Qty Sent is now explicitly owned by Kitchen and company-wide review roles (Manager, Purchasing, Finance, and the protected Super Admin wildcard); Outlet staff remain unable to enter or correct it. Missing or unverified Qty Sent totals render as `Unavailable / Needs confirmation` instead of a misleading zero. Local migration 192 adds the role grants and the 191 guard remains local evidence until the user applies the migration and Production is promoted; the current Production footer observed during read-only UAT is v8.64.145.

### v8.64.145 (unreleased) — Production identity and natural-sort audit

Authenticated Production read-only checks confirm supplier identity surfaces expose `AutoCount` identifiers for BWY HOLDINGS (`BWYHOLDI`) and CILANTRO MAGNUS TRADING (`CILANTRO`) without overwriting the official supplier name or operator short name. The Supplier Item form provides a keyboard-searchable Item Master combobox, read-only Base UOM ownership, and controlled Purchase UOM options. The Items list returns natural item-code order (`1, 2, 3, 5, 6, 7, 9, 10, 11, ...`). These are read-only Production observations; no supplier or item mutation was performed.

### v8.64.144 (unreleased) — PR sourcing handoff clarity

Purchase Request detail now explains unresolved non-catalog lines at the Validation / Next Step surface. Manager approval can continue as a non-blocking handoff, while Purchasing is explicitly told to match the affected lines before Finance review and PO conversion. The notice preserves progressive sourcing without hiding the next operational responsibility. Local and authenticated Production read-only evidence remain separate gates.

### v8.64.143 (unreleased) — Qty Sent completion guard

Outlet Daily cannot be marked Posted while any line lacks an authorised Qty Sent confirmation. A Kitchen or authorised company-wide operator must confirm every line first; an Outlet receives a bounded, product-anchored correction message instead of a false completed record. Local Supabase migrations 191–195 now guard completion, grant Qty Sent ownership to Kitchen-and-above roles, give Kitchen the visibility required to use it, and scope the Outlet Daily RLS repair without broadening generic tenant access. Repository migrations reviewed through `195`; this is local evidence only until the user applies migrations 191–195 and Production read-only regression is rerun; the six-role mutation boundary remains awaiting Production mutation UAT.

### v8.64.142 (deployed) — Dashboard snapshot cleanup

The role micro-chart consumer has been removed from the dashboard because Finance, Kitchen, and Purchasing snapshots repeated the same payables, receiving, production, and follow-up values already owned by their canonical panels. The standalone chart component remains available for a future release only when a distinct trend data source exists. Read-only Production smoke now reaches 15 audited routes with HTTP 200 and footer `v8.64.142`; authenticated six-role UAT remains pending.

### v8.64.141 (deployed) — Dashboard signal deduplication

Owner and Manager dashboards no longer render a second Operational trend card that repeats the same stock-count, wastage, and outlet-completion values already owned by Today&apos;s work and Exceptions. Each signal now has one primary surface and one drill-through. Production route smoke now serves footer `v8.64.141`; authenticated six-role UAT remains separate.

### v8.64.140 (deployed) — Keyboard-safe tablet navigation

Tablet and iPadOS shells now keep the fixed bottom navigation attached to the physical screen edge while the software keyboard reduces the dynamic viewport. The CSS large/dynamic viewport delta is a fallback when visualViewport does not emit a resize event. Production now serves v8.64.140; authenticated six-role regression and Production mutation UAT remain separate gates.

### v8.64.139 (deployed) — Production deployment boundary

Read-only Production route smoke reached 16 core paths with HTTP 200 and footer `v8.64.139`. This proves the deployed host is reachable and internally consistent; authenticated Production regression remains pending and no mutation was attempted.

### v8.64.138 (unreleased) — Linked migration verification

The user-provided linked Supabase push completed migrations `185–190` successfully. The CLI emitted a non-blocking pg-delta catalog-cache certificate warning after applying the SQL; the command still ended with `Finished supabase db push.` Local and linked schema evidence are now separated from the remaining Production read-only regression gate.

### v8.64.137 (unreleased) — Migration uniqueness guard

The contract suite now rejects duplicate numeric Supabase migration prefixes and requires the AutoCount repair to remain forward-only at migration 190. This prevents another `schema_migrations_pkey` collision before a linked push. Local evidence only; linked and Production gates remain separate.

### v8.64.136 (unreleased) — Post-migration local workflow closure

After local migration 190 was applied, the authenticated browser closure rerun passed progressive receiving `3/3` and the complete PR → PO → GRN/attachment/payment QA suite `3/3`. The first combined run exposed a transient Next dev hydration timing failure; the clean rerun passed without source changes. This remains local evidence only; linked migration and Production regression are separate gates.

### v8.64.135 (unreleased) — Migration history reconciliation

The linked Supabase project already records migration version `171`, while the repository also carried a second, different `171_*` file. That duplicate made `db push --include-all` fail with a `schema_migrations_pkey` conflict. The already-applied migration remains immutable; the complete AutoCount Confirm replacement now runs forward at migration `190`. This is repository/local evidence only until a successful linked migration result is supplied.

### v8.64.134 (unreleased) — Progressive receiving snapshot closure

Unknown pack-size receiving now has a database-side safety net: when actual Purchase and Base quantities are present, the local migration derives the conversion snapshot before stock posting and conversion audit. Fresh local evidence passed progressive receiving 3/3, master data 1/1, Recipe 1/1, and Purchase Return 1/1. This is local evidence only; linked migrations and Production regression remain separate.

### v8.64.133 (unreleased) — Outlet Daily closure audit

Fresh local Supabase browser evidence now covers the Outlet Daily workflow end to end: date history and completion matrix, conditional wastage details, direct posting at four viewports, company-wide Qty Sent correction, dated product-line export, and the wastage/AP/cash-flow report surfaces all passed 19/19. The first stale-server attempt is excluded; this is local evidence only and does not promote linked migrations or Production regression.

### v8.64.132 (unreleased) — PR to PO error feedback closure

The local procurement closure now verifies the browser duplicate path as well as successful PR-to-PO conversion: a second disposable Ready to Convert request using the same AutoCount PO number receives a clear duplicate message, keeps the typed value, and does not create a second active PO. This is local evidence only; linked migrations and Production regression remain separate.

### v8.64.131 (unreleased) — Closure ledger reconciliation

The current closure ledger now distinguishes historical wording from current evidence: guided PR Apply, Purchase Return, AP Aging, progressive receiving, and the six-role procurement closure are locally verified where stated; linked/Production status remains separate. The dedicated browser PR-to-PO duplicate/error feedback probe is now closed by v8.64.132.

### v8.64.130 (unreleased) — AP Aging report closure

The local AP Aging report now has fresh authenticated evidence for the distribution interaction and phone layout: keyboard/hover previews expose invoice context and the drill-through link, while the 393px touch view keeps all seven buckets directly labelled and inside the viewport. This is local evidence only; linked migration alignment and Production regression remain separate.

### v8.64.129 (unreleased) — Purchase Return workflow closure

The disposable local receiving fixture now passes the authenticated Purchase Return browser path: create and refresh the draft from a posted GRN, post the supplier return, and verify the single return movement in Stock Transactions. This is local evidence only; linked migration alignment and Production regression remain separate.

### v8.64.128 (unreleased) — Guided PR review closure

The disposable local audit now executes the guided Manager Review repair end to end: replacing an unmapped request line with an Item Master item, mapped supplier, controlled Purchase UOM, and revised quantity succeeds through the visible Apply action and is asserted in both the request line and immutable revision history. This is local evidence only; linked migration alignment and Production regression remain separate.

### v8.64.127 (unreleased) — Current local closure audit refresh

After the retry-safe migration re-execution, the clean local production-like server again passed the full disposable Manager → Purchasing → Finance → Ready to Convert → PO/GRN/payment closure (3/3). This refresh strengthens local mutation evidence and does not promote any row to linked or Production verification.

### v8.64.126 (unreleased) — Progressive receiving migration closure

Migration 185 is now retry-safe for partial application: the supplier-UOM index uses an idempotent create, receiving checks are guarded by relation-aware constraint checks, and a direct second execution against the local PostgreSQL stack completed without errors. The clean local server still passes the three progressive UOM E2E scenarios. This is local evidence only; linked migration and Production regression remain separate.

### v8.64.125 (unreleased) — Progressive receiving UOM closure

Authenticated local Supabase E2E now proves the receiving learning loop: unknown 2 CTN → 24 KG with an immutable snapshot and optional Remember, a later 1 CTN receipt auto-calculates 12 KG, and a floating 2 BAG → 17.4 KG receipt remains one-time without changing the supplier default. Base-unit stock quantities and normalized costs are asserted from the posted ledger. This is local evidence only; linked migrations and Production regression remain separate.

### v8.64.124 (unreleased) — Fresh local workflow audit closure

The local production-like browser audit now includes the corrected field-level PR validation expectation and passed the remaining workspace, goods-receiving, Outlet Daily entry, administration, and responsive checks 12/12. This release record is local evidence only; linked migrations and Production regression remain separate.

### v8.64.123 (unreleased) — Sourcing boundary and fresh role audit closure

Changing the suggested Supplier now clears existing request lines that are not supplied by the new branch-scoped catalogue and explains the reset in plain language. The Item Master remains available for a deliberate re-selection, so missing supplier setup is still progressive review work rather than a submission blocker. A fresh local production-like audit passed six-role routing/dashboard/workspaces (20/20), PR → PO → GRN → invoice/payment/close (3/3), Outlet Daily history/Qty Sent/export/wastage and report surfaces (18/18), master-data and Recipe mutations (2/2), remaining review/return/invoice forms (6/6), and annotation/P0/responsive coverage (26/26). This is local evidence only; linked migrations and Production regression remain separate.

### v8.64.122 (unreleased) — Recipe workflow and document transition closure

The local production-like audit now creates, edits, submits, approves, and activates a disposable Recipe through the visible Recipe Workflow action at every state. Recipe and linked Document writes are sequential and fail loudly if either record cannot be updated, preventing the former silent half-transition. Migration 188 qualifies approval-step references in the shared document transition RPC and is applied only to the local Supabase stack; linked/Production verification remains open.

### v8.64.121 (unreleased) — Master-data mutation closure

The fresh local production server passed the authenticated master-data mutation E2E: Super Admin created and edited a disposable Branch, Supplier, and Item, with database assertions and soft-delete cleanup. Existing local closure evidence remains: six-role routing/dashboard/workspace checks (20/20), PR → PO → GRN → invoice/payment closure (3/3), Costing/GRN/Outlet Daily/Purchase Return/Supplier Invoice surfaces (8 passed, 2 fixture-dependent skips), and administration/master-data responsive checks (2/2). This is local evidence only; linked migrations, real AutoCount creditor/UOM data, and Production regression remain separate gates.

### v8.64.118 (unreleased) — Local closure audit follow-up

Local browser reruns now pass the AP/Recipe costing-readiness surface, Item/Supplier/Branch administration surface, and immutable Purchase Return posting alongside the Outlet Daily cost/export workflows. Export fallback filenames use the Kuala Lumpur business date, not the machine UTC date. This remains local evidence only; linked/Production migration and six-role regression gates remain open.

### v8.64.117 (unreleased) — Outlet wastage cost summary

Company-wide operational roles now see a “Today’s wastage value” panel alongside Outlet Daily work. It multiplies recorded product wastage by the latest active recipe cost snapshot, reports partial or unavailable cost authority explicitly, and remains hidden from outlet-scoped users. This is local evidence only; Production data and role regression remain separate.

### v8.64.116 (unreleased) — Outlet Daily export UAT

Authenticated local Purchasing UAT now downloads the detailed Outlet Daily CSV and verifies the dated filename, line-level product fields, Qty Sent provenance, wastage amount column, and explicit unavailable cost state. The companion company-wide Qty Sent correction workflow also passes when rerun. This is local evidence only; remote and Production verification remain separate.

### v8.64.115 (unreleased) — Detailed Outlet Daily export

Outlet Daily exports now preserve line-level product detail, Qty Sent provenance, received/leftover/wastage quantities, wastage reasons, and dated filenames. Wastage amount is shown only when the authorised company-wide view has an active recipe cost snapshot; missing cost authority remains explicitly unavailable. The local fixture now carries a truthful 1:1 GRN conversion snapshot so Purchase Return posting can be tested from the immutable receiving record. This remains local evidence only; linked and Production verification are separate.

### v8.64.114 (unreleased) — Local workflow closure

The local six-role audit now covers the no-route PR→PO→GRN→Invoice→Payment→PO-close path, AP Aging visibility before payment, supplier/item/branch UX surfaces, Outlet Daily missing Qty Sent semantics, and the authenticated responsive checks available in the local suite. This is local evidence only; remote and Production verification remain separate.

### v8.64.113 (unreleased) — Progressive PR sourcing

Purchase Requests keep Supplier as a required suggestion while allowing Item Master search before a supplier-item or branch route exists. Missing routes are provisional review work for Purchasing rather than a form-level or review-stage blocker; the supplier chooser includes active suppliers even before a branch route exists, while controlled UOM, quantity, and active-item validation remain enforced. Local authenticated QA with a deliberately unmapped supplier completed PR creation, three approval gates, PO conversion/send, GRN posting, Finance invoice approval, payment, and PO close. The disposable fixture now cleans its stock ledger lines as well as its documents.

### v8.64.112 (unreleased) — Purchase Order transition repair

Purchase Order submit now writes the valid `pending_approval` document status, so the downstream PO workflow can move through submit, approve, and send without an enum error. Migration 187 is local-applied and rollback-tested; linked/Production verification remains separate.

### v8.64.111 (unreleased) — Receiving posting lock repair

Goods Receiving can now advance the received quantity on an approved or sent Purchase Order through its controlled posting transaction. Ordinary PO line edits remain locked; the posting RPC uses a transaction-local guard, then records the immutable Purchase/Base UOM snapshot and optional learned supplier conversion.

### v8.64.110 (unreleased) — Progressive receiving UOM learning

Goods Receiving now accepts the supplier's actual Purchase UOM first, calculates Base UOM when a conversion is known, and lets the operator confirm both quantities when it is not. A confirmed conversion can be remembered for future deliveries without making master-data setup a prerequisite. Local Supabase migration 185 and the PR-to-PO repair migration 186 are applied and transaction-tested locally; linked/Production verification remains separate.

### v8.64.109 (unreleased) — PR to PO conversion repair

Purchase Request conversion now recreates its database RPC explicitly, writes the required purchase-order idempotency key, keeps one active PO per PR, and records conversion source metadata. AutoCount PO number failures now identify the exact business issue, focus the field, and preserve the typed number after a failed attempt. Repository migrations reviewed through `193`; this is local source evidence only, and linked/Production verification remains separate.

### v8.64.108 (unreleased) — Portrait Tablet Form Alignment

Purchase Order creation now aligns its form and action rail from the same top edge by using rendered-box grid gaps instead of sibling margins around hidden submission metadata. Production Jobs uses a deliberate two-row filter composition on portrait tablets: query and command first, then status, branch, and more filters at readable widths. This is local implementation evidence only; linked and Production verification remain separate gates.

### v8.64.107 (unreleased) — Workflow Stage Scanning and Keyboard-Safe Navigation

Workflow badges now use stable, restrained stage tones for Manager, Purchasing, Finance, Ready to Convert, rejection, and goods-receiving wait states while retaining explicit text labels as the source of meaning. On phone and touch-tablet shells, the shared bottom navigation measures the software-keyboard inset and remains anchored to the physical screen bottom behind the operating-system keyboard instead of jumping into the reduced editing viewport.

### v8.64.106 (unreleased) — Final Local Annotation Surface Closure

Supplier master data now exposes an explicitly labelled, editable operator short name without changing the AutoCount creditor code or official Supplier Name. Authenticated responsive acceptance also closes the remaining local-only evidence for Item action hierarchy, neutral Inventory movement colors, and Procurement counters. These are local implementation and UAT results only; linked migrations, real Production supplier data, Production footer, and Production workflows remain separate gates.

### v8.64.105 (unreleased) — Natural PR Register Order

Purchase Requests now use a generated natural document-number key at the database boundary before pagination, so `.../1, .../2, .../10` are reversible and predictable instead of lexicographic. The default remains latest number first and explicit column direction remains respected with a same-direction stable ID tie-breaker. Migration 184 is applied only to the isolated local database; linked and Production verification remain open.

### v8.64.104 (unreleased) — Sourcing Boundary Interaction Closure

Typed PR item codes now obey the same branch-and-supplier catalogue boundary as visible suggestions, with source, Purchase UOM, and Base UOM metadata. Item Master search is fully keyboard operable, rejected PRs show actor/time/next step, and zero-denominator Outlet days remain visible for correction without being misreported as a 0% trend. Local browser evidence is awaiting the complete release gate; linked and Production states remain separate.

### v8.64.103 (unreleased) — Annotation UAT Fixture Closure

The localhost-only authenticated fixture now supplies a guided PR review line, document comment, active Outlet product, and completed Outlet Daily trend record. Previously skipped PR dialog, portrait comment rail, wastage reset, trend chart, and Manager-versus-Purchasing authorization checks now execute against explicit disposable data. This strengthens local UAT evidence without changing linked migrations or claiming Production deployment; the observed Production login footer remains `v8.64.99`.

### v8.64.102 (unreleased) — Annotation Closure Round

The shared list command slot, document identity, semantic colors, procurement summaries, supplier identity, natural Item Code order, and role-gated Outlet Daily sent-state are converged around one operational convention. PR/PO and Stock Balance remove duplicate controls and explanatory noise; supplier-item mapping keeps Base UOM owned by Item Master. Local source is implemented, while authenticated viewport, linked migration, Production data, and Production footer verification remain separate gates.

### v8.64.101 (unreleased) — Visible PR Rejection Reason

Rejected purchase requests now surface the latest recorded rejection reason in the main workspace, with the rejecting actor and timestamp. The audit timeline remains the authoritative history; this prominent copy gives Kitchen and the requester an immediate correction path.

### v8.64.100 (unreleased) — Canonical UOM Selection

UOM values are canonicalized at the application boundary: `BTL` resolves to `BOTTLE`, and controlled choices include the operational `GUNI` unit. Guided PR-line repair uses a dropdown sourced from current item and supplier terms plus the shared UOM catalogue; free-text UOM entry is removed and options are alphabetically ordered.

### v8.64.99 (unreleased) — Unified Page Loading

All route-level loading boundaries use the shared PageLoadingState: one compact progress line, one spinner, and one status label. Route-specific copy remains contextual, while oversized skeleton bands and centered spinners are removed from the initial load state.

### v8.64.98 (unreleased) — Supplier UOM Receiving Conversion

Purchase requests and purchase orders retain the supplier's purchasing UOM (for example CTN, BAG, or TUB), while Goods Receiving accepts the configured Item Master base UOM (for example KG). The entered base quantity is converted back to the supplier UOM for document traceability, and the existing atomic posting path converts it into base-unit inventory using the approved supplier-item conversion. Missing conversions remain explicit blockers; the system never guesses packaging factors.

### v8.64.97 (unreleased) — Supplier Identity Relationship Consolidation

Duplicate supplier identities are consolidated at the data boundary: active supplier-item, branch, item, purchasing, and request references are repointed to one canonical active identity before duplicate rows are recoverably archived. Supplier Items search also accepts the operator-facing Item Group and internal AutoCount code.

### v8.64.96 (unreleased) — Active Supplier Identity View

Supplier registers default to active identities after recoverable duplicate merges. Inactive historical rows remain available through an explicit All statuses view, so operators see one usable supplier identity without losing audit history.

### v8.64.95 (unreleased) — Structured Brand Migration Compatibility Repair

The structured brand migration patches the Items workspace RPC by SQL shape rather than line-ending-specific source text, so linked projects with equivalent function definitions can apply the brand field safely. Remote migration and Production UAT remain separate gates.

### v8.64.94 (unreleased) — Supplier Merge Mapping Guard Repair

Duplicate supplier consolidation now respects the purchase-request branch/item/UOM mapping guard. Valid canonical mappings are repointed; unresolved lines are cleared with a recoverable line audit and an explicit repair remark instead of aborting the whole migration. Linked migration and Production data verification remain separate gates.

### v8.64.93 (unreleased) — Supplier Identity And Filter Apply Repair

Supplier-item identity reconciliation keeps the canonical AutoCount creditor code internal, exposes the operator-facing Item Group, and recoverably merges the legacy BWY placeholder and duplicate Quik supplier-item row. Shared list filters now keep Search as the primary command, expose a same-height Reset action, and allow a new filter selection to be submitted without first resetting. Local migration and contract evidence is complete; linked migration and Production UAT remain separate gates.

### v8.64.92 (unreleased) — Annotation Rerun Evidence Refresh

The full local authenticated current/historical/reopened annotation browser suite reran after the bounded inventory read repair: 18 of 18 scenarios passed. This is local evidence and does not change the linked Production deployment boundary.

### v8.64.91 (unreleased) — Bounded Inventory Read RLS Repair

The bounded Stock Card / Movement Ledger RPC keeps explicit branch authorization while avoiding duplicate per-row RLS evaluation under authenticated reads. This repairs the timeout path observed during the local Purchasing return workflow; linked Production evidence remains separate.

### v8.64.90 (unreleased) — Workflow Mutation Gate Repair

The disposable authenticated mutation gate now opens the rejection dialog before entering its required reason and asserts return/count movements by their exact target row. This repairs evidence collection only; it does not claim linked Production workflow verification.

### v8.64.89 (unreleased) — Supplier UOM Return Alias Repair

Forward migration 178 repairs the supplier-UOM purchase-return RPC where a PL/pgSQL `po_line` variable collided with a SQL JOIN alias. The patch is idempotent and changes no business arithmetic; it only makes the existing conversion lookup executable.

### v8.64.88 (unreleased) — AutoCount Mapping Identity Guard

AutoCount branch mappings now carry the per-item Main Supplier creditor code internally and retain Item Group only as the operator-facing display group. Items without an authoritative Main Supplier are blocked rather than inferred from a sibling row or group label.

### v8.64.87 (unreleased) — Bounded Stock Balance Image Hydration

Stock Balance now hydrates item images in bounded batches of 100 IDs, avoiding URI-too-long failures when a real page contains many distinct items. The image read remains optional and fail-closed; no balance value is synthesized from an image-read failure.

### v8.64.86 (unreleased) — Role Workflow Evidence Closure

The disposable local browser gate now covers the six scoped identities (Super Admin, Finance, Manager, Purchasing, Kitchen, and Outlet). Eight non-destructive workspace/filter scenarios passed; mutation scenarios remain explicitly skipped unless a named disposable fixture and mutation flag are supplied. This is local evidence only and does not prove Production role UAT.

## Product Overview

### v8.64.77 (unreleased) — Migration 176 Local SQL Validation

The local disposable Supabase database now executes migration 176 successfully. Rollback-only RPC fixtures confirm explicit Brand values survive Item creation and AutoCount Confirm; this remains local evidence and does not prove linked Production application.

### v8.64.78 (unreleased) — Supplier UOM Runtime Contract

The local posting path now has a rollback-only PO → GRN proof that supplier purchase UOM is converted to the item base unit and unit cost is divided by the same factor (2 CTN × 12 = 24 KG; RM120 ÷ 12 = RM10). Linked migration application and authenticated Production workflow UAT remain separate release gates.

### v8.64.79 (unreleased) — Authenticated Fixture Password Parsing

Local authenticated browser fixtures now preserve literal hash characters in test credentials, preventing false login failures during disposable UI/UAT runs. This changes test reliability only and does not claim Production authentication evidence.

### v8.64.80 (unreleased) — Production Deployment Audit

The observed Production login page still serves footer `v8.64.68`, while `codex/uiux-round2` is pushed through `v8.64.79`. Deployment and post-deploy authenticated regression remain blocked by the unavailable deployment project access.

### v8.64.81 (unreleased) — Supplier Mapping Data Audit

The local mirror audit found 38 active items without supplier-item identity and 233 active supplier-item records without a Central Kitchen branch mapping. Because the source does not prove the intended supplier/branch for those rows, the system keeps them as explicit data blockers rather than fabricating mappings.

### v8.64.82 (unreleased) — Central Kitchen Tally Evidence

The local mirror has no 19 Aug Stock Count for CK-ALMA or CK-PJS10; its latest posted counts are 17 Aug and 6 Aug respectively. The supplied PDFs cannot be declared tally-matched without the linked Production records.

### v8.64.83 (unreleased) — Historical Annotation Scope Reconciliation

All prior annotation groups remain in the single repair ledger: the 17-comment group, 34-comment group, 13-comment group, and reopened defects. Local contract/authenticated evidence is recorded separately from linked migration, Production data, and Production UAT; no historical item is treated as complete merely because a screenshot or local build passed.

### v8.64.84 (unreleased) — Supplier Mapping Fail-Closed Validation

AutoCount Preview now blocks Item Groups with no authoritative Main Supplier creditor code, reports each affected item/file/row, and tells the operator to repair the source export. Item Group remains a display label; it is never silently promoted into an internal supplier identity.

### v8.64.85 (unreleased) — AutoCount Confirm Identity Guard

The atomic Confirm RPC now rejects staged supplier groups that contain no authoritative AutoCount creditor reference, protecting direct or older ready jobs from bypassing the Preview validation.

### v8.64.76 (unreleased) — Cross-Viewport Control Rhythm

The shared control authority now keeps tablet and desktop filters, textboxes, selects, and right-rail actions at a 36px visual height. Phone controls retain the touch-safe height, and the ledger distinguishes visual geometry from authenticated viewport acceptance.

### v8.64.75 (unreleased) — Structured Brand Visibility

- Item brand is optional and source-backed. Migration 176 adds `brand_name` and carries it through Item Master, the workspace picker, and AutoCount Confirm.
- Existing rows stay blank until an authoritative Brand column or authorized edit supplies a value; linked Production application and authenticated UAT remain separate gates.

### v8.64.74 (unreleased) — Stock Take Evidence Reconciliation

- Central Kitchen stock-take evidence distinguishes local seed-code coverage from linked Production tally verification; missing local mirror codes are reported without changing master data.
- Product descriptions retain source brand tokens until an authoritative structured brand mapping is available.

### v8.64.73 (unreleased) — Supplier UOM Base Posting Closure

- Purchase documents retain supplier UOM; GRN and purchase-return inventory movements post converted base-unit quantity and base-unit cost, with missing conversions rejected explicitly.

### v8.64.72 (unreleased) — PR Index And Exception Semantic Closure

- Purchase Request Requested Items shows a stable row index and total count across desktop and compact layouts.
- Supplier/UOM and non-catalog issues use danger semantics consistently; retryable stock-unavailable reads remain warning states.

### v8.64.71 (unreleased) — Supplier Display Identity And Shared Filter Closure

- Supplier master data separates the internal AutoCount creditor code from the Item Group shown to operators; duplicate-name merges remain soft-retirable and auditable.
- Purchase Request review reports the number of requested items and gives supplier/UOM mapping errors a direct explanation and repair action.
- Shared list surfaces keep desktop controls at 36px while preserving the tablet touch-first decision until the explicit 36px-versus-44px recommendation is accepted.

Repository migration authority: migrations reviewed through `227`; Production migration 227 and the authenticated completion of the four-file AutoCount import are recorded in the current closure section and repair ledger. Application deployment and public runtime version remain separate gates.

### v8.64.70 (unreleased) — Supplier Identity And PR Review Repair

- Exact duplicate live supplier names are consolidated through recoverable migration 173: commercial references move to one canonical supplier, overlapping supplier-item/branch mappings are retired rather than hard-deleted, and every merge stores both pre-merge records in an audit table.
- PR guided review accepts Supabase timestamps with explicit timezone offsets, keeps Quantity/UOM compact in the register, and uses a bounded 60rem desktop dialog.
- Dashboard low-stock exceptions use the critical red semantic token instead of an unrelated yellow warning treatment.

### v8.64.69 (unreleased) — AutoCount Identity Recovery

- A ready AutoCount job may restore an exact soft-deleted item identity when its code, name, and UOM match and an active supplier mapping still references that item.
- Ambiguous identities and non-exact matches remain blocked; the recovery never creates a second item ID or inventory movement.
- Production Confirm failures retain their exact PostgreSQL evidence in the repair ledger rather than being treated as successful staging.

### v8.64.68 (unreleased) — Remote Annotation UAT Recovery

- Playwright environment parsing preserves `#` inside unquoted credentials while still accepting whitespace-delimited inline comments.
- Linked Supabase migration evidence is collected with a compatible CLI and remains separate from authenticated workflow evidence.
- Migration 171 is applied only after a linked-project check and dry-run prove it is the sole pending migration.

### v8.64.67 (unreleased) — Historical Annotation Closure

- Historical annotation groups are reconciled against the single repair ledger instead of being treated as screenshot-only completion claims.
- Stock Balance groups Available/Reserved and Average Cost/Value into compact decision fields; Stock Count keeps SC number and submitter together.
- Outlet Daily clears obsolete wastage reason and remarks when wastage returns to zero, and Supplier lifecycle actions are hidden when update permission is absent.
- Local implementation and test evidence remains distinct from linked-migration and Production verification.

### v8.64.66 (unreleased) — Annotation Workflow Closure

- Workspace notification counts return to the red unread badge; workflow-state colors remain owned by Manager, Purchasing, and Finance status presentation.
- AutoCount actions, errors, and status share the right rail at portrait tablet and wider layouts, while the import directory and guided PR repair use the canonical panel/dialog geometry.
- Desktop and tablet controls use the 36px visual-density token; phone retains its touch-first control contract. PR and PO setup sections use one stable header language without an unexplained disclosure affordance.
- Source and local test evidence is not production verification. Authenticated four-viewport, role workflow, linked migration, AutoCount confirmation, and production regression gates remain separately recorded in the annotation ledger.
- AutoCount Confirm now creates a missing supplier-item relationship before branch mapping and validates the branch only in the branch-mapping phase (migration 171); the authenticated disposable local mirror passed actionable validation, Preview, and one atomic Confirm with zero inventory movements.

The current released application baseline is `v8.64.55` — Bounded Reads And Explicit Receipt Provenance.

### v8.64.65 (unreleased) — Shared Responsive Closure

- Shared list query geometry now derives tablet tracks from the actual secondary filters and command group, preventing blank tracks and inconsistent search/filter widths across list pages.
- Split workspaces keep the action/context rail visible on portrait tablets when the route declares the medium tablet rail contract; Production Jobs now uses the same shared filter contract as the other registers.
- Shared data tables expose a stable UI marker and use a 10px compact header token so sortable and native table headers follow one density rule.
- Local typecheck, strict typecheck, lint, contract tests, and build evidence are required before promotion; this section is not production-release evidence.

### v8.64.61 (unreleased) — UI Annotation Closure

- The authenticated route matrix now covers the core operational workspaces at 390px phone, 820px portrait tablet, 1180px landscape tablet, and 1440px desktop without page overflow, clipped controls, vertical text collapse, or filter-action drift.
- Recipe and purchase-order line entry share the same top-and-bottom add-row affordance, while workflow dashboards use semantic status badges instead of repeated plain-text state labels.
- Browser verification distinguishes the sandbox-blocked company-logo CDN from application runtime failures; the shell keeps its local brand fallback.

### v8.64.60 (unreleased) — Responsive Workspace And Form Closure

- Outlet wastage trends now use the available canvas at tablet widths and retain a legible chart height before splitting into the desktop chart/table composition.
- Portrait tablet master-data workspaces keep their action and summary rail visible; branch selection remains a leading control instead of a detached trailing checkbox.
- Purchase-order setup is one collapsible surface with all order context visible, and long line-entry workflows provide the same add-line action at the bottom.
- The application top bar remains sticky across tablet and desktop workspaces, and Daily Record actions present one role-appropriate completion action plus Save Draft.

### v8.64.59 (unreleased) — PR Register Interaction Closure

- Purchase Request selection, action, and request identity are separate semantic columns inside one seamless pinned lead band, keeping checkboxes and edit links operable while aligning the Request heading with its document number.
- Request, Schedule, and Status use the existing server-backed sorting contract, and shared select filters always render their selected/default label after hydration.

### v8.64.58 (unreleased) — Compact Operational Table Geometry

- Shared technical tables use a compact, accessible icon-only Action column and matching sticky offsets, removing the empty gutter between actions and business identity.
- Outlet Daily Records uses content-proportional widths for date, outlet, status, quantities, submitter, and update time instead of a 74rem fixed canvas.
- This remains local implementation evidence until authenticated viewport review and deployment are completed.

### v8.64.56 (unreleased) — P0 Workflow, Supplier Resolution, And Release Evidence

- Purchase Request Manager, Purchasing, and Finance transitions now require the exact owning workflow role in the server action and are backed by migration 157; `super_admin` remains the documented break-glass role.
- The annotated P0 responsive issues are closed in the shared layout authority: duplicate Dashboard rails are removed, tablet filters retain the two-row grammar, wide production lists expand, document forms use one workflow surface, and high-density outlet/AP/wastage panels are compact without losing the accessible data alternative.
- Common procurement UOM choices are available at request-line entry while supplier/item conversion remains a receiving/master-data responsibility.
- Local release evidence for this forward contract: 751/751 contract tests, lint, production build, 7/7 six-role Dashboard viewport tests, and 5/5 focused P0 browser tests. This section is not production-release evidence until migration 157 and the application are separately promoted and reverified.
- Purchase Request detail resolves supplier presentation from the historical line snapshot first, then item-master and branch supplier mappings, so legacy lines no longer appear falsely unassigned while preserving the original audit record.
- Purchase Request to Purchase Order conversion now generates the required purchase-order idempotency key and keeps supplier-split ordering aligned with the supplier master schema (migrations 164–165).
- Legacy PR lines are resolved only when branch + item + UOM identify one supplier (or one preferred mapping); ambiguous lines remain explicitly blocked for Purchasing review (migration 166).

### v8.64.55 — Bounded Reads And Explicit Receipt Provenance

- Stock Card and Movement Ledger opening balances use the bounded daily inventory summary instead of an unbounded historical transaction scan. Both the RPC and base-table fallback fail closed when the bounded read cannot be proven complete.
- Outlet Daily stores receipt provenance explicitly, preserving a deliberate operator-entered `0` while keeping legacy or missing receipt data visibly unavailable.
- Shared list controls keep one responsive geometry authority across desktop and touch-tablet layouts.

### v8.64.54 — Fail-Closed Reads And Shared UI Closure

- All primary report and operational read paths now distinguish verified empty data from missing or incomplete payloads; unverified reads show an explicit unavailable/retry state and never a trusted `0`.
- Shared list filters use one responsive geometry authority across desktop and touch-tablet layouts, preventing recurring three-row, mismatched-width, and overlay conflicts.
- Demand Trend keeps daily data visible beside the chart and marks no-line/incomplete coverage unavailable rather than presenting false metrics.

### v8.64.53 — Dashboard Trust And Report Preview Closure

- Dashboard metrics keep unavailable secondary reads unavailable instead of presenting a false zero.
- Demand Trend keeps its daily data visible beside the chart, while the shared line chart uses a calmer visual weight.

### v8.64.52 — Centralized Fail-closed Query Boundaries

- Primary operational reads now share one row/count boundary policy: a valid empty array remains empty, while a missing Supabase payload is unavailable and retryable.
- Outlet Daily, production, recipe, stock-operation, product, and purchase-return reads no longer silently turn missing payloads into empty data.

### v8.64.51 — Fail-closed Operational Reads

- Procurement and goods-receiving list/detail/summary reads now reject missing or incomplete payloads instead of converting them into empty rows or verified zero totals.
- Supplier, item, branch, and shared mapping option reads now fail closed when Supabase returns no payload, preserving an explicit retry/unavailable state.
- Inventory stock-balance base reads now reject null payloads so downstream screens cannot render a false empty balance.
- Added contract coverage for the operational read boundaries and kept the established empty-state behavior for valid empty datasets.

### v8.64.50 — Fail-closed Dashboard Fallbacks

- Dashboard fallback counts now distinguish a valid zero from a missing head-count or row payload. Incomplete reads preserve an explicit unavailable domain state instead of producing a trusted zero or empty queue.
- The bounded low-stock attention read no longer treats a null payload as zero; it falls back only to a verified core snapshot.

### v8.64.49 — Fail-closed Stock Count Reads

- Stock Count list, summary, detail, seed-line, and variance reads now distinguish a valid empty result from an incomplete payload. Missing payloads fail closed instead of becoming zero counts, empty lines, or a verified empty insight.
- The previous inventory/outlet fail-closed boundaries remain in force; this release closes the same trust boundary for Stock Count workflows.

### v8.64.48 — Fail-closed Inventory And Outlet Reads

- Inventory RPCs and bounded fallbacks now distinguish a valid empty result from a missing payload. Null reads fail closed instead of becoming verified zero totals, empty lists, or misleading record counts.
- Outlet Daily Records applies the same boundary to list, summary, trend, completion-matrix, and detail hydration reads.
- Tablet list query geometry is restored to the established shared control grid; no route-specific three-row override is retained.

### v8.64.47 — Fail-closed Unverified Receipt Inputs

- Outlet daily detail forms no longer render a persisted database-default receipt `0` when receipt provenance is unverified. The field stays blank with a `Not verified` placeholder until an authorised user confirms a value, including an intentional zero.

### v8.64.46 — Hide Mobile Chrome on Editable Focus

- Mobile navigation and fixed action chrome now hide as soon as an editable control receives focus, covering browser modes where the on-screen keyboard overlays without resizing `visualViewport`.

### v8.64.45 — Standardize Quantity Stepper Density

- Quantity steppers now expose one semantic density contract (`touch`, `compact`, or `dense`) from the shared component. Low Stock and Stock Balance no longer override descendant button/input geometry at individual call sites.

### v8.64.44 — Centralize Tablet Rail Geometry

- WorkspaceGrid now exposes semantic tablet rail attributes; responsive rail geometry is owned by the canonical design-system CSS instead of competing runtime utility classes.
- Compact and half-width tablet rails are explicit contracts, so the same breakpoint behaves consistently across document routes.

### v8.64.43 — Close Query Card Style Authority

- Canonical query cards now have one geometry owner; legacy v2 filter compatibility rules explicitly exclude them.
- Added a CSS authority contract so broad filter rules cannot silently reintroduce duplicate sizing, radius, or spacing.

### v8.64.42 — Converge Report Interaction Scaling

- Shared ranking previews keep their interaction boundary at the chart surface, so moving from a row into its drill-through action does not clear the selected preview.
- Shared line charts use non-scaling SVG strokes, keeping gridlines, series, and selected points visually consistent across desktop, tablet, and phone widths.

### v8.64.41 — Stabilize Touch Tablet First Paint

- iPadOS Safari and Chrome mark the touch-tablet shell before first paint,
  preserving the established desktop geometry while preventing a stale desktop
  shell from surviving hydration.

### v8.64.40 — Lock Two-Row Tablet Query Layout

- Tablet list query cards use one stable two-row layout across Items, Purchase Requests, Stock Balance, Suppliers, and other shared-list routes.
- Search and sibling filters share equal tracks; the record count stays on the same second row instead of creating an accidental third row.

### v8.64.39 — Converge Tablet Query Tracks

- Shared list query cards derive their tablet track count from the controls
  they actually render, so filters and Search fill the row without overlap or
  a phantom empty column.
- The change is scoped to query-card layout and does not alter workspace canvas
  width or tablet shell selection.

### v8.64.38 — Restore Established Workspace Geometry

- Desktop workspaces retain their established list/document width intent; a
  shared wrapper does not globally shrink unrelated routes.
- iPad shell selection returns to the existing runtime authority instead of a
  competing coarse-pointer CSS override that also rewrites overflow and
  navigation behavior.

### v8.64.37 — Canonical List Action Order

- Shared list query surfaces place the primary Search or Reset action before
  the result count, matching the established Stock Balance interaction pattern.
- The ordering is owned once by `UnifiedListHeader` and covered by both source
  contracts and authenticated four-viewport browser verification.

### v8.64.36 — Unified Console Actions

- Items, Products, and Suppliers declare desktop rail actions and the mobile
  create affordance through one permission-aware shared action component.
- Primary action metadata is stable before and after component resolution, so
  the phone FAB does not disappear when page markup is consolidated.

### v8.64.35 — Compact Report Ranking Previews

- Shared report ranking previews keep the selected value and drill-through
  action beside the supporting detail instead of growing a third mobile row.
- The fixed preview slot, complete label, 44px touch action, and keyboard
  interaction remain identical across every report that uses the ranking.

### v8.64.34 — Stable Report Ranking Previews

- Report ranking previews use one persistent master-detail region instead of
  inserting detail beneath the active row and moving the remaining ranking.
- Hover, touch, and keyboard selection update the same reserved preview surface,
  preserving row positions and accessible drill-through actions.
- The idle instruction occupies the same preview geometry as selected content,
  preventing report layout shift while users compare ranked records.

### v8.64.32 — Reachable Inventory Chart Actions

- Inventory Daily Movement now uses the shared preview-selection authority instead of maintaining a separate touch/focus state machine.
- Keyboard focus can move from the movement chart into `Open inbound` and `Open outbound` without unmounting the selected-date preview.
- The idle preview remains visibly instructional on phone instead of relying on a hidden placeholder contract.

### v8.64.31 — Shared Preview Selection Authority

- Ranking, AP Aging, and Production Variance previews now share one interaction authority for hover, committed touch/click/focus selection, Escape, and boundary blur behavior.
- Preview drill-through actions remain mounted while pointer or keyboard focus moves from a chart option into its preview region.
- Contract coverage prevents report components from reintroducing independent event-handler variants.

### v8.64.30 — Keyboard-Safe Aging Preview

- AP Aging keeps the selected bucket preview mounted while keyboard focus moves from a bucket into its `Open filtered invoices` action.
- Focus leaving the complete distribution workspace dismisses transient keyboard previews; pointer, touch, click, and Escape behavior remain unchanged.
- The interaction boundary is owned once by the preview workspace instead of competing button-level blur rules.

### v8.64.29 — Inline Report Ranking Previews

- Shared ranking charts reveal exact values directly beneath the selected row. Hover, touch, and keyboard users no longer have to look at the bottom of a six-row ranking for the associated detail.
- An idle ranking keeps a short discovery prompt but reserves no empty preview panel, reducing repeated vertical waste on phone report pages.
- Report directory category and icon surfaces use the canonical panel and control radius tokens; page-specific 2px corner exceptions are not allowed.
- Application version authority remains synchronized across `package.json`, the root `package-lock.json` entry, and `src/lib/app-version.ts`.

### Current audit baseline

The current released application baseline is `v8.64.47 — Fail-closed Unverified Receipt Inputs`.

Item Master lookup now has one authoritative token-matching combobox shared by
Kitchen PR entry and Purchasing Review. Users may search using partial words
they remember; Purchasing does not have to scan a long native select to match a
preserved non-catalog line.

Purchase Request lines now preserve business intent before catalogue and
supplier resolution. A line with description, quantity, and UOM is saved
atomically even when Item Master has no match. Purchasing matches non-catalog
lines during Purchasing Review; supplier completeness becomes a review gate,
not a destructive entry gate. Original input remains auditable after matching.

Supplier purchasing setup has two explicit layers: the supplier catalogue item
and the branches allowed to buy it. An authorised user can create both from one
form, launched contextually from either the Item or Supplier record. Spreadsheet
import remains a bulk-maintenance option, never the only operational path.

Purchase Request entry must never interpret incomplete catalogue resolution as
permission to discard a line. Item lookup uses token matching across item code
and name; a started line missing description, positive quantity, or UOM rejects
the whole save with its line number instead of partially creating a misleading
document. Catalogue and supplier matches may follow without erasing intent.

The canonical design layer permits one owner for a selector inside each media
scope. A source-level AST contract rejects repeated same-scope selectors before
they can reintroduce order-dependent list, filter, action, or radius behavior.

Stock Count uses one responsive line-entry authority. Phone cards foreground
the index, full item identity, variance, UOM, and count control without a
repeated starting-balance sentence. Wider list headers remain in normal flow;
they never rely on a guessed shell offset that can cover the first item.

The seven-day outlet completion matrix fills its containing canvas, preserves a
fully opaque frozen outlet column during horizontal scroll, and adds no empty
preview row until an operator hovers, focuses, or taps a specific outlet-day.

Purchase request lines keep the stacked touch layout through tablet portrait
and landscape widths; the dense single-row editor begins only at laptop width.
Laptop quantity controls receive a stable 10rem track so four-digit values do
not collapse behind the stepper buttons, while item and UOM tracks stay bounded.

Workspace pages preserve the established document/list width intents rather
than accepting a global desktop maximum width. Tablet shell selection remains
owned by the existing runtime marker; no coarse-pointer CSS fallback may also
rewrite navigation and overflow behavior.

Historical release context: `v8.64.6 — Reliable Outlet Daily Reads`; earlier context: `v8.64.5 — Verified Receiving Provenance`, `v8.64.4 — Stable Report Preview Surfaces`, and `v8.63.0 — Fail-Closed Goods Receiving Joins`.

The lines below are retained as historical release context; the current authority is the v8.64.39 release declaration above.
The repository migration history currently runs through migration `166`. Release
version authority lives in `src/lib/app-version.ts`; migration authority lives in
the immutable, forward-only `supabase/migrations/` directory. Documentation must
not claim a later release or database ceiling unless both authorities support it.
Deep operational green is the ordinary primary action color;
mobile controls keep a minimum 48px touch target. User-visible dates use
`dd/mm/yyyy`, while native date inputs continue to submit ISO date-only values.
Read failures must remain visibly unavailable rather than being presented as a
misleading zero or empty-success state. Save and confirm/post actions remain
separate, and retrying a committed inventory action must not create a second
movement.

Seri Bako Operations Management System (OMS) is an internal operations platform for managing Seri Bako's daily procurement, inventory, goods receiving, production, approval, staff access, and operational records.

The system is designed to replace fragmented workflows across spreadsheets, paper forms, WhatsApp messages, and disconnected records with a single operational source of truth.

Seri Bako OMS is not intended to be a full accounting ERP or a public-facing SaaS platform. Its primary purpose is to help internal teams complete routine operational work quickly, clearly, and consistently.

## Product Goals

Seri Bako OMS should:

- Reduce repeated manual data entry.
- Reduce dependency on spreadsheets, paper records, and WhatsApp follow-ups.
- Make document ownership, status, and next actions visible.
- Improve inventory accuracy across branches, outlets, stores, and production operations.
- Standardize procurement, receiving, stock, and production workflows.
- Provide clear audit history for operational records.
- Keep frontline and administrative workflows simple and fast.
- Support role-based and permission-based access without adding unnecessary complexity.
- Prioritize a complete working operational flow before secondary polish or edge-case handling.

## Product Principles

### 1. Operational clarity over feature volume

Every page must help the user understand:

- What record or task they are viewing.
- What status it is currently in.
- What action is required next.
- Who is responsible.
- What supporting records, comments, and attachments exist.

Features that do not improve daily operational clarity should not be prioritized over core workflows.

### 2. Fewer steps

Common tasks should require as few screens, clicks, and repeated inputs as reasonably possible.

The system should avoid:

- Re-entering information already available from an upstream record.
- Repeated navigation between related documents.
- Unnecessary confirmation steps.
- Duplicate loading of the same operational information.
- Splitting one simple task across too many pages.

### 3. Ledger-based operational records

Stock, workflow, and document history should be traceable.

Important balances and statuses must be derived from controlled records rather than edited directly without history.

### 4. Reusable system patterns

Pages and workflows must reuse the established app shell, page skeletons, interaction patterns, and shared components defined in `DESIGN.md`.

New modules should not invent unrelated layouts, button systems, status styles, or workflow patterns.

### 5. MVP-first delivery

Core end-to-end workflows take priority over:

- Deep edge-case handling.
- Exhaustive diagnostics.
- Decorative UI polish.
- Advanced automation.
- Non-critical error messaging.
- Premature architectural complexity.

Known non-critical limitations should be documented briefly and deferred to focused cleanup sprints.

## Fixed System Roles

Seri Bako OMS has exactly six system-controlled roles. They are reviewed in the owner-only Roles & Permissions overview and cannot be created, renamed, or edited through normal UI.

- **Super Admin / Owner (`super_admin`)**: protected owner controls, company setup, staff assignments, system numbering, backups, and full operational authority.
- **Finance (`finance`)**: company-wide finance review plus staff, numbering, imports, and branch administration; protected Owner and backup controls remain unavailable.
- **Manager (`manager`)**: company-wide operational visibility and Manager Review across all Outlets and Central Kitchens, plus branch maintenance. Branch assignment supplies default context and autofill only.
- **Purchasing (`purchasing`)**: company-wide purchasing, supplier, item/master-data, import, PO, and sourcing-review duties.
- **Kitchen (`kitchen`)**: assigned Central Kitchen workflows, including purchase-request creation/submission and production operations.
- **Outlet Staff (`outlet_staff`)**: assigned-outlet daily records only.

Role determines allowed actions. The default Branch / Outlet controls initial context and autofill but is not an authorization boundary. Super Admin, Finance, Manager, and Purchasing have company-wide operational visibility. Kitchen and Outlet Staff remain strictly limited to assigned branches.

## Current Product Scope

The system currently covers or is actively implementing the following operational areas.

### Core Platform

- Supabase authentication.
- Login, password setup, password reset, and first-password change flows.
- User profiles.
- Staff onboarding through invitation or temporary-password setup.
- Roles and permissions.
- Permission-aware navigation and actions.
- Database row-level security.
- Shared application shell.
- Shared document and record workspace patterns.
- Comments, attachments, timeline, and activity history where implemented.

### Master Data

- Supplier Master.
- Item Master.
- Company Profile.
- User and staff records.
- Roles and permissions.

### Procurement

- Purchase Requests.
- Purchase Orders.
- Supplier-linked purchasing records.
- Approval and workflow actions where implemented.

### Inventory

- Stock Transactions.
- Movement Ledger.
- Stock Balance.
- Low Stock monitoring.
- Stock Count.
- Stock Adjustment and reconciliation flows where implemented.
- Inventory exports where permitted.
- Goods Receiving.
- Inventory movement generated by upstream operational documents where implemented.

### Production

- Production Jobs.
- Production input and output records.
- Production-related inventory movement where implemented.

### Operational Visibility

- Dashboard.
- Module summaries.
- Operational status indicators.
- Workflow history.
- Record timelines.
- Comments and attachments.
- Permission-controlled exports.

## Module Maturity

Module maturity must be understood separately from visual completion.

Repository migrations reviewed through `173`; release authority is
`v8.64.55 — Bounded Reads And Explicit Receipt Provenance`.

Current integration baseline: `v8.64.55 — Bounded Reads And Explicit Receipt Provenance`, with repository migrations reviewed through `169`. The local P0 patch is the unreleased `v8.64.56` forward contract and must not be treated as Production application evidence. Migrations `111` and `112` remain immutable history because they were applied to the linked database accidentally. Migration `113` removes their callable Central Kitchen PR RPC, prevents further access to the stock-holds table, and preserves that table temporarily for a non-destructive data audit. Later forward-only migrations add bounded inventory and Dashboard read models, repair grants and scoped access, introduce branch supply-route and received-quantity provenance, preserve unmatched PR entry as auditable non-catalog lines, split approved purchase requests atomically by supplier, make Item Master the authority for supplier-item identity, bound historical inventory opening reads, preserve explicit outlet receipt zeros, remove leaked PR approval grants from non-owning workflow roles, allow item-master suppliers as a controlled PR fallback, deterministically backfill supplier identities from unique stock-take category matches, repair supplier split ordering, satisfy purchase-order idempotency invariants, resolve deterministic legacy PR supplier snapshots, anchor outlet daily validation to the affected product line, create an item master with optional supplier/branch sourcing atomically, and stage one tenant-scoped AutoCount multi-file job before a single atomic master-data confirmation; they do not restore the retired Central Kitchen PR workflow or make AutoCount quantity authoritative over OMS stock.

A page may exist visually without its full workflow, validation, database integration, permissions, and downstream effects being complete.

### Operational

These modules are expected to support their primary working flow:

- Authentication and profile access.
- Supplier Master.
- Item Master.
- Stock Balance.
- Movement Ledger / Stock Transactions.
- Purchase Requests.
- Purchase Orders.
- Goods Receiving.
- Purchase Returns.
- Supplier Invoices.
- Stock Counts, Transfers, and Wastage.
- Outlet Daily Records for Central Kitchen quantities sent, Outlet Staff quantities received, wastage, and manager review.
- Products, Recipes / BOM, and Production Jobs.
- Company, Branch / Outlet, staff, and role administration.
- Private document attachments and activity history.
- Roles and permissions.

### MVP or In Progress

These modules may have working core flows while secondary cases remain incomplete:

- Dashboard.
- Pilot data onboarding and reconciliation.
- Export tools.
- Advanced stock reconciliation.
- Cross-module automation.

### Planned or Future Scope

The following areas are not considered complete unless later documentation explicitly states otherwise:

- Advanced accounts-payable forecasting and scheduled payment-alert delivery.
- Finance and general ledger.
- Full general-ledger accounting.
- Advanced business intelligence.
- Predictive demand and cash-flow forecasting.
- Automated replenishment.
- Full accounting reconciliation.

## Core Workflows

### Purchase Request to Purchase Order

The intended procurement flow is:

1. A user creates a purchase request.
2. The request is reviewed according to permissions and workflow rules.
3. An approved request may be converted or linked to a purchase order.
4. The purchase order becomes the formal purchasing record.
5. Receiving activity is recorded against the relevant purchase order where applicable.
6. Inventory is updated through controlled receiving or stock records.

Upstream information should be reused rather than re-entered manually.

### Goods Receiving

Goods receiving should:

- Reference the relevant supplier and purchasing document where available.
- Record actual received quantities.
- Preserve discrepancies rather than silently overwrite ordered quantities.
- Support attachments or evidence where implemented.
- Generate controlled inventory movement only after the receiving action reaches the required valid status.

### Supplier Invoice and Payment

The operational payables flow is `PO -> posted GRN -> supplier invoice -> partial/full payment`.

- Finance and Owner users create draft invoices from uninvoiced quantities on same-company posted GRNs for one supplier.
- Invoice lines preserve PO ordered quantity, received quantity, previously invoiced quantity, PO price, invoice price, and variance.
- Draft totals are calculated server-side and lock when the invoice is approved/open.
- Payments are atomic, idempotent, company-scoped, and move invoices through Open, Partially Paid, and Paid.
- Voiding requires permission and a reason; invoices with payment history cannot be silently voided.
- Invoice and payment actions never create inventory movement.
- AP Aging, live Payment Due Alerts, and the Cash Flow Forecast report current MYR exposure from Open and Partially Paid invoices. Missing due dates remain visible; bank cash-flow forecasting, General Ledger, bank reconciliation, Accounts Receivable, payment reversal, and scheduled alert delivery remain future scope.

### AP Aging

AP Aging uses the company-scoped database report from migration `061`. Outstanding is invoice total minus recorded payments, never below zero. Buckets are Not Due, Due Today, 1–30, 31–60, 61–90, 90+ Days Overdue, and Missing Due Date. The report uses the company timezone when available; the current schema has no company timezone field, so it falls back to `Asia/Kuala_Lumpur`. Users with Supplier Invoice view permission may view and export the same filtered dataset; reporting does not mutate invoices, payments, or inventory.

### Payment Due Alerts

Migration `062` extends the AP Aging RPC with a live, read-only attention summary. Priority is Missing Due Date, 91+ Days Overdue, 31–90 Days Overdue, 1–30 Days Overdue, Due Today, then Due within the next seven days. Within each group, higher outstanding balance comes first, followed by earlier due date. The same `supplier_invoice.view`, company isolation, MYR, and `Asia/Kuala_Lumpur` fallback rules apply. Alerts appear on the dashboard and invoice/AP Aging views; there is no email, SMS, push, Cron, read state, snooze state, or scheduled notification delivery.

### Cash Flow Forecast

The read-only Cash Flow Forecast reuses the complete AP Aging result rather than create another payable-balance calculation. It groups open positive balances into 7-day, 14-day, 30-day, and current-month views; overdue balances and missing due dates remain separate. Top-supplier totals and invoice drill-through use the same report date, payment deductions, company isolation, permission check, MYR currency, and `Asia/Kuala_Lumpur` fallback as AP Aging. It forecasts supplier payable pressure only: no bank balance, receipts, GL, payment automation, notification, or inventory mutation is implied.

### Stock Count and Reconciliation

Stock counts should:

- Use one canonical lifecycle only: `Draft → Confirm & Post`. There are no submit, review, or approval states in this workflow.
- Autosave edits locally and to the server Draft so refresh, idle timeout, temporary network failure, or recoverable application errors do not discard a user's completed work.
- Save the latest visible form values before `Confirm & Post`; a failed save must leave the record in Draft and must never partially post it.
- Be completed by each Branch / Outlet at the end of the operating day as the practical inventory truth for the next day.
- Record counted quantities separately from the ledger balance and show the variance.
- Require an explicit reconciliation or adjustment action.
- Preserve the original count and resulting adjustment record.
- Avoid direct editing of the stock balance.
- Drive low-stock alerts and purchase-request suggestions from the reconciled Branch balance.
- Allow a Branch to submit a purchase request on any day; Sunday is the normal weekly consolidation cadence, not a system restriction.

### Production

Production records are an optional operational and costing workflow during the MVP. They must not be required for inventory, stock count, goods receiving, wastage, transfer, or purchase-request operation.

When the kitchen is ready to record batches, production records should:

- Identify the production job.
- Record relevant input and output quantities.
- Preserve operational status and history.
- Generate controlled inventory movement for consumed inputs and completed outputs where implemented and explicitly posted.
- Avoid direct balance editing.

## Inventory Rules

Current stock is derived from controlled inventory movement records and reconciled against the latest approved Branch stock count. The latest approved physical count is the operational truth when kitchen production activity is not recorded daily.

No page should directly overwrite stock balance as a normal business action.

Inventory changes may be generated by:

- Goods receiving.
- Stock transfer.
- Stock adjustment.
- Stock count reconciliation.
- Production material consumption, when production is explicitly recorded.
- Production output, when production is explicitly recorded.
- Wastage.
- Returns.
- Other approved inventory movement types.

Corrections must be posted as a new stock movement or adjustment record so the audit history remains intact.

Calculated stock views must not become independent sources of truth.

### Outlet Daily Receiving and Wastage

Outlet Daily Records capture product Qty Sent, Received, Wastage, Wastage Reason, and Remarks by branch and date. Central Kitchen controls Qty Sent; Outlet Staff confirms Received and records Wastage; neither role can overwrite the other role's fields. The established Draft, Morning Recorded, Evening Completed, Reviewed, and Void database states remain compatible while the interface uses concise daily language. Reviewed records are locked; voiding requires permission and a reason. Assigned-branch scope remains authoritative. Outlet Daily Records remain data capture only: they do not post stock movements, change production jobs, forecast demand, or create BI metrics.

### Demand Trend Lite

Demand Trend Lite reports only Outlet Daily Records in Evening Completed or Reviewed state. It estimates movement as received minus leftover and wastage, never below zero, and shows coverage separately because missing or incomplete outlet-days do not represent zero demand. Sprint 7.13.1 labels coverage confidence and low-sample products without changing those totals. It is not POS sales, a production suggestion, or a forecasting engine, and it does not write inventory or production data.

### Production Planning Lite

Production Planning Lite turns the same reliable Demand Trend movement into a cautious planning reference. It applies visible target days, buffer, and rounding values, and marks low-confidence or low-sample products for manual review. HQ/kitchen must check incomplete outlet data; it does not create production jobs, post inventory, or forecast automatically.

### Production vs Outlet Demand Variance

Production vs Outlet Demand Variance compares received quantities, estimated movement, leftovers, and wastage from reliable Outlet Daily Records by product and outlet. It uses conservative over-/under-supply signals and inherits demand coverage confidence; it does not compare production jobs until a reliable posted-output join is available, and it performs no writes.

Its overview compares classified product-outlet row counts around a shared zero baseline. It never compares raw quantities across products or unlike UOMs. Every signal supports pointer, touch, and keyboard preview and opens the equivalent filtered detail list; the list remains the source-detail authority.

### Operations Control Center Lite

The Dashboard composes existing outlet health, demand confidence, variance, planning, inventory, and payable summaries. Each outlet/demand section can be unavailable without blanking the rest of the Dashboard. It is read-only; planning values remain references rather than production orders.

### Master Data Cleanup Lite

Master Data Cleanup Lite is a read-only checklist for duplicate or variant codes, missing core fields, and inactive referenced master records. It links to existing master pages for human review; it does not merge, delete, or modify any record.

### Costing Readiness Lite

Costing Readiness Lite is a read-only checklist for item costs, supplier prices, recipe ingredients, and product-to-recipe coverage. It identifies data gaps before any future margin or costing work; fixes remain manual and it does not recalculate or write costs.

### Recipe Costing Lite

Recipe Costing Lite is a read-only estimate for recipes using the normalized Item Master base-UOM `cost`. It does not substitute supplier prices or recipe-line values when conversion is unclear, and it leaves missing costs visible rather than treating them as zero. It does not write recipe, product, inventory, production, or finance records; margin remains future scope.

Sprint 7.19.1 makes UOM mismatches, missing costs, output gaps, and manual corrective actions explicit without changing the estimate calculation.

### Product Cost & Margin Lite

Product Cost & Margin Lite is a read-only estimate. It only uses a High-confidence active recipe cost and one unambiguous active packaging price; missing recipe, cost, UOM alignment, or price blocks margin rather than becoming zero. Pricing remains manual and no product, cost, margin, inventory, production, or finance data is written.

Sprint 7.20.1 labels non-positive margin as Review, not an automated pricing decision, and makes the product and recipe review paths explicit.

## Roles and Permissions

Seri Bako OMS uses permission-based access.

Roles are collections of permissions. A role name alone must not be treated as the final authorization rule.

Access control may include:

- Navigation visibility.
- Page access.
- Record viewing.
- Record creation.
- Record editing.
- Workflow approval.
- Cancellation or rejection.
- Export access.
- Administrative actions.
- Branch / Outlet or organizational restrictions where implemented.

Front-end visibility is not a security boundary.

Sensitive actions must also be protected through:

- Server-side authorization.
- Server action checks.
- Database row-level security.
- Controlled service-role usage.

Legacy or alias permission codes may be supported for compatibility, but canonical permission definitions should remain stable and documented.

## Product UX Direction

All UI and interaction implementation must follow `DESIGN.md`.

At a product level, the experience must remain:

- Clear.
- Fast.
- Consistent.
- Operational.
- Low-friction.
- Easy to scan.
- Reusable.
- Suitable for repeated daily use.

The system should not introduce new page structures outside the approved page skeletons unless the product architecture is intentionally revised.

Workflow actions should appear in the correct page context rather than as unrelated global actions.

## Data and Audit Expectations

Important operational records should preserve:

- Creator.
- Created time.
- Last updated time.
- Status history.
- Workflow actions.
- Comments.
- Attachments.
- Related upstream and downstream records.
- Inventory or document effects.
- Relevant user identity.

Destructive changes should be avoided where an auditable status change or reversal record is more appropriate.

## Role-aware Dashboard and Capability Hierarchy

`/dashboard` is the default authenticated landing page for all six active roles. It is one server-composed workdesk, not six routes: each role receives only the actionable queues, metrics, alerts, and links supported by its effective permissions and RLS-visible scope.

- Super Admin / Owner has company-wide business, finance, and protected system capability.
- Finance is the second-highest company-wide role. It combines read-level Manager and Purchasing operational visibility with AP, invoice, cash-flow, and payment capability. Its PR authority begins at Finance Review; it does not receive Manager Review, owner controls, or Purchasing mutations and cannot approve its own PR.
- Manager and Purchasing are sibling company-wide operational roles: Manager performs Manager Review across the company; Purchasing runs procurement and master-data workflows.
- Kitchen is limited to assigned Central Kitchen work; Outlet Staff is limited to the assigned outlet and today’s daily-record tasks.

Manager, Purchasing, Kitchen, and Outlet dashboards must never expose AP Aging, Cash Flow, aggregate debt, payment controls, Finance-only recipe costing, or Owner controls. Kitchen and Outlet dashboards must not expose operational information outside assigned branches.

## Out of Scope

Unless explicitly implemented in a later sprint, Seri Bako OMS does not guarantee:

- Full statutory accounting.
- Payroll.
- Tax filing.
- Bank reconciliation.
- Enterprise manufacturing resource planning.
- Customer-facing ecommerce.
- Public ordering.
- Franchise billing.
- Full point-of-sale functionality.
- Replacement of all external finance or HR systems.

## Definition of Done

A module is not complete only because its page exists.

A module is considered operationally complete when its intended core workflow has:

- A working entry point.
- Real database integration.
- Required validation.
- Correct server-side authorization.
- Required database policy protection.
- Clear status behavior.
- Correct downstream effects.
- Loading, empty, success, and failure handling at an MVP-appropriate level.
- Responsive behavior appropriate to its users.
- Consistency with `DESIGN.md`.
- Basic end-to-end validation.
- Updated documentation where the product scope or operating rules changed.

## Related Documentation

- `README.md` — local development and repository overview.
- `DEPLOYMENT.md` — production deployment, environment, migration, and recovery procedures.
- `ARCHITECTURE.md` — application architecture, data rules, permissions, and technical boundaries.
- `DESIGN.md` — application shell, page skeletons, visual system, components, and interaction standards.

## v8.65.2 (deployed; authenticated UAT pending) — Kitchen-owned Stock Count continuity

- Kitchen physical quantities remain authoritative when inventory moves during an open count. Posting reconciles against the latest locked branch balance, preserves the physical entry, and records the original baseline, posting baseline, movement and final variance for follow-up.
- Kitchen may add an active Item Master record to an open draft. The action adds one blank physical-count line and activates the item for future counts at that branch, with activity history and Owner/Purchasing/Finance notifications.
- Branch Stock Count inclusion is operationally editable by Kitchen without changing global Item Master identity or historical ledger facts. PR line writes are constrained to the request's canonical Supplier at the database boundary.
- Production release evidence: commit `4f79fda5` is on `main`, the Vercel deployment completed successfully, and linked migration `208` was applied on 25 August 2026. Public routing and authentication protection respond correctly; authenticated Kitchen, Purchasing, Finance and Owner workflow UAT remains pending.

## v8.64.167 — Outlet Daily ownership and food-only metrics

- Outlet Daily draft rows identify the latest responsible user using submitted, updated, then created ownership; a draft no longer appears anonymous merely because it has not been posted.
- Qty Sent confirmation is a distinct Kitchen/company-wide step. A user with both permissions must confirm Qty Sent before the record can be posted; Outlet users may continue saving Received and Wastage as a draft.
- Packaging remains editable on the operational record but is excluded from Received and Wastage Rate analytics because it is not food output.
- Outlet Daily detail uses a route-specific compact identity: one line on desktop, and a 14px branch line followed by the date on phone.
## v8.65.3 (unreleased) — Final operational UX convergence

- Posted Stock Counts now use an explicit, server-previewed `Void & Reverse` flow. The original count and movements remain, reversal movements are idempotent, and stale previews cannot execute.
- Draft actions converge on Post and audited Cancel; Add Item is the final dashed line tile and row options are limited to Replace, Remove, and Retire.
- Purchase Request and Dashboard queues share the same field order; PO workflow copy and permanent-delete confirmation are shorter and clearer.
- Outlet Daily exposes `In progress / Ready to post / Posted`, gives Reason and Comment deliberate responsive widths, and records actor plus per-product before/after activity.

Migration `263` adds atomic compliance renewal with history. Source reviewed locally; database execution and remote application are pending.
### v9.2.58 (unreleased) — Operational quality closure

- Preserves the released business workflows while tightening hydration safety, responsive geometry, role-aware UAT contracts and failure-state evidence.
- Purchase-request phone entry uses equal bounded commercial tracks; rejected requests expose the recorded reason and a direct correction/resubmission next step.
- Route-heavy E2E runs are viewport-sharded so dev-server memory pressure cannot be confused with a product navigation failure.

Repository migrations reviewed through `281`. v9.2.58 remains unreleased until final gates, deployment and authenticated Production UAT are complete.
