const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

const enabled = process.env.RUN_V8658_UAT === "1";
const purchaseRequestId = "50000000-0000-4000-8000-000000000001";
const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "portrait-tablet", width: 820, height: 1180 },
  { name: "landscape-tablet", width: 1180, height: 820 },
  { name: "desktop", width: 1440, height: 900 },
];

test.describe("v8.65.8 browser annotation closure", () => {
  test.skip(!enabled, "Set RUN_V8658_UAT=1 for the guarded local fixture.");

  test("dashboard hierarchy, table edge, document scrolling and PR dialogs", async ({ page }, testInfo) => {
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await login(page, "superAdmin");

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-dashboard-command]")).toBeVisible();
      await expect(page.locator("[data-dashboard-panel-body]").first()).toBeVisible();
      const hierarchy = await page.evaluate(() => {
        const body = document.querySelector("[data-dashboard-panel-body]");
        const command = document.querySelector("[data-dashboard-attention-summary]");
        if (!body || !command) return null;
        return {
          bodyPadding: Number.parseFloat(getComputedStyle(body).paddingLeft),
          bodyBackground: getComputedStyle(body).backgroundColor,
          commandBackground: getComputedStyle(command).backgroundColor,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(hierarchy).not.toBeNull();
      expect(hierarchy.bodyPadding).toBeGreaterThanOrEqual(8);
      expect(hierarchy.bodyBackground).not.toBe("rgb(255, 255, 255)");
      expect(hierarchy.commandBackground).not.toBe("rgb(255, 255, 255)");
      expect(hierarchy.pageOverflow).toBeLessThanOrEqual(2);
      await page.screenshot({ path: testInfo.outputPath(`dashboard-${viewport.name}.png`), fullPage: true });

      await page.goto("/purchase-requests", { waitUntil: "domcontentloaded" });
      const tableRegion = page.getByRole("region", { name: "Purchase requests" });
      if (viewport.width >= 1280) {
        await expect(tableRegion).toBeVisible();
        expect(await tableRegion.evaluate((element) => getComputedStyle(element).boxShadow)).toBe("none");
      } else {
        await expect(page.getByRole("list", { name: "Purchase requests" })).toBeVisible();
      }
    }

    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto(`/purchase-requests/${purchaseRequestId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("list", { name: "Requested items" })).toBeVisible();
    const scrollResult = await page.evaluate(() => {
      const root = document.scrollingElement;
      if (!root) return null;
      const before = root.scrollTop;
      window.scrollTo(0, Math.min(700, root.scrollHeight));
      return { before, after: root.scrollTop, scrollHeight: root.scrollHeight, clientHeight: root.clientHeight };
    });
    expect(scrollResult).not.toBeNull();
    expect(scrollResult.scrollHeight).toBeGreaterThan(scrollResult.clientHeight);
    expect(scrollResult.after).toBeGreaterThan(scrollResult.before);
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.getByRole("button", { name: /Edit LOCAL-RADISH - White Radish/ }).first().click();
    const recoveryDialog = page.getByRole("dialog");
    await expect(recoveryDialog).toBeVisible();
    await recoveryDialog.getByRole("button", { name: "Replace" }).click();
    const replacement = recoveryDialog.getByRole("combobox", { name: "Replacement Item" });
    await replacement.focus();
    const replacementList = page.getByRole("listbox");
    await expect(replacementList).toBeVisible();
    expect(await replacementList.evaluate((element) => element.parentElement?.tagName)).toBe("DIALOG");
    await expect(recoveryDialog.getByRole("spinbutton", { name: "Purchase quantity" })).toBeDisabled();
    await expect(recoveryDialog.getByRole("combobox", { name: "Purchase unit of measure" })).toBeDisabled();
    await replacementList.getByRole("option", { name: /Carrot/ }).click();
    await expect(recoveryDialog.getByRole("spinbutton", { name: "Purchase quantity" })).toBeEnabled();
    await expect(recoveryDialog.getByRole("combobox", { name: "Purchase unit of measure" })).toHaveValue("CTN");
    await recoveryDialog.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "Add line" }).click();
    const addDialog = page.getByRole("dialog");
    await expect(addDialog.getByText("Purchase qty", { exact: true })).toBeVisible();
    await expect(addDialog.getByRole("combobox", { name: "Purchase unit of measure" })).toBeVisible();
    const addItem = addDialog.getByRole("combobox", { name: "Request item" });
    await addItem.focus();
    const addList = page.getByRole("listbox");
    await expect(addList).toBeVisible();
    expect(await addList.evaluate((element) => element.parentElement?.tagName)).toBe("DIALOG");
    await page.screenshot({ path: testInfo.outputPath("pr-add-line-top-layer-820x1180.png"), fullPage: false });
    await addDialog.getByRole("button", { name: "Cancel" }).click();

    expect(consoleErrors.filter((message) => !/favicon|Download the React DevTools/i.test(message))).toEqual([]);
  });
});
