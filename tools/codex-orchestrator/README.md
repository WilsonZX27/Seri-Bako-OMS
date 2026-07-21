# Safe local Codex orchestrator

This dependency-free Windows tool runs a bounded Codex implementation/review loop in the current Git repository. It uses Node 24's native TypeScript support, `codex exec --json`, `workspace-write`, and one resumed session.

## Prerequisites

Install Node.js 24+, npm, Git, and a Codex CLI supporting `exec --json` and `exec resume`. Authenticate once interactively with `codex login`; credentials are never written to orchestrator logs.

Prepare one UTF-8 Markdown/text objective with explicit acceptance criteria. Do not include secrets, `.env` contents, production actions, or remote authorization. See `sample-task.md`.

```powershell
npm run codex:orchestrate -- --task tools/codex-orchestrator/sample-task.md --dry-run
npm run codex:orchestrate -- --task path/to/task.md
npm run codex:orchestrate -- --objective "Add focused tests for the local formatter"
npm run codex:orchestrate -- --task path/to/task.md --max-iterations 2
npm run codex:orchestrate -- --latest-report
npm run codex:orchestrator:test
```

The default limit is four implementation/review cycles; the hard maximum is eight. The tool records redacted JSONL, session/event/message/command/file data, exit state, baseline/current Git status, and actual validation exits. It detects available `lint`, `typecheck`, `test`, and `build` scripts.

## Safety and recovery

The coordinator stops for commit/push/merge/rebase, destructive pull/Git, PR mutation, deployment, remote database or Supabase mutation, production schema approval, secrets, `.env` changes, deletion, sandbox bypass, ambiguity, failed authentication/quota, no progress, or iteration exhaustion. These immutable rules are enforced by code and prompts. Wilson must manually review and perform any commit, push, deployment, or migration.

Local reports, redacted logs, and the exclusive lock live in gitignored `.codex-orchestrator/`. Ctrl+C terminates the child, writes an interrupted report when possible, and removes the lock. After a crash, confirm no orchestrator/Codex process is running before manually removing `.codex-orchestrator/orchestrator.lock`; start a new run rather than assuming safe resume.

To remove the bootstrap, manually delete `tools/codex-orchestrator/`, remove its two package scripts and `.gitignore` entry, and optionally delete the ignored local state after review.
