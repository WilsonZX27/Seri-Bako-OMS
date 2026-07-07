---
name: "Seri Bako OMS"
description: "A compact restaurant ERP operations cockpit for Seri Bako Malaysia."
colors:
  deep-green: "#0F3D2E"
  deep-green-dark: "#0B2F23"
  warm-gold: "#D99A2B"
  active-orange: "#C66A1F"
  sidebar-navy: "#172332"
  app-background: "#F7F5EF"
  surface: "#FFFFFF"
  muted-surface: "#EEF3EF"
  danger: "#B91C1C"
  success: "#15803D"
  in-progress: "#2563EB"
  text-strong: "#111827"
  text-muted: "#6B7280"
  border-subtle: "#E5E7EB"
  status-draft-bg: "#F3F4F6"
  status-draft-text: "#1F2937"
  status-review-bg: "#FEF3C7"
  status-review-text: "#92400E"
  status-success-bg: "#D1FAE5"
  status-success-text: "#065F46"
  status-danger-bg: "#FEE2E2"
  status-danger-text: "#991B1B"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.04em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.02em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.deep-green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  status-review:
    backgroundColor: "{colors.status-review-bg}"
    textColor: "{colors.status-review-text}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Seri Bako OMS

## Overview

**Creative North Star: "The Operations Ledger"**

Seri Bako OMS is a compact restaurant ERP operations cockpit. It should feel precise, warm, and trustworthy: a place where kitchen, outlet, procurement, finance, inventory, dispatch, and management users can see the current work, take the next allowed action, and trust the audit trail.

The system uses a full-height dark navy/charcoal sidebar, warm beige app canvas, white card surfaces, compact typography, subtle borders, minimal shadow, and restrained Seri Bako accents. Color communicates status, selection, urgency, or ownership of a workflow. It does not decorate.

**Key Characteristics:**

- Branch-first workflows with location accuracy handled internally.
- Clean tables and document pages that make records feel official.
- Direct functional sidebar navigation, compact metrics, and one main action per page.
- Right context rails reserved for status, actions, assignment, timeline, alerts, shortcuts, and secondary context.
- Friendly empty, loading, success, and error states instead of raw system output.
- Three page skeletons only: Workspace Mode, List Mode, and Document/Form Mode.

## Colors

The palette is mature and operational: dark navy for the shell, warm beige for the canvas, white for work surfaces, warm orange/brown for active accents, muted green for success, muted amber for review, muted red for critical states, and muted blue/purple for in-progress production.

### Primary

- **Deep Seri Bako Green**: primary actions, active navigation, strong focus, and official workflow emphasis.
- **Deep Green Dark**: sidebar depth, high-contrast buttons, and selected dark states.
- **Sidebar Navy**: full-height global navigation and durable shell chrome.
- **Active Orange**: active sidebar indicators, warm count badges, and selected operational accents.

### Secondary

- **Warm Gold**: purchasing attention, warnings, ordering context, and count badges.
- **Muted Blue**: in-progress, production, and neutral informational state.

### Neutral

- **Rice Paper Background**: the app canvas for authenticated surfaces.
- **White Surface**: cards, dialogs, tables, forms, and document panels.
- **Soft Sage Muted Surface**: quiet secondary grouping only.
- **Strong Ink**: titles, table values, document numbers, and primary labels.
- **Muted Gray**: helper text, metadata, secondary labels, timestamps, and inactive nav.
- **Subtle Border**: table rows, cards, inputs, and separators.

### Named Rules

**The Status-Only Color Rule.** Deep green, orange, warm gold, red, blue, and purple accents are for state, hierarchy, and orientation only. Full-card color fills are prohibited unless the card itself represents status.

**The White Surface Rule.** Most cards, dialogs, tables, and document panels stay white. Icons, badges, pills, and fine borders carry the accent.

**The No Startup Gradient Rule.** Purple/blue gradients, glassmorphism, crypto-dashboard color, and decorative saturation are forbidden.

## Typography

**Display Font:** system-ui, Segoe UI, sans-serif  
**Body Font:** system-ui, Segoe UI, sans-serif  
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace

**Character:** The type system is compact, professional, and built for data. It should support fast scanning without feeling like a raw database admin panel.

### Hierarchy

- **Display** (700, 1.25rem, 1.2): page titles, never above roughly 20px.
- **Headline** (700, 0.875-1rem, 1.3): section titles and major card groups.
- **Title** (700, 0.8125-0.9375rem, 1.35): card titles, table panel titles, and dialog headings.
- **Body** (400, 0.75rem, 1.4): descriptions, form text, table body content, and operational copy.
- **Label** (600, 0.6875-0.75rem, 0.04em): metadata labels, filters, field labels, and small status captions.
- **Mono** (600, 0.75rem, 0.02em): document numbers, stock references, timestamps, and IDs.
- **Metric** (700, 1.25-1.75rem, 1.1): operational numbers only.

### Named Rules

**The Compact Type Rule.** Body, table, and form text stays around 12px. Secondary text stays around 11-12px. Large empty vertical spacing is prohibited.

**The Document Number Rule.** PR, PO, GRN, stock, and production record numbers should be visually distinct with mono styling and stronger hierarchy than ordinary labels.

## Elevation

Seri Bako OMS uses tonal layering, borders, and very soft shadows. Surfaces should feel separated, not floating. Heavy shadows, glass effects, and dramatic depth are forbidden.

### Shadow Vocabulary

