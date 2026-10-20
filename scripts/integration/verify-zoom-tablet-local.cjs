const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const base = 'http://localhost:3190';
const out = 'outputs/qa/component-states';
const routes = JSON.parse(fs.readFileSync('outputs/qa/integration-routes/results.json'));
const fixture = JSON.parse(fs.readFileSync('outputs/wilson-qa/full-stack/fixture-private.json'));
const extension = path.resolve(out, 'zoom-extension');
fs.mkdirSync(extension, { recursive: true });
fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Local QA browser zoom', version: '1.0', permissions: ['tabs'], background: { service_worker: 'worker.js' } }));
fs.writeFileSync(path.join(extension, 'worker.js'), 'chrome.runtime.onInstalled.addListener(()=>{});');
(async () => {
  const context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 }, args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension] });
  const results = (process.env.INTEGRATION_RESUME || process.env.INTEGRATION_ROUTES) && fs.existsSync(path.join(out,'zoom-tablet.json')) ? JSON.parse(fs.readFileSync(path.join(out,'zoom-tablet.json'))) : [];
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const actor = fixture.accounts.find(x => x.slug === 'owner');
    await page.goto(base + '/login');
    await page.locator('[name=email]').fill(actor.email);
    await page.locator('[name=password]').fill(actor.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(url => url.pathname !== '/login');
    await page.route('**/*', r => ['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.continue() : r.abort());
    for (const mode of ['zoom200', 'tablet820']) {
      await page.setViewportSize(mode === 'zoom200' ? { width: 1440, height: 1000 } : { width: 820, height: 1180 });
      const zoom = await worker.evaluate(async ({ base, factor }) => {
        const tab = (await chrome.tabs.query({})).find(t => t.url.startsWith(base));
        await chrome.tabs.setZoom(tab.id, factor);
        return chrome.tabs.getZoom(tab.id);
      }, { base, factor: mode === 'zoom200' ? 2 : 1 });
      assert.equal(zoom, mode === 'zoom200' ? 2 : 1);
      for (const row of routes) {
        if(process.env.INTEGRATION_RESUME && !process.env.INTEGRATION_ROUTES && results.some(x=>x.route===row.route && x.mode===mode))continue;
        if (process.env.INTEGRATION_ROUTES && !process.env.INTEGRATION_ROUTES.split(',').includes(row.route)) continue;
        const previous = results.findIndex(x=>x.route===row.route && x.mode===mode);
        if(previous>=0)results.splice(previous,1);
        const record = { route: row.route, mode, zoom, issues: [] };
        results.push(record);
        try {
          await page.goto(base + row.url);
          await page.waitForFunction(()=>![...document.querySelectorAll('[data-page-loading-state]')].some(e=>e.checkVisibility({visibilityProperty:true})));
          await page.waitForLoadState('networkidle');
          assert.ok(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--sb-green-900').trim()),'Stylesheet must be loaded');
          record.metrics = await page.evaluate(() => ({ innerWidth, innerHeight, dpr: devicePixelRatio, width: document.documentElement.scrollWidth }));
          if (mode === 'zoom200') { assert.equal(record.metrics.innerWidth, 720); assert.equal(record.metrics.dpr, 2); }
          if (record.metrics.width > record.metrics.innerWidth + 1) record.issues.push('Document horizontal overflow');
          const details = page.locator('main details:visible');
          record.expanded = 0;
          for (let i = 0; i < await details.count(); i++) {
            if (!await details.nth(i).evaluate(el => el.open)) {
              await details.nth(i).locator(':scope > summary').click();
              record.expanded++;
            }
          }
          record.controls = await page.evaluate(async () => {
            const panel=[...document.querySelectorAll('[role=dialog],.sb-filter-more-panel')].find(el=>el.checkVisibility({visibilityProperty:true})&&el.getBoundingClientRect().height>0);
            const controls = [...(panel||document.querySelector('main')).querySelectorAll('input:not([type=hidden]),select,textarea,button,summary')];
            const issues = []; let checked = 0;
            for (const element of controls) {
              if (element.disabled || element.tabIndex < 0 || element.classList.contains('sr-only') || !element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
              let rect = element.getBoundingClientRect();
              if (rect.width < 4 || rect.height < 4) continue;
              element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
              element.focus({ preventScroll: true });
              await new Promise(resolve => requestAnimationFrame(()=>requestAnimationFrame(resolve)));
              rect = element.getBoundingClientRect();
              const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
              checked++;
              if (!hit || !(element.contains(hit) || hit.contains(element))) issues.push({ control: element.getAttribute('aria-label') || element.name || element.textContent.trim().slice(0,70), tag: element.tagName, rect: {x:rect.x,y:rect.y,width:rect.width,height:rect.height}, coveredBy: hit?.tagName, className: hit?.className?.toString().slice(0,120) });
            }
            return { checked, issues, activePanel: Boolean(panel) };
          });
          await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
          record.expandedOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
          if(record.expandedOverflow)record.issues.push('Expanded document horizontal overflow');
          record.screenshot = mode + '-' + row.route.replace(/[^a-z0-9]/gi, '_') + '.png';
          await page.screenshot({ path: path.join(out, record.screenshot), fullPage: mode !== 'zoom200' });
        } catch (error) { record.issues.push(String(error.message).split('\n')[0]); }
        fs.writeFileSync(path.join(out, 'zoom-tablet.json'), JSON.stringify(results, null, 2));
        console.log(JSON.stringify({ route: record.route, mode, issues: record.issues, coveredControls: record.controls?.issues.length ?? null }));
      }
    }
  } finally { await context.close(); }
})().catch(error => { console.error(String(error.message).split('\n')[0]); process.exitCode = 1; });
