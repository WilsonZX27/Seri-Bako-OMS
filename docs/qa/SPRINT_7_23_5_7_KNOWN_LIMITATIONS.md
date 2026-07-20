# Sprint 7.23.5.7 Known Limitations

1. Native browser date-picker popups are rendered by the browser or operating system. The app standardizes the date input field, focus treatment, size, and containment, but cannot guarantee the popup chrome matches Radix select menus.
2. Release verification is local and uses configured non-Production accounts. It does not establish the current Production migration ceiling or validate Production data.
3. State-transition tests require disposable or rollback fixtures. When a safe fixture is unavailable, the gate verifies the permitted action state without submitting the mutation.
4. Migrations 071–075 remain forward-only. Remote application status must be checked explicitly before deployment; this sprint does not apply or amend them remotely.
5. Jack and Ashley’s role correction is a separate controlled data change. It is documented but not executed by this sprint.
6. Screenshot, trace, and browser-report artifacts are intentionally ignored and remain outside Git. Only the sanitized matrix and checklists are committed.
7. The expanded 17-route operational-list Playwright sweep became inconclusive when the configured backend returned `fetch failed` during a fresh Production-build login. Earlier six-role, focused route, document, permission, and responsive checks passed; the failed external fetch must be rerun before Production authorization.
