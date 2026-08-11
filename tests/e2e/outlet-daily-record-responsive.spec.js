const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const viewports = [
  { width: 393, height: 852, label: "mobile" },
  { width: 820, height: 1180, label: "tablet" },
  { width: 1024, height: 768, label: "tablet landscape" },
  { width: 1440, height: 900, label: "desktop" },
];

test("outlet daily record keeps the direct-post workflow usable at every viewport", async ({ page }) => {
  test.setTimeout(120_000);
  expect(await login(page, "superAdmin")).toBe(true);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/outlet-daily-records/new", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Daily Product Lines", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Find product by name, code, or category")).toBeVisible();
    await expect(page.getByText("Review", { exact: true })).toHaveCount(0);
    for (const heading of ["Qty Sent", "Received", "Wastage"]) {
      await expect(page.locator("[data-outlet-daily-lines]").getByText(heading, { exact: true }).first()).toBeVisible();
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${viewport.label} must not horizontally overflow`).toBeLessThanOrEqual(5);

    if (viewport.width < 768) {
      const firstEditableWastage = page.locator('input[name="wastage_qty"]:not([disabled])').first();
      await firstEditableWastage.fill("1");
      const firstLine = firstEditableWastage.locator("xpath=ancestor::div[contains(@class,'grid')][1]");
      await expect(firstLine.locator('select[name="wastage_reason"]')).toHaveValue("unsold");
      await firstLine.getByRole("button", { name: /Add remarks for/ }).click();
      await expect(firstLine.locator('input[name="line_notes"]')).toBeVisible();

      // The trigger exposes an explicit aria-label while its visible label is
      // intentionally compact (“Workflow”). Use the authored accessibility
      // contract directly; Chromium’s role-name resolver can otherwise omit
      // this portal trigger when the parent is governed by a responsive
      // `md:hidden` utility.
      const workflowTrigger = page.locator('button[aria-label^="View workflow, step"]');
      await expect(workflowTrigger).toBeVisible();
      await expect(workflowTrigger).toBeEnabled();
      await expect(workflowTrigger).toContainText("Step 1 of 3");
      await expect(workflowTrigger).toContainText("Workflow");
      await workflowTrigger.click();
      const workflowSheet = page.getByRole("dialog", { name: "Workflow progress" });
      await expect(workflowSheet.getByText("Posted", { exact: true })).toBeVisible();
      await workflowSheet.getByRole("button", { name: "Close Workflow progress" }).click();

      const primary = page.getByRole("button", { name: "Confirm Qty Sent" });
      await expect(primary).toBeVisible();
      await expect(primary.locator("svg")).toHaveCount(1);
      // A document action rail owns the bottom safe-area slot on phones;
      // the shared shell hides the persistent nav to prevent two competing
      // fixed action layers.
      await expect(page.locator("[data-mobile-app-nav]")).toBeHidden();

      const actionRail = page.locator("[data-mobile-document-action]");
      await expect(actionRail).toHaveCSS("grid-template-columns", /.+ .+/);
      expect(await actionRail.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe("none");
      await expect(page.locator("[data-outlet-daily-setup] summary")).not.toContainText("Kwan Kee");
      await expect(page.locator('[data-document-workspace-header] span.hidden').filter({ hasText: /^Outlet Daily Record$/ })).toBeHidden();

      await actionRail.getByRole("button", { name: "More" }).click();
      const sheet = page.getByRole("dialog", { name: "More options" });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole("button", { name: "Post Daily Record" })).toBeVisible();
      await sheet.getByRole("button", { name: "Close More options" }).click();
      await expect(sheet).toHaveCount(0);
      await expect(primary).toBeVisible();
    } else {
      await expect(page.locator("[data-workflow-pipeline]").getByText("Posted", { exact: true })).toBeVisible();
      if (viewport.width < 1280) {
        await expect(page.locator("[data-tablet-document-split] > aside")).toHaveCSS("position", "sticky");
      }
    }

    const screenshotPath = `test-results/outlet-daily-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await test.info().attach(`outlet-daily-${viewport.label}`, {
      path: screenshotPath,
      contentType: "image/png",
    });
  }
});

test("outlet daily list keeps fixed controls left and count/action right", async ({ page }) => {
  test.setTimeout(90_000);
  expect(await login(page, "superAdmin")).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });

  const form = page.locator('form[data-unified-list-desktop="true"]');
  await expect(form).toBeVisible();
  const geometry = await form.evaluate((node) => {
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width, height: box.height };
    };
    const controls = [
      node.querySelector('input[name="date"]'),
      ...node.querySelectorAll(':scope > [data-select-control]'),
    ].filter(Boolean);
    const actionGroup = node.querySelector('.unified-list-desktop-actions');
    const action = actionGroup.querySelector('.unified-list-action');
    return {
      form: rect(node),
      controls: controls.map(rect),
      actionGroup: rect(actionGroup),
      action: rect(action),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  const widths = [...geometry.controls.map((control) => control.width), geometry.action.width];
  // Native date/Radix controls can differ by their two one-pixel borders even
  // when they share the same authored 8rem outer-width contract.
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(2);
  expect(geometry.controls.every((control) => Math.abs(control.height - geometry.action.height) <= 1)).toBe(true);
  expect(geometry.controls[0].left - geometry.form.left).toBeLessThanOrEqual(12);
  expect(geometry.actionGroup.right).toBeGreaterThan(geometry.controls.at(-1).right + 8);
  expect(geometry.form.right - geometry.actionGroup.right).toBeLessThanOrEqual(12);
  expect(geometry.overflow).toBeLessThanOrEqual(5);
});
