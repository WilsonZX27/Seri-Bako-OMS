const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

function parseCsv(text) {
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
    const cells = [];
    line.replace(/"((?:[^"]|"")*)"(?:,|$)/g, (_, value) => {
      cells.push(value.replaceAll('""', '"'));
      return "";
    });
    return cells;
  });
}

function net(rows, branch) {
  return rows.filter((row) => row[3] === branch).reduce((sum, row) => sum + Number(row[5]) - Number(row[6]), 0);
}

test("stock ledger filters, export, and QA balances reconcile", async ({ page }) => {
  expect(await login(page, "superAdmin")).toBe(true);
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.goto("/stock-transactions?search=QA-ING-A-721A", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Transaction No");
  await expect(page.locator("body")).toContainText("Ledger rows");
  await expect(page.locator("body")).toContainText("Sprint 7.3.4");
  await expect(page.locator("body")).toContainText("ST-00011");
  await expect(page.locator("body")).toContainText("ST-SW-00001-eae1");

  const ing = parseCsv(await (await page.request.get("/stock-transactions/export?search=QA-ING-A-721A")).text());
  expect(ing).toHaveLength(6);
  expect(net(ing, "Central Kitchen @ ALMA")).toBe(8);
  expect(net(ing, "Central Kitchen @ PJS10")).toBe(1);

  const fin = parseCsv(await (await page.request.get("/stock-transactions/export?search=QA-FIN-721A")).text());
  expect(fin.reduce((sum, row) => sum + Number(row[5]) - Number(row[6]), 0)).toBe(1);

  const yoonghen = parseCsv(await (await page.request.get("/stock-transactions/export?search=YOONGHEN00001")).text());
  expect(yoonghen.reduce((sum, row) => sum + Number(row[5]) - Number(row[6]), 0)).toBe(0);
  expect(yoonghen.some((row) => row[0] === "ST-GRN-00004-8f2b")).toBe(true);
  expect(yoonghen.some((row) => row[0] === "ST-PRT-00001-eacb")).toBe(true);
});
