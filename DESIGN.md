# Wilson Stitch Design Contract

## Product UI Philosophy

Seri Bako ERP is a compact restaurant operations cockpit for procurement, inventory, production, dispatch, reporting, administration, and system control.

Wilson's Stitch screenshots in `docs/` are the UI source of truth and override older assistant-generated design direction.

The product must feel like a commercial internal ERP: fast, compact, structured, operational, and easy for restaurant managers, kitchen teams, warehouse users, and admin staff to use daily.

Do not redesign freely. Improve by consolidating, reusing, and aligning with the existing Stitch visual direction.

---

## Contract Priority

When implementing a page, apply the rules in this order:

1. Core Layout Principle
2. Page Skeletons
3. Top Navigation / Sidebar / Right Operation Console
4. Action Placement
5. Button Shape
6. Color System
7. Global Component Rules
8. Page-specific Module UX Guidelines
9. Acceptance Checklist

If a module-specific rule conflicts with a core shell rule, the core shell rule wins.

---

# Core Shell Rules

## Core Layout Principle

The application shell follows a strict 3-zone structure:

- Left = tools / functions navigation
- Center = work, data, forms, documents, tables, and operational content
- Right = actions, context, analytics, workflow, summaries, timeline, attachments, and page-specific assistance

The layout must remain stable across modules. Do not create new shell patterns per page.

---

## Page Skeletons

All pages must use one of these three skeletons only.

### A. Workspace Mode

Used for dashboards, hubs, boards, and overview pages.

Examples:

- Dashboard
- Reports
- BI Dashboard
- Settings
- Master Data
- Integrations
- Dispatch Board

Structure:

- Page title and short subtitle
- Compact metric or summary cards only when useful
- Task cards, module cards, board columns, or grouped actions
- Right console may show page metrics, recent activity, help, or contextual summaries

Avoid:

- Too many KPIs in the center
- Oversized cards
- Repeated page titles
- Decorative content with no operational value

---

### B. List Mode

Used for high-density operational records.

Examples:

- Purchase Requests
- Purchase Orders
- Goods Receiving
- Stock Balance
- Stock Count
- Stock Transfers
- Stock Wastage
- Movement Ledger
- Activity Log
- Users
- Suppliers
- Import History

Structure:

- Page title and short subtitle
- Primary create action at top-right page header only when the page has no fixed right operation console action
- Tabs when needed
- Filters above table
- Compact data grid
- Pagination below table
- Right console shows page summary, selected record summary, metrics, or contextual actions

Avoid:

- Create buttons inside table rows
- Duplicate create buttons
- Large KPI clutter above the table
- Random cards in the right console

---

### C. Document / Form Mode

Used for detail pages, edit pages, approval documents, and guided workflows.

Examples:

- Purchase Request Detail
- Purchase Order Detail
- Goods Receiving Detail
- Production Job Detail
- Company Profile
- User Detail
- Role Permissions
- Import Data Wizard
- System Preferences
- Backup & Restore

Structure:

- Center contains document, form, or work content
- Right console contains workflow actions, save actions, timeline, comments, attachments, status, and contextual help
- One primary action at a time
- Workflow actions must live only in the right console

Avoid:

- Detail-page action buttons in the center unless they are row-level utility actions
- Duplicate save buttons
- Floating panels
- Bottom action bars unless explicitly required for mobile

---

## Top Navigation

The top navigation left side is for breadcrumb navigation only.

Examples:

- Operations > Dashboard
- Procurement > Purchase Requests
- Procurement > Purchase Orders > PO-00546
- Inventory > Stock Balance
- Administration > Company Profile

The top navigation right side contains only:

- Search icon
- Notification icon
- User account pill

The topbar must not contain:

- Global create buttons
- Place order buttons
- Save buttons
- Workflow actions
- Full search bar by default
- Full profile card

Search is icon-only by default.

Clicking the search icon opens a global search / command palette.

The topbar must stay quiet and must not compete with the sidebar, page header, or right operation console.

---

## Sidebar

The sidebar is for function navigation only.

Allowed:

