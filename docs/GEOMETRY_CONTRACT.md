# Seri Bako OMS Geometry Contract

This contract is the single source of truth for panel geometry across the OMS.

## Radius tokens

- `--sb-shell-radius: 0`: viewport shells, edge-to-edge layouts, sticky rails, and bottom navigation.
- `--sb-panel-radius: 8px`: content panels, summary surfaces, list cards, and workspace sections.
- `--sb-radius-control: 4px`: inputs, selects, buttons, filter controls, and compact action groups.
- `9999px`: status badges and circular icon buttons only.

## Rules

1. A route must not introduce a new radius value in page-level classes.
2. A card must not contain another card solely to create visual separation; use a divider or section header instead.
3. Edge-to-edge shells stay square even when their interior panels are rounded.
4. Responsive breakpoints may change layout density, but never change the radius tokens.
5. Legacy utility classes must resolve to these tokens during migration rather than creating a second geometry language.

## Review checklist

- Check desktop, tablet, and phone at the same route.
- Check panel, control, badge, and shell separately.
- Check that no pseudo-element adds an icon already rendered by the component.
- Check that a fixed mobile action rail overlays bottom navigation instead of stacking with it.
