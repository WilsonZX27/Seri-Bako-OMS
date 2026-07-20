# Controlled Staff Change: Jack and Ashley -> Finance

Status: **Not performed.** This checklist is separate from the v7.23.5.7 application release and requires explicit Production data-change approval.

## Authorization and pre-check

- [ ] Obtain named Owner approval for exactly Jack and Ashley to receive the fixed Finance role.
- [ ] Verify the intended Production project and active company without exposing identifiers in screenshots or logs.
- [ ] Resolve each person by an approved unique identifier; do not rely on display name alone.
- [ ] Record current role assignment, status, effective dates, overrides, default branch, and audit-history reference.
- [ ] Confirm both accounts are active and that the fixed Finance role exists and is active.
- [ ] Confirm no explicit staff deny/allow override would create an unintended effective permission set.
- [ ] Prepare a rollback statement that restores each person’s exact previous assignment and effective dates.

## Controlled change

- [ ] Execute in a transaction or approved atomic administration path.
- [ ] Change only the two approved staff-role assignments.
- [ ] Do not modify passwords, branches, staff status, business records, or role definitions.
- [ ] Write or verify the normal audit event for actor, target, old role, new role, and timestamp.
- [ ] Commit only after both assignments and invariants validate; otherwise roll back the full change.

## Verification

- [ ] Re-authenticate each account to refresh effective permissions.
- [ ] Confirm Finance Dashboard, Supplier Invoices, AP Aging/Cash Flow, operational read visibility, Staff, Branch, sequence, and import access.
- [ ] Confirm no Manager Review authority, no Owner controls/backups, no Purchasing mutation, and no requester self-approval.
- [ ] Confirm direct-route denials resolve without loops.
- [ ] Compare staff and business-record counts before and after; only the approved assignment/audit rows may differ.

## Evidence and rollback

- [ ] Store sanitized before/after evidence outside Git; never record passwords, tokens, email addresses, UUIDs, or financial values.
- [ ] If either verification fails, restore both prior assignments using the prepared rollback and re-authenticate to confirm recovery.
- [ ] Record approver, operator, timestamp, transaction result, and rollback status in the controlled operations log.
