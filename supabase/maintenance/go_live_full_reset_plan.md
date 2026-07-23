# Go-Live full reset plan — current schema 077

## Preserve exactly

- Company, branches/outlets, locations, configuration, roles, permissions, RLS policies, and document-sequence configuration.
- Staff/Auth by staff code: `SUPER-ADMIN` (Wilson), `ROCKY`, `JACK`, `ASHLEY`, `FAYADH`, `FIZA`, `AIDEN`.

The SQL preflight stops if that list is not exactly seven rows, any code is ambiguous, or Wilson lacks an active Super Admin Staff/Auth link.

## FK-derived deletion order

1. Approval/notification/document children and attachment metadata.
2. Invoice/payment, return, production, stock, receiving, PO, PR, and outlet-record children then headers.
3. Recipe snapshots/lines/recipes, then documents.
4. Activity/audit/tombstone rows.
5. Product packaging, UOM conversion, supplier-item, product, item, supplier rows.
6. Non-retained staff assignments, Staff rows, and their Auth identities.
7. Monthly counter rows; retain sequence configuration with `next_number = 1`, padding `3`, monthly reset.

Storage objects are not database-transactional. The SQL preflight prints every attachment path; delete those accessible bytes separately and record missing paths as pre-existing.

## Local proof

- Current migrations through `077_monthly_document_numbering.sql` applied on the disposable local database.
- Reset committed with zero operational/master rows, zero attachment metadata, zero monthly counter rows, and seven retained Staff/Auth rows.
- Retained Owner login succeeded after reset.
- A new supplier, item, product, and recipe were created after reset.
