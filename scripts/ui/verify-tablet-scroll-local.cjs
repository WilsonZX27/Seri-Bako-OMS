// Local synthetic UI evidence; never authenticates or submits an OMS action.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const postcss = require('postcss');
const target = new URL(process.env.OMS_SCROLL_URL || 'http://127.0.0.1:3188');
assert(['localhost', '127.0.0.1'].includes(target.hostname), 'Local mock target only');
const out = path.resolve(process.env.OMS_SCROLL_EVIDENCE || 'handoff/tablet-scroll-20261101');
fs.mkdirSync(out, { recursive: true });
const route = '/purchase-requests/mock-pr-long-supplier';
const results = [];
async function gesture(page, x = 400, y = 650) {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 20; step <= 400; step += 20) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step }] });
    await page.waitForTimeout(15);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(350);
  await session.detach();
}
async function state(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    return { window: scrollY, main: main.scrollTop, documentHeight: document.scrollingElement.scrollHeight,
      viewport: innerHeight, touchTablet: document.documentElement.dataset.touchTablet || null,
      bodyLock: document.body.style.overflow, horizontal: document.documentElement.scrollWidth > innerWidth };
  });
}
async function lengthen(page) {
  await page.evaluate(() => {
    const list = document.querySelector('[role="list"][aria-label="Requested items"]');
    if (!list) throw Error('Actual Requested items cards missing: use the isolated mock fixture');
    const row = list.firstElementChild;
    for (let i = 0; i < 28; i++) {
      const clone = row.cloneNode(true);
      clone.querySelectorAll('button,input,select,textarea').forEach(el => el.remove());
      list.appendChild(clone);
    }
    const input = document.createElement('input'); input.value = 'Synthetic quantity'; input.setAttribute('aria-label', 'Synthetic scroll input');
    input.style.cssText = 'display:block;width:200px;height:44px'; list.prepend(input);
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    let body;
    for (const [width, height, tablet] of [[390,844,false],[820,1180,true],[1180,820,true],[1279,820,true],[1280,820,true],[1366,1024,true],[1440,900,false]]) {
      const context = await browser.newContext({ viewport: { width, height }, screen: { width, height }, hasTouch: tablet || width === 390,
        userAgent: tablet ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15' : undefined });
      if (tablet) await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 }));
      const page = await context.newPage();
      await page.goto(new URL(route, target).href);
      await page.getByRole('list', { name: 'Requested items' }).waitFor();
      await page.waitForTimeout(300);
      await lengthen(page);
      const before = await state(page);
      await gesture(page, Math.min(400, width / 2), height - 150);
      const after = await state(page);
      assert(after.window + after.main > before.window + before.main + 50, `Cannot scroll ${width}`);
      assert(!after.horizontal, `Horizontal overflow ${width}`);
      if (tablet) assert(after.window > 0 && after.main === 0, `Tablet must use document scrolling ${width}`);
      if (width === 1440) assert(after.main > 0 && after.window === 0, 'Desktop must retain its inner scroller');
      results.push({ mode: 'live-development', width, height, before, after });
      if (width === 1366) {
        await page.getByRole('button', { name: 'More', exact: true }).tap();
        const dialog = page.getByRole('dialog', { name: 'Mock Company' });
        await dialog.waitFor({ state: 'visible' });
        await page.screenshot({ path: path.join(out, 'candidate-drawer.png') });
        assert.equal(await page.locator('body').evaluate(el => el.style.overflow), 'hidden');
        const lockedBefore = await state(page);
        await gesture(page, 30, 250);
        assert.equal((await state(page)).window, lockedBefore.window, 'Open drawer must suppress background scrolling');
        await dialog.getByRole('button', { name: 'Close navigation', exact: true }).click();
        assert.equal(await page.locator('body').evaluate(el => el.style.overflow), '');
        await page.evaluate(() => scrollTo(0, 0));
        await page.locator('summary').filter({ hasText: 'Stock and purchasing details' }).first().click();
        await page.locator('summary').filter({ hasText: 'Stock and purchasing details' }).first().click();
        await page.evaluate(() => scrollTo(0, 0));
        await gesture(page, 400, 700);
        assert((await state(page)).window > 50, 'Scroll must recover after drawer close and card toggle');
        await page.screenshot({ path: path.join(out, 'candidate-landscape.png') });
        body = await page.locator('body').evaluate(el => { const copy = el.cloneNode(true); copy.querySelectorAll('script,nextjs-portal').forEach(n => n.remove()); return copy.outerHTML; });
        // A swipe beginning on an input and then on the fixed bottom bar must not poison later swipes.
        await page.evaluate(() => scrollTo(0, 0));
        const input = await page.getByLabel('Synthetic scroll input').boundingBox();
        await gesture(page, input.x + 50, input.y + 25);
        results.push({ mode: 'input-origin', state: await state(page) });
        await gesture(page, 500, height - 10);
        await page.evaluate(() => scrollTo(0, 0));
        await gesture(page, 500, height - 150);
        assert((await state(page)).window > 50, 'Bottom-bar swipe must not leave a lock');
        await page.setViewportSize({ width: 820, height: 1180 });
        await page.evaluate(() => scrollTo(0, 0)); await gesture(page, 400, 900);
        assert((await state(page)).window > 50, 'Scroll after landscape-to-portrait resize');
        await page.setViewportSize({ width, height });
        await page.goto(new URL('/purchase-requests', target).href);
        await page.waitForTimeout(500);
        await page.evaluate(() => { const main = document.querySelector('main'); for (let i=0;i<30;i++) { const row=document.createElement('div'); row.style.height='100px'; row.textContent='Synthetic register row'; main.appendChild(row); } scrollTo(0,0); });
        await gesture(page, 500, height - 150);
        assert((await state(page)).window > 50, 'Unaffected PR register caller scrolls');
        results.push({ mode: 'runtime-orientation-and-register-caller', passed: true });
        await page.goto(new URL(route, target).href); await page.waitForTimeout(500); await lengthen(page);
        await gesture(page, 500, height - 150);
        assert((await state(page)).window > 50, 'Scroll after navigation: '+JSON.stringify(await state(page)));
        await page.reload(); await page.waitForTimeout(500); await lengthen(page); await gesture(page, 500, height - 150);
        assert((await state(page)).window > 50, 'Scroll after refresh');
        results.push({ mode: 'drawer-card-navigation-refresh', passed: true });
      }
      await context.close();
    }
    // Actual Next production CSS + captured actual mock DOM. No mock-enabled production app or auth bypass.
    const cssDir = '.next/static/css';
    const css = fs.readdirSync(cssDir).filter(n => n.endsWith('.css')).map(n => fs.readFileSync(path.join(cssDir,n), 'utf8')).join('\n');
    const baseline = postcss.parse(css);
    baseline.walkRules(rule => {
      const selector = rule.selector.replaceAll('"', '').replaceAll("'", '');
      if (selector === 'html[data-touch-tablet=true],html[data-touch-tablet=true] body' ||
          rule.selector.includes('[data-app-shell]') && rule.selector.includes('data-touch-tablet')) rule.remove();
      else if (rule.selector.includes('[data-mobile-navigation-overlay]')) rule.selector = rule.selector.split(',').filter(s => !s.includes('[data-mobile-navigation-overlay]')).join(',');
    });
    for (const [label, styles, expected] of [['baseline-production-css',baseline.toString(),false], ['candidate-production-css',css,true]]) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 1024 }, hasTouch: true });
      const page = await context.newPage();
      await page.setContent(`<!doctype html><html data-design-layer="v2" data-touch-tablet="true"><head><style>${styles}</style></head>${body}</html>`);
      const before = await state(page); await gesture(page, 400, 800); const after = await state(page);
      assert.equal(after.window > 50, expected, label);
      results.push({ mode: label, before, after });
      await page.screenshot({ path: path.join(out, `${label}.png`) });
      await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'), JSON.stringify(results,null,2));
    console.log(JSON.stringify({ passed: true, checks: results.length, evidence: out }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
