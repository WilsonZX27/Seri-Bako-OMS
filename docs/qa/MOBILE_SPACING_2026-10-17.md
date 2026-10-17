# Mobile date and workspace spacing

Shared date query rows cap the date wrapper at 200px, reserve 44px for Filter, and maintain an 8px grid gap. On 320px, the date shrinks to preserve the filter and count. The actual DateInput wrapper is targeted, not its hidden native input. All mobile Filter buttons retain 44px width, including the stacked 320px search layout.

Workspace tabs use 44px controls inside a 54px card, with 4px inner padding plus border (measured 5px top/bottom inset). Horizontal scrolling remains intentional for long navigation sets.

Local synthetic Playwright checks at 320/390/430/1440: no root overflow; nav54/tab44/top5/bottom5; phone filter44; date-to-filter gap8. Typecheck passed; 1,637 regression tests passed before the final CSS minimum-width addition, which was then verified in the browser at all four widths. No production writes or deployment. Gemini batch contains six current synthetic screenshots, not production data.
