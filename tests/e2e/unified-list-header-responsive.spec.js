const fs = require("node:fs/promises");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const artifactDir = path.join(process.cwd(), "artifacts", "ui-responsive-audit");
const listRoutes = [
  ["purchase-requests", "/purchase-requests", "Purchase Requests"],
  ["purchase-orders", "/purchase-orders", "Purchase Orders"],
  ["goods-receivings", "/goods-receivings", "Goods Receiving"],
  ["stock-balance", "/stock-balance", "Stock Balance"],
  ["stock-counts", "/stock-counts", "Stock Counts"],
];
const representativeWidths = [390, 820, 1279, 1280, 1440];

test("shared list toolbar geometry remains aligned across consuming routes and breakpoint edges", async ({ page }) => {
  test.setTimeout(180_000);
  await fs.mkdir(artifactDir, { recursive: true });

  for (const width of [...representativeWidths, 767, 768]) {
    const routes = width === 767 || width === 768
      ? [["goods-receivings", "/goods-receivings", "Goods Receiving"]]
      : listRoutes;

    for (const [name, route] of routes) {
      await test.step(`${route} at ${width}px`, async () => {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("main")).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

        if (width <= 1279) {
          const toolbar = page.locator('form[data-shared-search-row]:visible').first();
          await expect(toolbar).toBeVisible();
          const geometry = await toolbar.evaluate((form) => {
            const row = form.firstElementChild;
            const children = Array.from(row.children).filter((element) => element.getBoundingClientRect().width > 0);
            return {
              grid: getComputedStyle(row).gridTemplateColumns,
              gap: Number.parseFloat(getComputedStyle(row).columnGap),
              children: children.map((element) => {
                const rect = element.getBoundingClientRect();
                return { tag: element.tagName, label: element.getAttribute("aria-label"), x: rect.x, width: rect.width, height: rect.height };
              }),
              search: form.querySelector("[data-search-control]")?.getBoundingClientRect().height ?? null,
              searchWidth: form.querySelector("[data-search-control]")?.getBoundingClientRect().width ?? null,
            };
          });
          const buttons = geometry.children.filter((child) => child.tag === "BUTTON");
          expect(buttons.length, `${route} ${width}px toolbar buttons`).toBeGreaterThanOrEqual(2);
          expect(buttons.every((button) => button.width === 44 && button.height === 44), `${route} ${width}px controls: ${JSON.stringify(geometry)}`).toBe(true);
          const tracks = geometry.grid.match(/[\d.]+px/g)?.map(Number.parseFloat) ?? [];
          expect(tracks.length, `${route} ${width}px grid tracks: ${geometry.grid}`).toBe(4);
          expect(tracks.slice(1), `${route} ${width}px action/result tracks`).toEqual([44, 44, 44]);
          expect(geometry.search, `${route} ${width}px search height`).toBe(44);
          expect(geometry.gap, `${route} ${width}px grid gap`).toBe(8);
          if (width >= 768) {
            expect(geometry.searchWidth, `${route} ${width}px capped search width`).toBeLessThanOrEqual(360);
          }
          // Search may be capped at 360px inside a wider first grid track. Check the
          // action group spacing separately so that intentional remaining space is
          // not mistaken for a control gap.
          const actionItems = geometry.children.slice(-3);
          const actionGaps = actionItems.slice(1).map((child, index) => child.x - (actionItems[index].x + actionItems[index].width));
          expect(actionGaps.every((gap) => Math.abs(gap - 8) < 0.5), `${route} ${width}px action gaps: ${JSON.stringify(geometry)}`).toBe(true);

          if (width === 390 || width === 820) {
            const filterTrigger = toolbar.getByRole("button", { name: /^Filter/ });
            await expect(filterTrigger).toBeEnabled();
            await filterTrigger.click();
            const dialog = page.getByRole("dialog", { name: "Filters" });
            await expect(dialog).toBeVisible();
            const dialogRect = await dialog.boundingBox();
            expect(dialogRect && dialogRect.x >= 0 && dialogRect.y >= 0 && dialogRect.x + dialogRect.width <= width && dialogRect.y + dialogRect.height <= (width < 768 ? 844 : 900)).toBe(true);
            await expect(dialog.getByRole("link", { name: "Reset" })).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(dialog).toBeHidden();
            await filterTrigger.click();
            await dialog.getByRole("button", { name: "Close filters" }).click();
            await expect(dialog).toBeHidden();
          }
        } else {
          const toolbar = page.locator('form[data-unified-list-desktop]:visible').first();
          await expect(toolbar).toBeVisible();
        }

        if (name === "stock-counts") {
          const varianceTabs = page.getByRole("tablist", { name: "Stock count variance view" }).getByRole("tab");
          await expect(varianceTabs).toHaveCount(3);
          for (const tab of await varianceTabs.all()) {
            const expectedTabHeight = width <= 1023 ? 44 : 36;
            expect((await tab.boundingBox())?.height, `${width}px Stock Count variance tab`).toBe(expectedTabHeight);
          }
        }

        if (representativeWidths.includes(width)) {
          await page.screenshot({ path: path.join(artifactDir, `${name}-${width}.png`), animations: "disabled" });
        }
      });
    }
  }

  for (const width of [390, 820, 1440]) {
    await test.step(`/dashboard at ${width}px`, async () => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: path.join(artifactDir, `dashboard-${width}.png`), animations: "disabled" });
    });
  }
});

