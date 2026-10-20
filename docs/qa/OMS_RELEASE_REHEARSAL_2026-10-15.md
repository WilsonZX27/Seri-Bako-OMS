# Approved release rehearsal — 2026-10-15

Candidate: 91f158c8 plus migration 356, a forward correction of the two independently verified production differences in 343/344. No historical 339–344 migration records are repaired. Production 345 eligibility validation is preserved (preflight MD5 948b9f0573df4b95701e3751c3111fb6).

Private recovery SQL and metadata are stored outside the repository in the approved local recovery directory. No production business/Auth rows or credentials were exported.

An isolated clone of the local synthetic database passed: restore ten original function definitions exactly; apply 346–356; rollback; reapply; reject application/security-definer writes despite a forged release marker; reject both Cron write paths; allow only an explicit postgres release transaction; remove protection and resume writes. Sensitive confirmation/payslip grants were verified to target People Operations only. The guard has a bounded expiry and five-second lock timeout. Rollback refuses to remove newly accepted feature data.

The clone's unrelated realtime function and vault restore errors were excluded from the public-schema release scope. These checks do not claim realtime/vault recovery coverage. The source candidate already passed 1,622 tests, TypeScript, lint, build and 107 explicit UI cases; this release does not repeat that entire suite.

Production preflight at this checkpoint: migration head 345; no release guard installed; one active People Operations role. No production changes had been made at this checkpoint. KG, purchasing, costs and conversion rates are outside this release.
