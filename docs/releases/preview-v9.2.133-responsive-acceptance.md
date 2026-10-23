# v9.2.133 (Preview candidate) — responsive acceptance fixes

Base: `e5efb6bee81aa51e3cb8fe59cbf6aa941ad7bd32` / 9.2.132.

Four real Preview findings from `/private/tmp/oms-preview-acceptance-evidence-20261023/ACCEPTANCE.md` (Owner session,390/820/1440) drive this bounded change:

1. Daily phone date/branch were compressed by four tracks including result count. Edit their existing shared CSS owner to reserve a 9rem date track and retain 44px filter target; move count into a second row. No added stronger important override, input behavior or new date component.
2. Daily switched to a clipped nine-column table at xl, contrary to DESIGN's1536px contract. Match existing 2xl compact/table handoff. Table adds an explicit opt-in native scrollbar; default callers and focusable labelled region remain unchanged.
3. Inventory movement chart preceded operational overview/actions. Move the intact chart section after existing work entry sections. Keep period selector, errors, data, chart and keyboard interactions.
4. Due soon occupied half of the final payables row. Existing Metric className extends it across both columns, preserving all values and links.

Regression cases fail5/5 on the exact old source and pass5/5 after; existing nine-role/workdesk fixtures also pass26/26. Full suite/typecheck/lint/build and actual postdeploy browser evidence recorded separately. Original5 baseline failures are not waived. No query, auth, grants, migrations, cache, business writes or Production changes.

Skills: actually read Karpathy Guidelines, Ponytail, UI UX Pro Max and Impeccable4.7.0. UI UX Pro Max local Python search matched Essential Text Truncation after one narrower retry; recommendations applied within the frozen design, not a generated new system. Impeccable engine absent; no launcher/download/install. React best-practices review preserves SSR parity, no added hooks/listeners/dependencies, no changed fetch waterfall. Graphify not run.

Node22.23.4: 1753 tests /1748 pass /5 fail, exact same remaining failure names as9.2.132; five additional regression cases execute. Typecheck and four changed TSX lint pass. Local Next build passes with synthetic localhost Supabase URL and dummy public key, not live data. Hosted compilation and new actual-browser retest remain gates.
