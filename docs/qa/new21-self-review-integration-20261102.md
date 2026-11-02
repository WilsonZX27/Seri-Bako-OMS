# New21 self-review integration and approved-base preservation

Integrated author delta SHA25615c37e149b5050e61c75c215c8e2d74ae825eb6226dddb2b8c622cee11cc892c. Its new-test diff lacked the git new-file marker; integration copy added only that patch metadata (no content alteration). Four source files and actual-component test applied. Existing error.code TypeScript narrowing retained.

Authenticated server queries compare stored submitted_by with tenant actor staffId and attach own_request. RO Approve/Reject and submitted OT Review are disabled for own requests with an explanatory title; another qualified approver remains enabled. Existing RPC guards, permissions, tenant filtering, salary logic and SQL are unchanged. This fixes a reproducible UI/RPC contract discrepancy, not a proven explanation of the original live user failure.

Executed combined tests people-self-review + people-safe-error:6/6 pass (four actual React SSR self/other RO/OT cases and two error tests). Typecheck, changed-file ESLint, diffcheck and production build pass. Logs /tmp/oms-new21-20261102/handoff/self-review-{tests,types,lint,build}.log. No live approvals or claims submitted.

Found prior new21 branch diverged before aa230 and would have omitted its responsive layout. Merged approved aa230773653d673619a4eb0e57bc38a36ce87f36, now confirmed an ancestor. Schedule workbook source diff against aa230 is empty. All old57fb ancestry and the approved phone fix are retained. Merge7171da902940a191581e02ad02d363ad867c45b0 is the source built above; later commit only adds this report.

Notification candidate remains unchanged, unnumbered and uninstalled, SHA2566ae1f8f5e3498de6da8c66af069e6fea69dc2aa38b01f5681101b46167a69733. Its separate review/approval and scope limitations remain. Session30minute/global-signout diagnosis changed no security code/settings. No new21 push or production promotion.

Previously recorded new21 responsive evidence is unchanged for UI outside the self-review disabled/title attributes; this delta has SSR evidence, not fresh authenticated browser acceptance. Real non-Owner reads, original live error response and populated combined planning visual check remain explicitly outstanding.
