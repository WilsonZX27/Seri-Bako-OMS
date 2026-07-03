# Sprint 6.12.4 Page Deduplication Audit

Operational documents should open through their module page, not the generic document detail page.

| Duplicate Route Found | Canonical Route | Action Taken | Remaining Risk |
| --- | --- | --- | --- |
| `/documents/[id]` for Purchase Request documents | `/purchase-requests/[id]` | Added `getCanonicalDocumentHref()` and redirect from generic document detail. Document register, search, dashboard, and Workspace Updates now prefer canonical links. | Attachment/comment actions may still post through generic document actions, but redirect preserves success/error query and then routes canonically. |
| `/documents/[id]` for Purchase Order documents | `/purchase-orders/[id]` | Generic document detail redirects when `related_entity_type = purchase_order`. | PO document links depend on `related_entity_id` being present. |
| `/documents/[id]` for Goods Receiving documents | `/goods-receivings/[id]` | Generic document detail redirects when `related_entity_type = goods_receiving`. | Older GRN records without `related_entity_id` remain generic until backfilled. |
| `/documents/[id]` for Stock Count documents | `/stock-counts/[id]` | Canonical helper supports route. | Some stock modules may still create generic-only documents if related entity is missing. |
| `/documents/[id]` for Stock Transfer documents | `/stock-transfers/[id]` | Canonical helper supports route. | Same related entity dependency. |
| `/documents/[id]` for Stock Wastage documents | `/stock-wastage/[id]` | Canonical helper supports route. | Same related entity dependency. |
| `/documents/[id]` for Recipe documents | `/recipes/[id]` | Canonical helper supports route. | Recipe detail still has older document-side panels and can be refreshed later. |

## Remaining Follow-up

- Add a data backfill only if production has operational documents with missing `related_entity_id`.
- Keep `/documents/[id]` for true generic documents only.
- Future timeline links should use `getCanonicalEntityHref()` when they include entity metadata.
