const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./helpers/load-source.cjs')({ URLSearchParams });
const { OutletDailyWastageChart } = load('src/components/outlet-daily-wastage-chart.tsx');
const { insightRange } = load('src/lib/outlet-insight-period.ts');
const render = props => renderToStaticMarkup(React.createElement(OutletDailyWastageChart, props));

test('selected month/custom range is not reduced to the legacy seven-day preset', () => {
  const month = insightRange('month', '2026-10-31');
  const custom = insightRange('7', '2026-10-31', '2026-10-02');
  assert.equal(month.start, '2026-10-01');
  assert.equal(month.days, 31);
  assert.equal(custom.start, '2026-10-02');
  assert.equal(custom.days, 30);
  assert.equal(custom.previousEnd, '2026-10-01');
  assert.equal(custom.previousStart, '2026-09-02');
});

test('sparse month chart labels the selected period and retains weighted rate and branch links', () => {
  const html = render({ branch: 'fixture-outlet', points: [
    {id:'first', name:'2026-10-01', received:100, wastage:10, wastage_percent:10},
    {id:'last', name:'2026-10-31', received:900, wastage:0, wastage_percent:0},
  ]});
  assert.match(html, /Selected period rate/);
  assert.match(html, />1%<\/strong>/);
  assert.match(html, /2 recorded days/);
  assert.match(html, /date=2026-10-01&amp;branch=fixture-outlet/);
  assert.match(html, /date=2026-10-31&amp;branch=fixture-outlet/);
  assert.doesNotMatch(html, /7-day|these 7 days/);
});

test('selected-period empty and unavailable messages stay distinct', () => {
  const empty = render({points:[]});
  const unavailable = render({points:[], unavailable:true});
  assert.match(empty, /No completed records in this period/);
  assert.doesNotMatch(empty, /Wastage trend unavailable/);
  assert.match(unavailable, /Wastage trend unavailable/);
  assert.match(unavailable, /selected period insight/);
  assert.doesNotMatch(unavailable, /No completed records|7-day|these 7 days/);
});

const { OutletDailyInsightMetrics } = load('src/components/outlet-daily-insight-metrics.tsx');
const metricHtml = (received, wastage, priorReceived, priorWastage, reliable = 1) => renderToStaticMarkup(React.createElement(OutletDailyInsightMetrics, {
  trend: { summary: { received, wastage }, coverage: { reliable_lines: reliable } },
  previous: { summary: { received: priorReceived, wastage: priorWastage }, coverage: { reliable_lines: 1 } }, compare: true,
}));
test('metric precision is presentation-only and percentage-point comparisons retain their meaning', () => {
  const html = metricHtml(8276,3978.75,12275,6060.5);
  assert.match(html, /48\.1%/);
  assert.match(html, /Previous 49\.4%/);
  assert.match(html, /-1\.3 pp/);
  assert.match(html, /3,978\.75/);
  assert.match(html, /-2,081\.75 \(-34\.3%\)/);
  assert.doesNotMatch(html, /48\.0758|49\.3727/);
});
test('metric unknowns and zero-baseline deltas are not fabricated percentages', () => {
  assert.match(metricHtml(100,3,0,0), /no % baseline/);
  const unknown = metricHtml(0,0,100,3,0);
  assert.doesNotMatch(unknown, /Previous|>0%|no % baseline/);
  assert.equal((unknown.match(/>—<\/dd>/g) || []).length, 3);
});
