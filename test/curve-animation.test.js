// Guided metric line + curve draw-in animation gating (#120). Same
// vm-context approach as the other suites (see security-helpers.test.js /
// render-guard.test.js): loads the real glp-card.js into a sandboxed vm
// context and exercises the shipped function/prototype-method declarations
// directly, without a real shadow DOM/customElements.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCard() {
  let src = fs.readFileSync(path.join(__dirname, '..', 'glp-card.js'), 'utf8');
  src = src.replace(
    "customElements.define('glp-card', GlpCard);",
    "customElements.define('glp-card', GlpCard); globalThis.__GlpCard = GlpCard; globalThis.metricLineHtml = metricLineHtml;"
  );

  class HTMLElement {}
  const context = { HTMLElement, customElements: { define() {} }, window: {}, console, URL, setTimeout, clearTimeout };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(src, context, { filename: path.join(__dirname, '..', 'glp-card.js') });
  return { GlpCard: context.__GlpCard, metricLineHtml: context.metricLineHtml };
}

const { GlpCard, metricLineHtml } = loadCard();

function makeInstance() {
  return Object.create(GlpCard.prototype);
}

// ── _shotChartKeyChanged() — gates the shot-load curve draw-in so it plays
// once per actual shot change, not on every incidental re-render an hass
// push triggers while looking at the same shot (same problem the nav-dot
// "changed" tracking solves for the dots — see ready-by.test.js for that
// precedent). ─────────────────────────────────────────────────────────────

test('_shotChartKeyChanged() is true on first load (prevKey null, a shot is showing)', () => {
  const inst = makeInstance();
  assert.equal(inst._shotChartKeyChanged(null, 'shot-1'), true);
});

test('_shotChartKeyChanged() is true when the displayed shot id changes', () => {
  const inst = makeInstance();
  assert.equal(inst._shotChartKeyChanged('shot-1', 'shot-2'), true);
});

test('_shotChartKeyChanged() is false when the key is unchanged (incidental re-render)', () => {
  const inst = makeInstance();
  assert.equal(inst._shotChartKeyChanged('shot-1', 'shot-1'), false);
});

test('_shotChartKeyChanged() is false when nothing is showing (currentKey null)', () => {
  const inst = makeInstance();
  assert.equal(inst._shotChartKeyChanged('shot-1', null), false);
  assert.equal(inst._shotChartKeyChanged(null, null), false);
});

// ── metricLineHtml() — the guided metric line that replaced the two
// separate three-tile box rows (.metric-trio / .live-stats). ──────────────

test('metricLineHtml() returns empty string for no items', () => {
  assert.equal(metricLineHtml([]), '');
  assert.equal(metricLineHtml([null, null]), '');
});

test('metricLineHtml() renders one .metric-item per non-null entry, tagged with its role', () => {
  const html = metricLineHtml([
    { role: 'recipe', num: '1:2', unit: '', label: 'Ratio' },
    null,
    { role: 'result', num: '18.4', unit: 'g', label: 'Yield' },
  ]);
  const itemCount = (html.match(/class="metric-item /g) || []).length;
  assert.equal(itemCount, 2);
  assert.ok(html.includes('role-recipe'));
  assert.ok(html.includes('role-result'));
  assert.ok(!html.includes('role-process'));
});

test('metricLineHtml() escapes num/label — no unescaped markup from item content', () => {
  const html = metricLineHtml([
    { role: 'process', num: '<script>1</script>', unit: '', label: '<img src=x onerror=alert(1)>' },
  ]);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('metricLineHtml() only renders a unit span when unit is non-empty', () => {
  const withUnit = metricLineHtml([{ role: 'process', num: '5', unit: 's', label: 'Duration' }]);
  const withoutUnit = metricLineHtml([{ role: 'recipe', num: '1:2', unit: '', label: 'Ratio' }]);
  assert.ok(withUnit.includes('class="unit"'));
  assert.ok(!withoutUnit.includes('class="unit"'));
});
