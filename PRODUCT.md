# Product

## Register

product

## Users

Seri Bako OMS serves restaurant owners, management, kitchen supervisors, outlet supervisors, procurement/admin staff, finance users, inventory staff, dispatch/fulfillment users, and system owners. They use it during daily operations to manage production jobs, outlet requests, procurement, stock, suppliers, recipes/BOM, purchase requests, purchase orders, invoices, dispatch, staff permissions, and activity tracking.

Users are often busy and multitasking. They need fast branch-first workflows, reliable role-based access, clear pending actions, visible numbers, and screens that can be scanned during kitchen, outlet, office, and dispatch operations.

## Product Purpose

Seri Bako OMS is an internal restaurant operations system for Seri Bako Malaysia Sdn. Bhd. It connects production, outlet requests, dispatch, procurement, inventory, invoices, recipes/BOM, master data, staff permissions, settings, activity tracking, and reporting into one auditable ERP workflow.

Success means staff can record daily work quickly, managers can approve only the right actions, admins can maintain foundation data safely, finance can review the right records, and every document eventually links to the previous and next operational record.

## Information Architecture

The product uses direct functional navigation. The sidebar should not force users through category landing pages before reaching daily work.

Primary navigation follows Wilson's Stitch contract: the left sidebar is function/tools navigation only, the center workspace is for work/data/document content, and the right sidebar is the contextual action console.

Primary sidebar entries:

- Operations: Dashboard, Production Jobs, Dispatch Board.
- Procurement: Purchase Requests, Purchase Orders, Goods Receiving, Suppliers.
- Inventory: Stock Balance, Stock Count, Stock Transfers, Stock Wastage, Movement Ledger, Items / SKU Master, Batch & Expiry when a real route exists.
- Analytics: Reports, BI Dashboard, Activity Log.
- Administration: Company Profile, Users & Roles.

Workflow states such as Manager Review, Admin Review, Finance Review, Ready to Convert, Converted to PO, and Supplier Sending are statuses or filters. They are not sidebar destinations.

## Core Workflows

The procurement workflow follows Seri Bako's real process:

Kitchen submit PR -> Manager Review -> Admin Review -> Finance Review -> Ready to Convert -> Converted to PO -> Sent to Supplier.

Document workflows should remain visible to logged-in users, while action buttons remain permission-gated.

## Permission Model

Staff can have a primary role plus additional function-level permissions. The product must support multi-functional responsibility instead of forcing one rigid role.

Examples:

- A manager can create PRs and approve manager-review PRs.
- An admin can also perform purchasing tasks.
- A finance user can view finance and also perform purchasing tasks when granted.

Staff management should support primary role, branch access, function-level permission checklist, multi-functional responsibilities, and a clear permission summary in the right rail.

Staff status is controlled by intentional actions, not a normal editable dropdown: Deactivate Staff, Suspend Login, Reactivate Staff, Send Invitation, Reset Temporary Password, and Force Password Change.

## Brand Personality

Seri Bako OMS should feel serious, operational, premium but quiet, warm, trustworthy, fast, and practical. It is a compact restaurant ERP operations cockpit: calm enough for repeated daily use, structured enough for audit, and approachable enough for kitchen, outlet, procurement, finance, and dispatch teams.

The product should feel like mature enterprise SaaS, not a marketing site. It should help users know what happened, what is pending, and what they can do next.

## Anti-references

Do not make Seri Bako OMS feel like a generic admin template, playful dashboard, crypto dashboard, purple SaaS startup, glassmorphism app, oversized Notion-like card system, landing page, consumer app, heavy enterprise system with too much chrome, or disconnected collection of standalone tools.

Avoid duplicated Master Data links, dead sidebar links, category-only navigation, oversized hub cards, huge page titles, bright random palettes, purple/blue gradients, giant explanatory blocks, hidden workflow content below the fold, fragile right rails, raw snake_case labels, role models that prevent dual responsibilities, and actions that appear available but fail after click.

## Design Principles

- Workflow first: each page should expose document status, next valid actions, and linked records.
- Branch first, location safe: daily users choose branches while location accuracy remains automatic internally.
- Direct access over category wandering: common operations should be reachable from the sidebar and clear list pages.
- Scan before read: metrics, status badges, tables, and right rails should reveal urgency quickly.
- Permission aware: users should see actions they can perform, while server checks remain authoritative.
- Flexible responsibility: primary role and function-level permissions must support real staff overlap.
- Audit friendly: documents, stock movements, attachments, approvals, and timeline entries should preserve who did what and when.
- No fake confidence: show safe empty states and friendly errors instead of mock values or raw database failures.

## Accessibility & Inclusion

Target WCAG AA contrast, keyboard-accessible controls, visible focus states, readable compact tables, clear loading feedback, and status indicators that do not rely on color alone. Text should not overflow buttons, badges, cards, nav items, or table cells when labels become longer in English or Malay.
