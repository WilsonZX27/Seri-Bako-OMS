# Wilson Stitch Design Contract

## Product UI Philosophy

Seri Bako OMS is a compact restaurant ERP cockpit. Wilson's Stitch screenshots in `docs/` are the UI source of truth and override older assistant-generated design direction.

## Core Layout

Left = tools/functions navigation.
Center = work/data/document content.
Right = actions/context.

## Topbar

Search, notification, and compact account icon only. Do not use the topbar as a profile display area.

## Sidebar

Function navigation only. No workflow states, no status queues, no duplicated settings sprawl, and no dead links.

## Right Operation Console

All detail-page actions live here. Page/list summaries live here when contextual. The console is fixed within the app shell, full height, and internally scrollable.

## Action Placement

List page create button: top-right page header only.
Detail page workflow actions: right console only.
One primary action at a time.

## Density

Use compact ERP density: 12px body text, compact cards, compact table rows, small controls, and no excessive scroll or bottom whitespace.

## Forbidden Patterns

- Floating panels by default.
- Duplicate profile display.
- Workflow states in sidebar navigation.
- Oversized cards.
- Repeated titles.
- Duplicate buttons.
- Center KPI clutter.
- Random right rail cards.
