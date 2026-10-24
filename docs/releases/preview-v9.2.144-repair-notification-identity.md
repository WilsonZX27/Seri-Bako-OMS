# v9.2.144 Preview — Repair notification identity

## Consolidated scope

Retains143 operational UI, two-card single-asset transfer workspace, People/RO workflows and approved offboarding guard. Repairs distinct notices losing their asset/location identity after generic explanation removal. Visible repairs now show asset name/code, canonical location and short Ref; separate pending requests retain unique Ref. Identity wraps on touch screens. Notice IDs, destinations and read handlers are unchanged. Additional reads require existing asset permissions and table RLS and are bounded to five visible repair notices.

## Verification and boundaries

Real143 Owner session reproduced the notification defect and verified asset-transfer cards at390/820/1440. Local correction passed1886tests, lint, build and actual-component shell tests at390/820/1440 plus short landscape, including24distinctlinks, footer hit testing, Tab and Escape. Final144 release checks and live read-only acceptance are recorded separately. Multi-asset transfer, automatic asset numbering and paid EL activation remain OFF. No SQL, employee-account or inventory/payroll/roster data changes. Production receives no UI promotion.
