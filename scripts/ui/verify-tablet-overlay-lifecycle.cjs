const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const esbuild = require(process.env.OMS_LOCAL_ESBUILD || "/tmp/oms-vercel-npm-cache/_npx/50e9ffea52bc6e2a/node_modules/esbuild/lib/main.js");
const root = process.cwd(), out = path.resolve(process.env.OMS_TABLET_EVIDENCE || "handoff/tablet-overlay-regression");
fs.mkdirSync(out, { recursive: true });
const fixtureDir = fs.mkdtempSync(require("os").tmpdir() + "/oms-tablet-overlays-");
for (const name of ["entry.tsx", "hooks.tsx", "actions.ts"]) fs.writeFileSync(path.join(fixtureDir, name), fs.readFileSync(path.join(root, "tests/fixtures/tablet-overlays", name + ".txt"), "utf8").replaceAll("__OMS_ROOT__", root));
(async () => {
  await esbuild.build({ entryPoints: [path.join(fixtureDir, "entry.tsx")], outfile: out + "/shared-ui.js", bundle: true, jsx: "automatic", platform: "browser", nodePaths: [root + "/node_modules"], alias: { "@": root + "/src", "next/navigation": path.join(fixtureDir, "hooks.tsx"), "next/link": path.join(fixtureDir, "hooks.tsx"), "@/server/actions/procurement": path.join(fixtureDir, "actions.ts") }, loader: { ".css": "local-css" }, define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" } });
  let css = fs.readdirSync(root + "/.next/static/css").filter((n) => n.endsWith(".css")).map((n) => fs.readFileSync(root + "/.next/static/css/" + n, "utf8")).join("\n") + fs.readFileSync(out + "/shared-ui.css", "utf8");
  const s = http.createServer((q, r) => {
    if (q.url === "/ui.js") {
      r.setHeader("content-type", "text/javascript");
      r.end(fs.readFileSync(out + "/shared-ui.js"));
      return;
    }
    r.end('<!doctype html><html data-design-layer="v2" data-touch-tablet="true"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><div id="root"></div><script src="/ui.js"><\/script></body></html>');
  });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const b = await chromium.launch();
  let results = [];
  try {
    for (const kind of ["right-console-resize", "right-console-owner-clear", "query-resize", "stock-basket-resize", "nested-sheet-modal", "filter-more-resize", "right-console-content-update"]) {
      const p = await b.newPage({ viewport: { width: kind === "query-resize" || kind === "stock-basket-resize" ? 820 : 600, height: 1e3 }, hasTouch: true });
      p.on("pageerror", (e) => console.log("fixture-error", e.message));
      await p.goto("http://127.0.0.1:" + s.address().port + "/?kind=" + kind);
      await p.waitForTimeout(250);
      if (kind.startsWith("right-console")) {
        await p.getByRole("button", { name: "Open fixture actions" }).tap();
        if (kind === "right-console-content-update") {
          await p.locator("[data-bottom-sheet]").getByLabel("Fixture console input").fill("typed");
          require("node:assert/strict").ok(await p.locator("[data-bottom-sheet]").isVisible(), "Typing must keep same-owner sheet open");
          require("node:assert/strict").equal(await p.locator("[data-bottom-sheet]").getByLabel("Fixture console input").inputValue(), "typed");
          require("node:assert/strict").ok(await p.locator("[data-bottom-sheet]").getByLabel("Fixture console input").evaluate(e=>e===document.activeElement), "Typing preserves focus");
          await p.locator("[data-bottom-sheet]").getByRole("button",{name:"Close fixture actions",exact:true}).tap();
        } else if (kind === "right-console-resize") await p.setViewportSize({ width: 820, height: 1e3 });
        else await p.locator("#toggle-console").evaluate((e) => e.click());
      } else if (kind === "query-resize") {
        await p.locator("#query-fixture").getByRole("button", { name: /Filter/ }).tap();
        await p.setViewportSize({ width: 1280, height: 1e3 });
      } else if (kind === "stock-basket-resize") {
        await p.getByRole("button", { name: "Open PR basket", exact: true }).tap();
        await p.setViewportSize({ width: 1280, height: 1e3 });
      } else if (kind === "filter-more-resize") {
        await p.locator("[data-filter-more-wrapper] summary").tap();
        await p.setViewportSize({ width: 1280, height: 1e3 });
        await p.keyboard.press("Escape");
      } else {
        await p.getByRole("button", { name: "Files & activity" }).tap();
        await p.locator("#open-nested").tap();
        await p.setViewportSize({ width: 1280, height: 1e3 });
      }
      await p.waitForTimeout(200);
      let state = await p.evaluate(() => ({ overflow: document.body.style.overflow, dialogs: [...document.querySelectorAll("[role=dialog]")].map((e) => ({ text: e.textContent.slice(0, 60), visible: !!e.getClientRects().length })) }));
      require("node:assert/strict").equal(state.overflow, "", "No body lock after " + kind);
      require("node:assert/strict").equal(state.dialogs.filter((d) => d.visible).length, 0, "No visible dialog after " + kind);
      const session = await p.context().newCDPSession(p);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 400, y: 700 }] });
      for (let y2 = 680; y2 >= 360; y2 -= 20) {
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 400, y: y2 }] });
        await p.waitForTimeout(12);
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await p.waitForTimeout(150);
      require("node:assert/strict").ok(await p.evaluate(() => scrollY > 30), "Touch page scroll after " + kind);
      await session.detach();
      const wide = p.locator("#wide-table .sb-table-region");
      await wide.scrollIntoViewIfNeeded();
      const rect = await wide.boundingBox();
      const ss = await p.context().newCDPSession(p);
      const y = rect.y + rect.height / 2;
      await ss.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 550, y }] });
      for (let x = 530; x >= 250; x -= 20) {
        await ss.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
        await p.waitForTimeout(12);
      }
      await ss.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await p.waitForTimeout(150);
      const horizontal = await wide.evaluate((e) => e.scrollLeft);
      require("node:assert/strict").ok(horizontal > 30, "Horizontal table gesture " + kind);
      await ss.detach();
      results.push({ kind, state, touchVertical: true, touchHorizontal: horizontal });
      await p.screenshot({ path: out + "/" + kind + "-candidate.png" });
      await p.close();
    }
    fs.writeFileSync(out + "/shared-ui-candidate.json", JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally {
    await b.close();
    await new Promise((r) => s.close(r));
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