test("daily insights keeps one visible labeled Filter rule on phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/outlet-daily-records/insights", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const toolbar = page.locator("form.sb-daily-insights-filters:visible").first();
  const filter = toolbar.getByRole("button", { name: "Filter" });
  await expect(filter).toBeVisible();
  const geometry = await filter.evaluate((button) => {
    const label = button.querySelector(".unified-list-filter-label");
    const rect = button.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      labelDisplay: label ? getComputedStyle(label).display : null,
      labelWidth: label?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(geometry.height).toBe(44);
  expect(geometry.width).toBeGreaterThanOrEqual(76);
  expect(geometry.labelDisplay).not.toBe("none");
  expect(geometry.labelWidth).toBeGreaterThan(0);
  await filter.click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.screenshot({ path: path.join(artifactDir, "outlet-daily-insights-390.png"), animations: "disabled" });
});

test("Outlet Daily phone filters keep date and branch visible and secondary filters in the sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const toolbar = page.locator("form.sb-outlet-daily-filters:visible").first();
  await expect(toolbar.locator('input[name="date"]')).toBeVisible();
  await expect(toolbar.getByRole("combobox", { name: "Branch" })).toBeVisible();
  const filter = toolbar.getByRole("button", { name: /^Filter/ });
  await expect(filter).toBeVisible();
  await filter.click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "Status" })).toBeVisible();
  await page.screenshot({ path: path.join(artifactDir, "outlet-daily-records-filter-open-390.png"), animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("Outlet Daily tablet filters use the shared inline two-column layout", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/outlet-daily-records", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const toolbar = page.locator("form.sb-outlet-daily-filters:visible").first();
  await expect(toolbar).toHaveAttribute("data-tablet-mode", "inline");
  await expect(toolbar.locator('input[name="date"]')).toBeVisible();
  await expect(toolbar.getByRole("combobox", { name: "Branch" })).toBeVisible();
  await expect(toolbar.getByRole("combobox", { name: "Status" })).toBeVisible();
  const fields = toolbar.locator(".unified-list-inline-fields");
  const geometry = await fields.evaluate((element) => ({
    columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
    width: element.scrollWidth,
    clientWidth: element.clientWidth,
    queryWidths: [
      element.closest("form")?.querySelector(".unified-list-primary-control")?.getBoundingClientRect().width ?? 0,
      element.closest("form")?.querySelector(".unified-list-pinned-control")?.getBoundingClientRect().width ?? 0,
      ...Array.from(element.querySelectorAll("[data-select-control]"), (control) => control.getBoundingClientRect().width),
    ],
    controls: Array.from(element.querySelectorAll("[data-select-control], input, button")).map((control) => {
      const rect = control.getBoundingClientRect();
      return { x: rect.x, right: rect.right, width: rect.width };
    }),
  }));
  expect(geometry.columns).toBe(2);
  expect(geometry.queryWidths.every((width) => width > 0)).toBe(true);
  expect(Math.max(...geometry.queryWidths) - Math.min(...geometry.queryWidths)).toBeLessThanOrEqual(1);
  expect(geometry.width).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.controls.every((control) => control.width > 0 && control.x >= 0 && control.right <= 820)).toBe(true);
  await page.screenshot({ path: path.join(artifactDir, "outlet-daily-records-820.png"), animations: "disabled" });
});