- Operational modules
- Procurement modules
- Inventory modules
- Analytics modules
- Administration modules
- Data management modules
- System modules
- Compact company / product identity
- Version label
- System status label

Forbidden:

- Workflow states
- Approval queues as navigation items
- Status filters
- Duplicated settings sprawl
- Dead links
- Temporary mockup-only links
- Repeated user profile display

Workflow states such as Draft, Manager Review, Admin Review, Finance Review, Approved, Returned, Rejected, Sent, Receiving, Completed, or Closed must never appear as sidebar navigation.

They belong inside tabs, filters, status badges, workflow steps, or right console summaries.

---

## Sidebar Information Architecture

Use grouped navigation. Keep the structure stable.

### Operations

- Dashboard
- Production Jobs
- Dispatch Board

### Procurement

- Purchase Requests
- Purchase Orders
- Goods Receiving
- Suppliers

### Inventory

- Stock Balance
- Stock Count
- Stock Transfers
- Stock Wastage
- Movement Ledger
- Items / SKU Master
- Batch & Expiry

### Analytics

- Reports
- BI Dashboard
- Activity Log

### Administration

- Company Profile
- Users & Roles
- Branches / Outlets
- Departments
- Approval Workflows
- Notifications

### Data Management

- Import Data
- Export Data
- Import History
- Data Templates

### System

- Settings
- Integrations
- Security
- Backup & Restore

Billing / Subscription is optional and should be hidden unless actually required.

Do not add navigation items unless the route exists or has a clearly implemented placeholder page.

---

## Sidebar Expansion Rules

Do not expand every navigation group by default.

Rules:

- Only the active section should be expanded by default.
- Dashboard should expand Operations only.
- Purchase Requests, Purchase Orders, Goods Receiving, and Suppliers should expand Procurement only.
- Stock-related pages should expand Inventory only.
- Reports, BI Dashboard, and Activity Log should expand Analytics only.
- Company Profile, Users & Roles, Branches / Outlets, Departments, Approval Workflows, and Notifications should expand Administration only.
- Import Data, Export Data, Import History, and Data Templates should expand Data Management only.
- Settings, Integrations, Security, and Backup & Restore should expand System only.
- The active page must always remain visible.
- The sidebar may remember user collapsed / expanded preference.

---

## Company Identity

Company / product identity belongs in the sidebar, not the topbar.

The sidebar identity block may include:

- Compact company logo or fallback icon
- Product name
- Product subtitle
- Version label

Recommended display:

- Product name: Seri Bako
- Subtitle: Operational ERP
- Footer version: `v0.2.xx / Sprint x.x.x`

Do not show full user profile in both the sidebar and topbar.

Company Profile page controls:

- Company logo
- Company name
- Registration number
- Tax ID / SST number
- Address
- Brand colors
- Document header assets
- Login assets
- Footer notes
- Signature / stamp assets

---

## Right Operation Console

The right console is a persistent part of the app shell.

It is fixed within the shell, full height, and internally scrollable.

Right console content must be page-relevant.

Allowed right console content:

- Workflow actions
- Save / reset actions
- Approval actions
- Page / list summaries
- Selected record summary
- Timeline
- Comments
- Attachments
- Import progress
- Validation summary
- Activity log
- Permission summary
- Help notes directly related to the current page
- Dashboard analytics rail content

Forbidden:

- Random unrelated cards
- Decorative cards
- Duplicate KPI cards already shown in center
- Duplicate buttons
- Floating panels by default
- Full user profile display

If a page has no meaningful right-console content, show a compact contextual summary or helpful empty state. Do not fill it with random content.

---

## Action Placement

List page create button:

- Top-right page header only when the page does not use a fixed right-console primary action
- Never in the global topbar

Detail page workflow actions:

- Right console only

Form save button:

- Right console preferred

Dashboard quick actions:

- Center workspace only
- Must not appear in the right analytics rail

Table row actions:

- Small icon actions only
- Must not compete with the primary page action

One primary action at a time.

Primary actions should be visually dominant. Secondary and destructive actions must be visually quieter.

