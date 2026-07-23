# Backup artifact retention

Production exports and downloaded attachment bytes must not remain in the source workspace as a routine workflow.

The former `outputs/go-live-backup-2026-07-20T10-25-09-949Z` artifact was deleted after explicit Owner authorization because the system had not entered real operational use. Future artifacts must be treated as controlled evidence, ignored by Git, and never packaged or synced.

Before deletion, an Owner must confirm that the artifact has been transferred to approved encrypted storage with an owner, retention period, access log, and recovery test. Deletion is a separate controlled operation; no application migration or reset may remove it.
