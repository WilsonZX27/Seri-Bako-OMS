# v9.2.152 Shared asset transfer column header

Pure UI follow-up: use the same RequestLineHeader/RequestLineRow owners as PR; one visible Asset/Available/Quantity/Remove title row, no repeated visible Quantity labels within asset rows. Every asset retains its own quantity input, accessible name, native validation and remove focus behavior. Responsive tracks are checked against intrinsic header text width; no hidden required column or root overflow.

Batch creation remains in the approved151 state and automatic numbering remains OFF. No SQL, data migration, account/permission change, ID allocation or real transfer test. Existing test drafts must be preserved during live read-only verification.