- **Card Rest** (`0 1px 2px rgba(15, 23, 42, 0.04)`): quiet cards and table containers.
- **Card Hover** (`0 8px 24px rgba(15, 23, 42, 0.08)`): clickable cards, row affordances, and action surfaces.
- **Overlay** (`0 18px 48px rgba(15, 23, 42, 0.16)`): dialogs, dropdowns, and popovers only.

### Named Rules

**The Flat-At-Rest Rule.** Most surfaces are flat at rest. Shadows appear only to clarify interaction, layering, or overlay state.

## Components

### Buttons

- **Shape:** compact rounded rectangle (8px radius).
- **Primary:** deep green background, white text, short label, optional leading icon, and one primary action per page region.
- **Hover / Focus:** slightly darker background, visible focus ring, no motion beyond 150-250 ms state feedback.
- **Secondary:** white or neutral surface with subtle border and strong text.
- **Destructive:** red only inside confirmation flows or clear destructive contexts.

### App Shell

- **Left Sidebar:** full-height dark navy/charcoal global navigation grouped by Operations, Procurement, Inventory, Master Data, Analytics, and Settings.
- **Top Navigation:** breadcrumb, global search, notifications, and page primary action.
- **Center Workspace:** the only independently scrolling main work area.
- **Right Context Rail:** contextual support for the current page, not navigation; it may contain status, actions, assignment, timeline, alerts, shortcuts, or selected-row summary.

### Page Skeletons

- **Workspace Mode:** dashboard and module overviews. Quick insights at top, task/workflow cards below, optional right context rail.
- **List Mode:** operational records. High-density table, search, filters, status badges, row actions, and optional right rail for selected-row summary or page metrics.
- **Document/Form Mode:** create, edit, detail, and review pages. About 70% main content and 30% right context rail. On smaller screens, the rail collapses below or into a drawer.

### Chips

- **Style:** compact pill or rounded badge with readable contrast.
- **State:** active filter chips use deep green or active orange; review/pending chips use amber; success/available/completed chips use green; rejected/cancelled/critical/short chips use red; in-progress/production chips use muted blue or purple.
- **Required statuses:** Draft, Submitted, Pending, Approved, Manager Review, Admin Review, Finance Review, Ready to Convert, Converted to PO, Sent to Supplier, In Production, QC Review, Dispatched, Cancelled, Rejected, Short, Available, Critical, Need Repair, Completed, Active, Inactive, Suspended.

### Cards / Containers

- **Corner Style:** softly rounded (8-12px).
- **Background:** white by default, with subtle neutral grouping only when needed.
- **Shadow Strategy:** quiet border first, soft shadow second.
- **Border:** one-pixel neutral border for cards, tables, panels, and dialogs.
- **Internal Padding:** compact for lists and metrics; generous for forms and document panels.

### Inputs / Fields

- **Style:** white background, subtle neutral border, 8px radius, compact height.
- **Focus:** deep green border or ring with visible contrast.
- **Error / Disabled:** friendly message text, red error border only when actionable, and disabled fields that stay readable.

### Tables

- **Style:** high-density but readable, subtle header background, compact row height, hover state, and no oversized action columns on desktop.
- **Behavior:** rows can open records when appropriate; empty states explain what happens next.

### Navigation

- **Style:** direct functional navigation with simple icons, clear active state, compact count badges, and no duplicate hidden destinations.
- **Master Data Boundary:** Items, Suppliers, Recipes / BOM, UOM Conversions, Branches, Locations, and Document Sequences appear under Master Data, not duplicated in Inventory or Settings.
- **Footer:** version and sprint text only, kept small and subtle.

### Workflow and Timeline

- **Workflow:** completed steps are soft green, current step is dark outlined or emphasized, future steps are neutral, rejected states are soft red. Procurement follows Kitchen submit PR -> Manager Review -> Admin Review -> Finance Review -> Ready to Convert -> Converted to PO -> Sent to Supplier.
- **Timeline:** meaningful events only, with operator identity, role where available, timestamp, and compact language.

## Do's and Don'ts

### Do:

- **Do** keep workspace and hub pages clean, sparse, and easy to scan.
- **Do** use only Workspace Mode, List Mode, and Document/Form Mode.
- **Do** use deep green for primary action and selection, not broad decoration.
- **Do** show only valid role-based actions while keeping document workflow visible to logged-in users.
- **Do** use status badges with strong readable contrast.
- **Do** keep right rails for actions, attachments, timeline, revision history, and secondary context.
- **Do** show friendly loading, success, empty, and error states for all mutations.
- **Do** treat tables as serious work surfaces with compact filters and readable rows.
- **Do** keep forms compact and avoid stretched right rails at 90%, 100%, and 110% zoom.

### Don't:

- **Don't** make Seri Bako OMS feel like a generic colorful admin template.
- **Don't** create decorative SaaS landing-page sections inside the authenticated app.
- **Don't** use purple/blue gradients, glassmorphism, crypto-dashboard styling, or random bright colors.
- **Don't** show dense raw database panels, raw snake_case labels, or raw Supabase errors.
- **Don't** duplicate the same function entry point on the same page.
- **Don't** duplicate Master Data links inside Inventory or Settings.
- **Don't** use oversized hub cards, huge page titles, giant explanatory text, or random pastel panels.
- **Don't** hide workflow content below the fold or render target pages inside landing pages.
- **Don't** show actions that a role cannot perform and then fail after click.
- **Don't** turn staff status into a casual dropdown; status changes are intentional actions.
