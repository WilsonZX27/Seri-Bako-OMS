# Stock Count storage recovery — local diagnosis and fix

## Incident status
Wilson's actual Kitchen incident remains unconfirmed. Parent inspected the screenshot: the Stock Count workspace displays “This workspace could not finish the request” with the generic result-uncertain warning. No record ID, failed action, browser, role or digest is visible. This message comes from the shared app error boundary, not a Stock Count transaction-specific response. It does not establish whether any write occurred or quantities were corrupted.

Read-only checks confirmed production commit `2dc8c0f441fe43ee02c285d8397e6dd0cc3d6b3c`, Ready deployment `dpl_9rTTUyGc4ET2VYHFcrguFcrhDb71`, aliased to `system.seribako.com.my`; remote main was `cbf531c612b686a574527ba9346aa72880bab4f0`. The difference was limited to four attendance/schedule files. Today’s bounded runtime-log search did not identify a Stock Count error; absent logs do not exclude client errors.

No root/ancestor AGENTS.md was found. Main workspace is dirty and was not changed. Local design skills were inspected for relevance; this is a focused functional repair with no redesign. Independent worktree `/tmp/oms-stock-count-storage-fix`, branch `codex/stock-count-storage-recovery`, starts from the verified production commit. Its repository is `/tmp/oms-stock-count-diagnosis-20261013.git`.

## Confirmed defect and scope
The Stock Count form accessed localStorage without guarding the property getter and read/write/remove operations. A SecurityError during sort/recovery or QuotaExceededError during snapshot persistence escaped the component. Snapshot persistence ran before the autosave timer, so its failure prevented the scheduled server save. Removal failure after a successful server save entered the action-failure catch and could misreport success as failure.

A pre-fix synthetic probe executed the exact production effect bodies and confirmed escaping SecurityError / QuotaExceededError with no scheduled autosave. Original probe: `/tmp/oms-stock-count-storage-probe.cjs`.

Affected surfaces are new counts and editable draft counts, for every role permitted to create/update, including Kitchen. Kitchen defaults include read/create/update/post; this does not establish the reporter’s actual live permissions or assigned branch access. The list page handles its usual list/summary/branch read errors locally; new-page source failures show “Starting balances unavailable”. Detail reads of count/permissions/catalog/document metadata may still reach the shared boundary, including after a successful action redirect. Those are distinct unconfirmed incident causes.

## Fix
- Add a narrow best-effort storage helper. Property access takes place inside its protected callback.
- Protect all form storage reads, writes and removals, including malformed-recovery cleanup and successful-save cleanup.
- Failed device backup leaves current input in memory and still schedules the original server autosave. Existing completeness checks, idempotency keys, save sequencing, retry policy and final posting flow are unchanged.
- Failed cleanup cannot convert a successful server save to a failure or schedule a retry.
- Display a concise device-backup warning until server save succeeds. Autosave failure text asks users to keep the page open; server-side fallback and incident guidance no longer promise that a local snapshot exists.

This does not make browser storage reliable, restore data already lost, or prove Wilson’s incident is fixed. When backup fails, closing/reloading before server save can still lose unsaved input. If a stale snapshot cannot be removed, it can remain on the device; this scoped patch does not redesign snapshot conflict/version handling.

## Validation
- 12 new behavioral regressions execute the real TypeScript effect/callback bodies with synthetic storage, timers, forms and server actions.
- Covers SecurityError, QuotaExceededError, blocked storage property getter, retained input, autosave scheduling, successful save despite removal failure, retry then success, exhausted retry budget, nonretryable validation, incomplete quantities, malformed recovery, valid explicit-edit recovery, unchanged-prefill refresh, storage becoming writable, and online/hidden-page flushing without duplicate writes of saved revisions.
- Full suite: 1,542 passed, zero failed/skipped.
- Strict TypeScript (`--noUnusedLocals --noUnusedParameters`): passed.
- ESLint: passed.
- Production build: passed with synthetic `https://stock-count-build.invalid` configuration and a dummy publishable key. No production credentials or database were used.
- `git diff --check`: passed.

Logs: `/tmp/oms-stock-count-{tests,types,lint,build}.log`. Dependencies were reused read-only through a node_modules symlink to the existing installation; no installation or lockfile change was made. No real browser/phone or database-backed end-to-end acceptance was performed; the new tests verify actual callback behavior in an isolated VM.

## Safe incident handling and remaining evidence
Preserve the original page and device storage. Do not clear site data, create replacement counts, or repeat posting based only on the screenshot. Read the existing count's branch/date/number, Draft/Posted status and saved quantities; if posting was attempted, reconcile its ledger reference. A different browser does not inherit unsaved local input.

Still needed: action immediately preceding failure, URL suffix, branch/count number, device/browser/PWA, timestamp/timezone, and whether another already-authorized account can read the record. Parent has already requested clarification.

No real Stock Count was created, saved, submitted or posted. No production inventory writes, migrations, push or deployment occurred. No browser page/login, other task database/port or primary-workspace file was changed.