Examples:

- Purchase Request Detail: Approve Request is primary, Return for Revision is secondary / destructive
- Purchase Order Detail: Send to Supplier is primary, Receive Goods is secondary until PO is sent
- Production Job Detail: Start Production is primary, Mark QC Ready is disabled until production starts
- Import Data: Continue to Mapping is primary, Cancel Import is secondary

---

## Button Shape

All buttons must use square corners.

Rules:

- Button border-radius: 0
- Applies to primary, secondary, destructive, ghost, icon, dropdown, upload, and right-console buttons
- Cards and panels may keep very small radius, maximum 4px
- Inputs may use 0px to 2px radius
- Status badges may remain pill-shaped

Do not use rounded action buttons anywhere in the app.

---

# Color System

Seri Bako ERP must use a controlled operational color system.

## Sprint 7.4 UI token and component contract

`src/app/globals.css` is the canonical runtime token source. Shared components in `src/components/ui` consume those tokens; pages must not create a parallel scale.

- Typography: one system sans stack. Page title 18px, section/card title 14px, body/control text 14px on mobile and 13px on compact desktop, metadata/labels/table headers 12px minimum.
- Spacing: use the 4, 8, 12, 16, 20, 24, and 32px scale. Page gutters are 12px on mobile and 16px from tablet upward. Panels use 12–16px padding.
- Controls: 44px high on mobile and 36px from `sm` upward. Buttons remain square; cards/panels and inputs use a 0–2px radius. Icon-only controls require an accessible label.
- Shell: 48px topbar, 236px desktop sidebar, and 340px desktop right console. Below `xl`, the same contextual console content is available through an accessible bottom drawer; it is not removed from the workflow.
- Tables: use the shared `Table` containment region. Selection, when present, is the first column. Open/view/edit is the final column and remains reachable while a comparison table scrolls.
- State: use the shared success, warning, danger, info, neutral, disabled, hover, selected, and focus tokens. Focus uses a visible 2px amber ring with offset.
- Motion: state transitions only, normally 150–250ms; reduced-motion preferences must remove non-essential animation.

## Sprint 7.5 mobile interaction contract

- Mobile action bar: expose at most one safe primary workflow action plus a separate Actions & context trigger. Never promote a destructive action into the persistent bar. Respect bottom safe-area insets and preserve content clearance.
- Mobile filters: shared list filters occupy no more than two visible rows. Search owns the first row; remaining controls use a compact horizontally scrollable second row when necessary.
- Headers: breadcrumb already supplies location context, so page headers remain compact. Descriptions may collapse on narrow screens; workflow actions remain in content or the right console.
- Tables: prioritize identifier, operational status/quantity, and the final row action on mobile. Secondary comparison fields progressively appear at `md` and `lg`; a whole page must never overflow horizontally.
- Forms: date fields and native controls use `min-width: 0`, stay within their grid column, and preserve touch targets at 320px.
- Dashboard metrics: icon and label sit together on the left, with the primary number aligned strongly to the right.
- Typography: right-console instructions, metadata, alerts, and control labels use the shared compact scale; local oversized body copy is not allowed.

## v0.2.15 pilot UI authority

Pilot operation keeps the validated Sprint 7.4–7.5 shell and responsive contracts. Historical mockups are mood references only: deep green, warm neutral surfaces, rectangular controls, restrained amber accents, and compact operational tone. They do not override current workflows, navigation, action placement, typography, density, right-console behavior, or mobile rules. Pilot preparation must not introduce one-off page structures or fabricated data.

Do not introduce random greens, browns, reds, blues, gradients, or decorative colors.

## Sprint 7.23.3 canonical List Mode

High-use operational indexes use one server-rendered structure: compact `PageHeader`, `FilterBar`, result count, semantic desktop `Table`, mobile `OperationalList`, shared `EmptyState`, pagination, and a permission-aware Right Console.

