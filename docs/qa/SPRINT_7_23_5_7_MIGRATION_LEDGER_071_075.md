# Migration Ledger 071–075

Remote status is deliberately unverified in this local sprint. `Not applied by 7.23.5.7` means this sprint performed no remote action; it is not a claim about Production’s existing state.

| Migration | Purpose | Data impact | Release dependency | Sprint action |
|---|---|---|---|---|
| 071 `six_role_information_architecture` | Converges assignments on six fixed roles and archives legacy role rows behind guards. | Role/assignment catalogue updates; no staff or business-record deletion. | Required for canonical six-role behavior. | Reviewed locally; not applied by 7.23.5.7. |
| 072 `finance_operational_visibility` | Adds Finance operational read union, view permissions, and PR self-approval guard. | Permission grants and trigger/function definitions; no business-row workflow transition. | Required for Finance visibility and approval separation. | Reviewed locally; not applied by 7.23.5.7. |
| 073 `operating_governance_permissions` | Aligns staff, branch, sequence, import, and owner governance permissions/RLS. | Permission assignments and authorization definitions; no operational business-row mutation. | Required for governance route behavior. | Reviewed locally; not applied by 7.23.5.7. |
| 074 `daily_record_recipe_access_product_order` | Adds product display order and Qty Sent ownership; narrows recipe access. | Schema plus controlled product-order seed and permission changes. | Required for current Daily Record/product-order/recipe boundary. | Local-only review; do not apply remotely without separate approval. |
| 075 `manager_company_wide_operational_scope` | Makes Manager operational PR visibility company-wide while preserving branch default context. | Permission/role-description and authorization-function updates; no PR business-record mutation. | Required for company-wide Manager PR scope. | Local-only review; do not apply remotely in this sprint. |

## Remote verification record

Before any future application, record project identity, current remote ceiling, migration checksum, pre-change counts, approver, operator, start/end time, result, and rollback/recovery reference. Never place credentials or raw business values in this ledger.
