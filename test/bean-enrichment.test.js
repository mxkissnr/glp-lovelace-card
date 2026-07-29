// Shot-card bean enrichment (#55, follow-up to gaggiuino-local-profiler#456):
// _beanExtraHtml() must prefer the stable beanId over the free-text coffee
// name, falling back to name matching only when beanId isn't available.
// Same vm-context approach as ready-by.test.js/machine-config.test.js: loads
// the real glp-card.js into a sandboxed vm context and exercises
// GlpCard.prototype methods directly.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGlpCard() {
  let src = fs.readFileSync(path.join(__dirname, '..', 'glp-card.js'), 'utf8');
  src = src.replace(
    "customElements.define('glp-card', GlpCard);",
    "customElements.define('glp-card', GlpCard); globalThis.__GlpCard = GlpCard;"
  );

  class HTMLElement {}
  const context = { HTMLElement, customElements: { define() {} }, window: {}, console, URL, setTimeout, clearTimeout };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(src, context, { filename: path.join(__dirname, '..', 'glp-card.js') });
  return context.__GlpCard;
}

const GlpCard = loadGlpCard();

function makeInstance({ beansInfoById = [], beansInfo = [] } = {}) {
  const inst = Object.create(GlpCard.prototype);
  inst._config = {};
  inst._hass = { states: {} };
  inst._beansInfoById = new Map(beansInfoById);
  inst._beansInfo = new Map(beansInfo);
  return inst;
}

test('_beanExtraHtml() matches by beanId even when the coffee name has drifted from the library', () => {
  // Simulates a delete+reimport: the shot annotation's name string is now
  // stale ("Old Name"), but the id still resolves to the current bean.
  const bean = { name: 'Old Name', origin: 'ET', variety: 'Heirloom', roastDate: null };
  const inst = makeInstance({ beansInfoById: [[42, bean]], beansInfo: [] });
  const html = inst._beanExtraHtml('Old Name', 42);
  assert.match(html, /Heirloom/);
});

test('_beanExtraHtml() prefers the beanId match over a name match that points at a different bean', () => {
  const byId   = { name: 'Renamed Bean', origin: 'KE', variety: 'SL28', roastDate: null };
  const byName = { name: 'Some Coffee', origin: 'BR', variety: 'Bourbon', roastDate: null };
  const inst = makeInstance({
    beansInfoById: [[7, byId]],
    beansInfo: [['some coffee', byName]],
  });
  const html = inst._beanExtraHtml('Some Coffee', 7);
  assert.match(html, /SL28/);
  assert.doesNotMatch(html, /Bourbon/);
});

test('_beanExtraHtml() falls back to name matching when beanId is absent (shots that predate it)', () => {
  const bean = { name: 'Legacy Coffee', origin: 'CO', variety: 'Castillo', roastDate: null };
  const inst = makeInstance({ beansInfoById: [], beansInfo: [['legacy coffee', bean]] });
  const html = inst._beanExtraHtml('Legacy Coffee', undefined);
  assert.match(html, /Castillo/);
});

test('_beanExtraHtml() falls back to name matching when the beanId does not resolve (deleted bean)', () => {
  const bean = { name: 'Still Here', origin: 'PE', variety: 'Typica', roastDate: null };
  const inst = makeInstance({ beansInfoById: [], beansInfo: [['still here', bean]] });
  const html = inst._beanExtraHtml('Still Here', 999); // 999 not in the library
  assert.match(html, /Typica/);
});

test('_beanExtraHtml() returns empty string when neither beanId nor name resolves', () => {
  const inst = makeInstance();
  assert.equal(inst._beanExtraHtml('Unknown Coffee', 123), '');
});
