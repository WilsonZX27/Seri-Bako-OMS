# Acceptance and open decisions

Updated 2026-11-02. Scope: changes covered by [index](README.md). Source: user's 2026-11-02 requirements and project handoff. This is a checklist, not a claim that any cell has passed.

For each affected feature record: requirement/source; revision and environment; actual role and authorized company/branch; date and representative real business state; expected and actual result; screenshot or safe evidence reference; failure owner and follow-up. Protect sensitive data in artifacts. Test expected denials, read-after-save, draft/reload and error recovery where applicable. Use isolated fixtures for risky writes and authorized read-only checks of real business records; identify which evidence is synthetic. For affected features, real-data read-only checks and applicable actual role/scope comparisons are required when access is available; synthetic tests do not replace them. If access is unavailable, record the exact missing role, data, environment and blocked comparison as pending. Never treat Owner-only access, a mock, successful build or deployment as actual-user acceptance.

- [ ] Product catalogue versus Daily: item-by-item set differences, status, date boundaries, season conflicts and historical lines across applicable real roles.
- [ ] Planning: both kitchens, product-by-product membership and reason for differences, scope, dates, draft/save/readback and Planning quantities.
- [ ] Attendance and roster: staff/outlet mapping, raw punch preservation, multiple/missing punches, scoped approval paths and actual authorized roles.
- [ ] Asset: import provenance, maintenance and checklist, batch transfer, AT identity and old notes; test applicable permissions and denial.
- [ ] Inventory: stock count, new items, recovery and KG conversion with correct units and persisted values.
- [ ] Purchasing: low-stock basket → PR, supplier state, AutoCount and relevant PR history, by role.
- [ ] Payroll: actual available payslip values, Excel/PDF and role permissions.
- [ ] Settings: warehouse, company initialization, Daily reconciliation and inline import.
- [ ] UI and cross-module: real screenshots against requirements at desktop/tablet/phone, accessibility, loading/empty/error states, numbers and performance using measured evidence.

Open decisions: exact season-flag/date conflict resolution; treatment of blank historical Daily rows; whether each kitchen product difference has an authorized business reason; complete role/scope matrix and actual account availability; Daily Ready-to-post versus direct Posted workflow scope and decision. Capture decision source and date before converting any of these into a definitive rule.

Each result must explicitly distinguish code changed / local test / authenticated Preview / Production / actual user acceptance. A result missing evidence is pending, not passed.
