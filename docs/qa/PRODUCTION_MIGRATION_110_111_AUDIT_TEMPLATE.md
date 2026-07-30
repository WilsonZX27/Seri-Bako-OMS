# Production migration 110/111 audit result

## 1. Remote identity and read-only evidence

- Project ref: `nnvdsaftiwpqkekjfrgc`
- Project name:
- Environment purpose:
- Database name:
- Database user:
- Server address:
- Server port:
- PostgreSQL version:
- `transaction_read_only`:
- Migration schema exists:
- Evidence collected at:

## 2. Migration history 107+

Paste or attach section 02 results without the `statements` field.

- Migration 110 recorded:
- Migration 111 recorded:
- Migration 112+ present:
- Duplicate/abnormal versions:
- History notes:

## 3. Migration 110 objects and functions

| Object | Exists | Notes |
|---|---:|---|
| `stock_counts.posting_reference` | | |
| `stock_count_lines.line_position` | | |
| posting-reference unique index | | |
| line-position unique index | | |
| `update_stock_count_draft_atomic(uuid,jsonb)` | | |
| `post_stock_count_atomic(uuid)` | | |

## 4. Remote 110 versus current canonical 110

For `post_stock_count_atomic`, record evidence for:

| Requirement | Remote evidence | Matches canonical |
|---|---|---:|
| Accepts `draft/submitted/reviewed/approved` | | |
| Row lock (`FOR UPDATE`) | | |
| `stock_count.post` permission | | |
| Branch-scope validation | | |
| UOM validation | | |
| Four-decimal precision validation | | |
| `line_position` validation/order | | |
| Theoretical snapshot stale detection | | |
| `physical - theoretical` variance | | |
| Deterministic transaction reference | | |
| Posting reference | | |
| Already-posted idempotency | | |
| Movement and status in one function transaction | | |

For `update_stock_count_draft_atomic`, record material differences:

-

Overall canonical match:

## 5. Kitchen permissions by tenant

| Company ID | Kitchen role ID | Role status | Grant count / 8 | Missing canonical permissions | Assigned branch count |
|---|---|---|---:|---|---:|
| | | | | | |

- All eight canonical permission rows exist:
- `stock_balances.view` database row exists:
- Legacy alias grant count:
- Potential Purchasing-only grants found on Kitchen:
- Branch scope observations:

## 6. Migration 111

- History recorded:
- `purchase_request_stock_holds` exists:
- `create_central_kitchen_purchase_request_atomic(jsonb)` exists:
- Indexes complete:
- Constraints complete:
- Execute grants:
- Estimated stock-hold rows:
- Exact stock-hold rows, if optional block was applicable:
- Purchase Requests with stock holds:
- Central Kitchen PR activity-log count:

Select one:

- [ ] 111 history and objects both absent
- [ ] 111 history present and objects complete
- [ ] 111 history present and objects incomplete
- [ ] 111 history absent but objects present
- [ ] 111 objects exist and business data exists

## 7. Stock Count production integrity

| Check | Result count | Example count number / truncated ID if required |
|---|---:|---|
| Posted, non-zero variance, no movement | | |
| Duplicate posting reference | | |
| Count/transaction branch mismatch | | |
| Posted ledger/Stock Balance mismatch | | |
| Posted count without posting reference | | |
| Duplicate movement/reference | | |
| Invalid transaction direction | | |
| Count-line UOM mismatch | | |
| Zero variance with movement | | |

Legacy/current status counts:

| Status | Count |
|---|---:|
| draft | |
| submitted | |
| reviewed | |
| approved | |
| posted | |

Schema-dependent checks marked `NOT APPLICABLE / SCHEMA MISSING`:

## 8. Backup and PITR

- PITR enabled:
- Most recent available backup:
- Retention:
- Usable recovery point shown:
- Evidence source:
- Unknown/unavailable fields:

## 9. State classification

Select exactly one after all evidence is reviewed:

- [ ] **A** — 110 unrecorded, 111 unrecorded, and their objects absent
- [ ] **B** — 110 recorded but different from current canonical 110; 111 absent
- [ ] **C** — 110 and 111 are recorded or their objects exist
- [ ] **D** — Migration history and schema disagree (partial/hybrid drift)
- [ ] **E** — 110 correctly applied and matches current canonical 110; 111 absent

Evidence supporting classification:

## 10. Production blockers

1.

## 11. Next step

- [ ] No action until missing evidence is collected
- [ ] Prepare a new forward-only remediation migration under separate authorization
- [ ] Investigate migration 111 data and dependencies under separate authorization
- [ ] Ready for a separately authorized production-release decision

Do not rerun or overwrite migration 110 when it is already recorded. Do not
repair migration history or roll back migration 111 from this audit.
