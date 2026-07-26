// Proves _applySemanticColorContrast() actually RUNS and picks the correct
// --glp-ok/--glp-warn/--glp-err (by --glp-bg luminance) and --glp-accent-text
// (by --glp-accent luminance, independently) — not just that the method
// exists. Same vm-sandbox + Object.create(prototype) approach as
// machine-config.test.js: avoids needing a full custom-element/shadow-DOM
// constructor, just a minimal style/shadowRoot stub sufficient to drive the
// method end-to-end. Real color normalization (hex/named-color -> rgb()) is
// exactly what the browser's engine does and is NOT re-implemented here —
// that layer is covered by scripts/screenshot.mjs's real Playwright renders
// instead; this test only proves the luminance-decision logic itself fires.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeStyleStub() {
  const props = new Map();
  return {
    cssText: '',
    get color() { return props.get('color') || ''; },
    set color(v) { props.set('color', v); },
    setProperty(name, value) { props.set(name, value); },
    getPropertyValue(name) { return props.get(name) || ''; },
  };
}

function loadGlpCard() {
  let src = fs.readFileSync(path.join(__dirname, '..', 'glp-card.js'), 'utf8');
  src = src.replace(
    "customElements.define('glp-card', GlpCard);",
    "customElements.define('glp-card', GlpCard); globalThis.__GlpCard = GlpCard;"
  );

  class HTMLElement {}
  const fakeDocument = { createElement() { return { style: makeStyleStub(), remove() {} }; } };
  const context = {
    HTMLElement,
    customElements: { define() {} },
    window: {},
    document: fakeDocument,
    getComputedStyle(el) { return el.style; },
    console,
    URL,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(src, context, { filename: 'glp-card.js' });
  return context.__GlpCard;
}

const GlpCard = loadGlpCard();

function makeInstance() {
  const inst = Object.create(GlpCard.prototype);
  inst.style = makeStyleStub();
  inst.shadowRoot = { appendChild() {} };
  return inst;
}

test('_applySemanticColorContrast() picks light-safe --glp-ok/--glp-warn/--glp-err for a white --glp-bg', () => {
  const inst = makeInstance();
  inst.style.setProperty('--glp-bg', 'rgb(255, 255, 255)');
  inst._applySemanticColorContrast();
  assert.equal(inst.style.getPropertyValue('--glp-ok'), '#15803d');
  assert.equal(inst.style.getPropertyValue('--glp-warn'), '#a16207');
  assert.equal(inst.style.getPropertyValue('--glp-err'), '#dc2626');
});

test('_applySemanticColorContrast() picks dark-safe --glp-ok/--glp-warn/--glp-err for a near-black --glp-bg', () => {
  const inst = makeInstance();
  inst.style.setProperty('--glp-bg', 'rgb(24, 24, 27)');
  inst._applySemanticColorContrast();
  assert.equal(inst.style.getPropertyValue('--glp-ok'), '#22c55e');
  assert.equal(inst.style.getPropertyValue('--glp-warn'), '#eab308');
  assert.equal(inst.style.getPropertyValue('--glp-err'), '#ef4444');
});

test('_applySemanticColorContrast() picks dark --glp-accent-text for a light accent (amber)', () => {
  const inst = makeInstance();
  inst.style.setProperty('--glp-bg', 'rgb(24, 24, 27)');
  inst.style.setProperty('--glp-accent', 'rgb(245, 158, 11)'); // #f59e0b, GLP Dark's default primary
  inst._applySemanticColorContrast();
  assert.equal(inst.style.getPropertyValue('--glp-accent-text'), '#000');
});

test('_applySemanticColorContrast() picks light --glp-accent-text for a dark accent (indigo)', () => {
  const inst = makeInstance();
  inst.style.setProperty('--glp-bg', 'rgb(255, 255, 255)');
  inst.style.setProperty('--glp-accent', 'rgb(26, 35, 126)'); // #1a237e, Material Indigo 900 — a common dark theme primary
  inst._applySemanticColorContrast();
  assert.equal(inst.style.getPropertyValue('--glp-accent-text'), '#fff');
});

test('_applySemanticColorContrast() is a no-op (does not throw) when --glp-bg/--glp-accent are unset', () => {
  const inst = makeInstance();
  assert.doesNotThrow(() => inst._applySemanticColorContrast());
  assert.equal(inst.style.getPropertyValue('--glp-ok'), '');
  assert.equal(inst.style.getPropertyValue('--glp-accent-text'), '');
});
