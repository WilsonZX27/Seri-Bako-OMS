# Asset density repair, 16 October 2026

Addresses owner annotations 1–30. No migration or data mutation is required.

Removed duplicate location title, instructional paragraphs, redundant repair location, repeated detail badges and the floating full-history link. Location checks use one row per location without a progress bar. General repair moves ahead of inspection with an independent submit. Inspection restores explicit result buttons behind a compact status disclosure and preserves exception values during bulk selection. Shared maintenance lists use the same component in overview and maintenance. Summary metrics use four columns with semantic state tint. The detail header uses an asset arrow link and keeps original metadata under Request details. Update input starts at two rows. Saved state and stable form identity prevent repeated updates.

System-wide source scan found 36 padded disclosure references; shared surface geometry now removes closed vertical padding and makes closed cards 44px including borders. Workspace navigation is 44px overall. Existing desktop controls remain 36px; phone controls stay at least 44px. Full forms and expanded cards grow with content.

Isolated fixture uses actual repository components with synthetic data and exact mocked server actions. At 1440px: split widths 560/840, equal stack heights 432px, navigation44px, history44px, attachments44px, no horizontal overflow. At430px: navigation44px, collapsed inspection rows77px, no horizontal overflow. Bulk selection retained the existing Damaged result/note and reported12/12 checked with1 exception. Saved mock update showed a disabled Saved button and Update saved status. Dirty-navigation confirmation buttons measured178px each. These interactions do not write to Production.

The general repair form rendered without a location label; its Send request and Close actions measured186px each and its form had no inspection submission key. The17-location phone list measured44px per row without horizontal overflow. TypeScript, ESLint, optimized build and the full1,637-test suite passed before release.