test("phone and tablet navigation drawer follows the 768px boundary, scroll-locks, and restores on close", async ({ page }) => {
  for (const width of [390, 700, 767, 768, 820]) {
    await test.step(`${width}px navigation drawer`, async () => {
      const height = width < 640 ? 844 : 900;
      await page.setViewportSize({ width, height });
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      if (width === 390) {
        const navGrid = page.locator("[data-mobile-app-nav] > div");
        const navGeometry = await navGrid.evaluate((element) => ({
          tracks: getComputedStyle(element).gridTemplateColumns.split(" ").length,
          children: element.children.length,
        }));
        expect(navGeometry.tracks).toBe(navGeometry.children);
      }
      const more = page.getByRole("button", { name: "More" });
      await expect(more).toBeVisible();
      await more.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const rect = await dialog.boundingBox();
      const maxDrawerHeight = width < 768 ? height * 0.88 + 1 : height - 32 + 1;
      expect(rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height && rect.height <= maxDrawerHeight).toBe(true);
      const scrollState = await dialog.locator(".sb-mobile-navigation-groups").evaluate((element) => ({
        display: getComputedStyle(element).display,
        columns: getComputedStyle(element).gridTemplateColumns,
        overflowY: getComputedStyle(element).overflowY,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }));
      expect(["auto", "scroll"]).toContain(scrollState.overflowY);
      expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
      if (width < 768) {
        expect(scrollState.display).toBe("block");
      } else {
        expect(scrollState.display).toBe("grid");
        expect(scrollState.columns.split(" ")).toHaveLength(2);
      }
      await expect.poll(() => page.locator("body").evaluate((body) => body.style.overflow)).toBe("hidden");
      await page.screenshot({ path: path.join(artifactDir, `dashboard-navigation-drawer-${width}-open.png`), animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(more).toHaveAttribute("aria-expanded", "false");
      await expect.poll(() => page.locator("body").evaluate((body) => body.style.overflow)).toBe("");

      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const bottom = await page.evaluate(() => {
          const nav = document.querySelector("[data-mobile-app-nav]");
          const main = document.querySelector("main");
          return { scrollTop: window.scrollY, mainBottom: main?.getBoundingClientRect().bottom ?? null, navTop: nav?.getBoundingClientRect().top ?? null };
        });
        expect(bottom.scrollTop).toBeGreaterThan(0);
        expect(bottom.mainBottom).toBeLessThanOrEqual((bottom.navTop ?? 0) + 1);
      }
    });
  }
});

test("landscape phone viewport keeps the receiving toolbar and filter dialog reachable", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/goods-receivings", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const toolbar = page.locator('form[data-shared-search-row]:visible').first();
  await expect(toolbar).toBeVisible();
  const buttons = toolbar.locator(":scope > div > button");
  await expect(buttons).toHaveCount(2);
  for (const button of await buttons.all()) expect((await button.boundingBox())?.height).toBe(44);
  await toolbar.getByRole("button", { name: /^Filter/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  const rect = await dialog.boundingBox();
  expect(rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 844 && rect.y + rect.height <= 390).toBe(true);
  await page.screenshot({ path: path.join(artifactDir, "goods-receivings-844x390-landscape-filter-open.png"), animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