- Filters keep search first, then the most useful status and branch/supplier controls. Less-used inputs live under `FilterBarMore`. Reset is visible only when a query filter is active, and submitting a status-tab view preserves that status.
- At `xl` and above, the 236px sidebar and persistent Right Console form the desktop shell. At 1024px the sidebar becomes the existing accessible drawer so operational columns are not compressed.
- From `md` upward, dense semantic tables remain the comparison surface. Identifiers and badges do not wrap; numeric values stay right-aligned; lower-priority columns progressively hide.
- Below `md`, migrated routes use compact two-tier rows from the same server-loaded, paginated dataset. Each row exposes its identifier, status, decisive metadata, and a full-row link without horizontal scrolling.
- Empty copy distinguishes an empty dataset from a filtered result. It offers at most one authorized next action. Pagination is absent when the result count is zero.
- `--sb-muted` aliases the canonical muted surface token; pages must not invent a parallel muted color.

## Sprint 7.23.4 procurement Document and Form Mode

Procurement creation pages keep the center workspace focused on the minimum inputs needed to save a valid draft. System-generated dates and numbers are recorded without competing form controls. The PR line editor prioritizes item, quantity, and UOM; supplier and estimated cost remain secondary purchasing details and are not exposed to Kitchen users.

Draft creation and workflow submission remain separate, explicit actions. A new PR shows `Save Draft`, then the saved document exposes `Submit PR` through the existing state-aware action resolver. The UI must not imply autosave or submit an unsaved record.

Stage evidence uses the shared attachment repository:

- PO preparation identifies the AutoCount PO number and Purchase Order attachment.
- Receiving uses `Record Receiving & Attach DO`; the Delivery Order repository is visible in the mobile flow and the desktop Right Console.
- Supplier invoices expose `Attach Supplier Invoice` before Finance Review.
- Draft/pending evidence may be removed and replaced. Approved/posted evidence remains locked with correction guidance.

The Right Console remains the persistent desktop action and evidence surface. On mobile procurement documents, a compact bottom action appears only for one real current workflow task; workflow progress and Activity & files use focused disclosures, and destructive actions stay under More options. Tablet keeps a horizontal Workdesk and Inspector split. Stage-critical attachment controls remain inside their actual stage flow. File selection supports camera/photo-library behavior provided by the mobile browser, shows the chosen filename, rejects files above 10 MB, and communicates the pending upload state.

The product visual identity is:

- Deep green operational sidebar
- Warm off-white workspace
- Amber / brown action accent
- Muted gray-green secondary text
- Thin neutral borders
- Soft red only for alerts and danger states
- Soft green only for success and healthy states
- Soft amber only for warning and pending states
- Soft blue only for informational or receiving states

---

## Core Brand Colors

Use these tokens as the default palette:

```css
:root {
  /* Brand / Shell */
  --sb-green-950: #062C1F;
  --sb-green-900: #083B2A;
  --sb-green-800: #0B4A35;
  --sb-green-700: #0F5A42;

  /* Accent */
  --sb-amber-700: #8A5A2B;
  --sb-amber-600: #A16A32;
  --sb-amber-300: #F2C58D;
  --sb-amber-100: #FFE3BF;

  /* Workspace */
  --sb-bg: #F7F5F0;
  --sb-surface: #FFFFFF;
  --sb-surface-muted: #F1EFE9;
  --sb-border: #D8D4C8;
  --sb-border-soft: #E7E2D8;

  /* Text */
  --sb-text: #102019;
  --sb-text-muted: #66756D;
  --sb-text-soft: #8A948E;
  --sb-text-inverse: #FFFFFF;

  /* Status */
  --sb-success: #0F6B3F;
  --sb-success-bg: #E6F4EC;

  --sb-warning: #9A5B13;
  --sb-warning-bg: #FFF1D9;

  --sb-danger: #B42318;
  --sb-danger-bg: #FDE8E8;

  --sb-info: #245A9C;
  --sb-info-bg: #E8F1FF;

  --sb-neutral-bg: #EEECE6;
  --sb-neutral-text: #5E665F;
}


Rules:

Do not use bright emerald or neon green.
Active menu item must use warm amber, not random green.
Sidebar text should be muted white, not pure gray.
Sidebar section dividers should be subtle.
