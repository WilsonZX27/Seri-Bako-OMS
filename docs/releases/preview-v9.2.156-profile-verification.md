# v9.2.156 Transient profile verification recovery — Preview candidate

Production baseline: v9.2.155, SHA9c9ed711e44b6355b8af25691d6ea3548276167e, deployment4Q6nEizPp2ofMPveR71emypyyxJY. This candidate does not promote or change Production.

A deterministic isolated reproduction found that valid Auth claims plus a temporary employee-profile lookup error returned401/session-inactive. Middleware now returns503 before permission resolution or business execution and preserves refreshed response cookies. Genuine missing sessions/profiles, disabled accounts and tenant/permission denials remain protected. One behavior regression covers page/API failure, response-cookie preservation and later recovery. No credentials, timeout, sign-out scope, RLS or business state changes.

Version/footer and release metadata advance together to156 under the repository release contract. No UI redesign or unrelated edits. Prior patch checks2015tests/type/lint/build passed before version bookkeeping; final candidate checks and Preview SHA/Ready must be recorded after these metadata changes. Synthetic errors are not a real Production fault injection or proof that all intermittent logout causes are solved.

Remaining acceptance: legitimate current-role Production/Preview observations, original schedule-notification first entry, single-location Checklist, eligible supplier-recovery visibility, People confirmation of14identities/482events and the missing original OT workbook. Do not auto-match people, recalculate history or submit business actions to manufacture evidence. Numbering stays OFF; DB371–375 are already installed and must not be repeated.
