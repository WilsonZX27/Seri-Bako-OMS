# Item creation refactor boundary

**Status:** P1 implementation baseline — local transaction and unified form implemented; linked/role/viewport proof pending

## Why the current flow feels fragmented

The screen that creates an item master does not own all of the records that make
an item usable in procurement. The current dependency graph is:

```text
Item master
  └─ Supplier item (supplier-specific purchase identity, UOM, cost, MOQ, lead time)
       └─ Branch supplier-item mapping (where the source is usable and preferred)
```

`createItem` currently writes only the first node. `SupplierItemForm` and
`createSupplierItem` own the second and third nodes, including the secure
`save_branch_supplier_item_mappings` RPC. A UI-only merge would therefore create
partial data and reintroduce the exact “known item, no usable supplier” state that
the procurement flow is now trying to explain.

## Recommended mature-ERP pattern

Use one **Create operational item** screen with progressive disclosure, but keep
the data boundaries explicit:

1. **Identity** — item code, name, category, base UOM, purchase UOM, cost and
   safety stock.
2. **Default sourcing (optional)** — primary supplier, supplier item code, cost,
   conversion, MOQ and lead time. The UI should say “optional sourcing default”,
   not imply that the item is procurement-ready when it is not.
3. **Availability** — active branches and preferred branch mapping. Do not silently
   default to every branch; show the scope and require confirmation.

The submit must call one server-owned transaction boundary. Preferred shape:

```text
create_operational_item(input jsonb)
  → validate actor/company/permissions
  → insert item master
  → optionally insert supplier item
  → optionally replace branch mappings atomically
  → write audit event
  → return item_id + readiness state
```

If any child write fails, the whole operation rolls back. The response should
return a readiness state (`master_only`, `supplier_ready`, `branch_ready`) so the
next action is visible without a generic toast.

## Scope guardrails

- Do not remove the existing supplier-item route until the atomic contract and
  migration are live.
- Do not infer “all active outlets” as a business rule; central-kitchen and outlet
  sourcing are not interchangeable.
- Do not duplicate supplier data on the item master. Keep supplier-item code,
  purchase UOM and price at supplier-item grain.
- Do not make a missing supplier a blocking error for saving a draft item. It is a
  readiness gap, not necessarily a data-integrity failure.
- Keep the current `save_branch_supplier_item_mappings` security boundary or fold
  its checks into the new RPC; never replace it with client-side inserts.

## Implementation and proof gates

1. **Implemented locally:** migration 168 adds the transactional RPC with
   tenant/permission/RLS checks and a readiness response; the contract suite
   covers the source boundary. Rollback remains a required linked-database proof.
2. **Implemented locally:** the progressive-disclosure form reuses the existing
   supplier and branch controls rather than introducing a second selector model.
3. **Implemented locally:** item detail now shows a bounded readiness badge and
   direct sourcing action; the summary is read-only and does not replace the
   existing mapping write authority.
4. **Pending release proof:** verify owner, purchasing and kitchen roles with a
   disposable fixture, then capture 390/820/1440 viewport evidence. Keep the old
   supplier-item and branch-mapping routes available for correction and bulk
   maintenance until this proof is complete.

This boundary keeps the user-facing flow simple while preserving the database
truth needed for reliable PR validation, supplier attribution and future inventory
analytics.
