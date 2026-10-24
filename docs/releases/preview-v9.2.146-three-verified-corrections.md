# v9.2.146 Preview — Three verified responsive corrections

## Scope

- Remove the half-track translation from three-field Outlet Daily inputs and headers. This aligns the entire boxes, not only the numeric text. Four-field geometry, values, widths and touch heights are preserved.
- Change only the shared phone primary-action slot from 44px to 48px. Planning Save settings is the reproduced case. Secondary actions remain 44px; tablet/desktop and the existing transfer document actions retain their accepted sizes.
- Match the most-specific information-architecture path. /people/ro now resolves RO Management rather than Employees. Employee details, route boundaries and navigation ordering remain covered by regression checks.

## Evidence and limits

The 145 Owner read-only review reproduced these issues using the user's genuine tab reference. Local 1907 tests, lint, types and optimized build passed; three-width actual-component checks also covered six unaffected transfer states. Release metadata checks and final 146 deployment evidence are recorded separately.

This is one consolidated Preview update. Loaded Import Review, nonzero balance sorting and other roles remain untested in the live application. Missing legacy3/N9 references are not closed. Asset batch/numbering and paid EL capabilities remain gated off; duplicate-repair shared SQL remains unapplied. Production and Chef rollout retain the existing external deployment-author blocker. No business saves/imports, notification mark-read, account changes or database mutations are part of acceptance.
