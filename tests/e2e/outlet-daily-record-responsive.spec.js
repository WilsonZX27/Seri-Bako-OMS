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
    await expect(page.getByPlaceholder("Find product")).toBeVisible();
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
      await expect(workflowTrigger).toHaveAttribute("aria-label", "View workflow, step 1 of 3");
      await workflowTrigger.click();
      const workflowSheet = page.getByRole("dialog", { name: "Workflow progress" });
      await expect(workflowSheet.getByText("Posted", { exact: true })).toBeVisible();
      await workflowSheet.getByRole("button", { name: "Close Workflow progress" }).click();

      const actionRail = page.locator("[data-mobile-document-action]");
      const primary = actionRail.locator("button").first();
      await expect(primary).toBeVisible();
      await expect(primary.locator("svg")).toHaveCount(1);
      // A document action rail owns the bottom safe-area slot on phones;
      // the shared shell hides the persistent nav to prevent two competing
      // fixed action layers.
      await expect(page.locator("[data-mobile-app-nav]")).toBeHidden();

      await expect(actionRail).toHaveCSS("grid-template-columns", /.+ .+/);
      expect(await actionRail.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe("none");
      await expect(page.locator("[data-record-setup-location]")).not.toBeEmpty();
      await expect(page.locator("[data-record-setup-date]")).toContainText(/\d{4}-\d{2}-\d{2}|Select date/);
      const mobileContext = page.locator("[data-document-context-summary]");
      await expect(mobileContext).toContainText("Draft");
      await expect(mobileContext).not.toContainText(/Kwan Kee|\d{4}-\d{2}-\d{2}/);
      await expect(page.locator('[data-document-workspace-header] span.hidden').filter({ hasText: /^Outlet Daily Record$/ })).toBeHidden();

      await actionRail.getByRole("button", { name: "More" }).click();
      const sheet = page.getByRole("dialog", { name: "More options" });
      await expect(sheet).toBeVisible();
      expect(await sheet.getByRole("button").count()).toBeGreaterThan(1);
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

  const selectWidths = geometry.controls.slice(1).map((control) => control.width);
  // The date owns the flexible search corridor; the two categorical selects
  // retain the same compact width and Search remains a content-sized command.
  expect(geometry.controls[0].width).toBeGreaterThan(selectWidths[0] * 2);
  expect(Math.max(...selectWidths) - Math.min(...selectWidths)).toBeLessThanOrEqual(2);
  expect(geometry.action.width).toBeGreaterThanOrEqual(60);
  expect(geometry.controls.every((control) => Math.abs(control.height - geometry.action.height) <= 1)).toBe(true);
  expect(geometry.controls[0].left - geometry.form.left).toBeLessThanOrEqual(12);
  expect(geometry.actionGroup.right).toBeGreaterThan(geometry.controls.at(-1).right + 8);
  expect(geometry.form.right - geometry.actionGroup.right).toBeLessThanOrEqual(12);
  expect(geometry.overflow).toBeLessThanOrEqual(5);
});

test("outlet daily mobile matrix cannot widen the page or collapse the date filter", async ({ page }) => {
  test.setTimeout(90_000);
  expect(await login(page, "superAdmin")).toBe(true);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });

  const matrix = page.locator("[data-outlet-completion-matrix]");
  const scrollport = page.locator("[data-outlet-completion-scrollport]");
  const mobileOrdering = await page.evaluate(() => {
    const primary = document.querySelector("[data-outlet-daily-primary]")?.getBoundingClientRect();
    const insights = document.querySelector("[data-outlet-daily-insights]")?.getBoundingClientRect();
    const records = document.querySelector("[data-outlet-daily-record-list]")?.getBoundingClientRect();
    return { primaryTop: primary?.top ?? 0, insightsTop: insights?.top ?? 0, recordsTop: records?.top ?? 0 };
  });
  expect(mobileOrdering.primaryTop).toBeLessThan(mobileOrdering.insightsTop);
  expect(mobileOrdering.recordsTop).toBeLessThan(mobileOrdering.insightsTop);
  await expect(matrix).toBeVisible();
  const createAction = page.getByRole("link", { name: "New Daily Record" });
  await expect(createAction).toBeVisible();
  await expect(page.locator("[data-mobile-create-fab]")).toHaveCount(1);
  await expect(page.locator(".unified-list-end-action")).toHaveCount(0);

  await page.getByRole("button", { name: "Filter" }).click();
  const filterDialog = page.getByRole("dialog", { name: "Filters" });
  const dateControl = filterDialog.getByRole("textbox", { name: "Record date" });
  await expect(dateControl).toBeVisible();
  expect((await dateControl.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(96);
  await filterDialog.getByRole("button", { name: "Close filters" }).click();

  const initial = await page.evaluate(() => ({
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    pageScrollX: window.scrollX,
  }));
  expect(initial.pageOverflow).toBeLessThanOrEqual(5);
  expect(initial.pageScrollX).toBe(0);

  const toolbarGeometry = await page.locator("form.unified-list-header").evaluate((toolbar) => ({
    hasLegacyEndAction: Boolean(toolbar.querySelector(".unified-list-end-action")),
    toolbarPosition: getComputedStyle(toolbar).position,
  }));
  expect(toolbarGeometry.hasLegacyEndAction).toBe(false);
  expect(toolbarGeometry.toolbarPosition).not.toBe("fixed");
  expect(await page.locator("[data-mobile-create-fab]").evaluate((node) => getComputedStyle(node).position)).toBe("fixed");

  await scrollport.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
  const afterMatrixScroll = await page.evaluate(() => ({
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    pageScrollX: window.scrollX,
  }));
  expect(afterMatrixScroll.pageOverflow).toBeLessThanOrEqual(5);
  expect(afterMatrixScroll.pageScrollX).toBe(0);
});
