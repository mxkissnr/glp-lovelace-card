// Machine standby tests (#195). Same vm-context approach as
// ready-by.test.js: loads the real glp-card.js into a sandboxed vm context
// and exercises GlpCard.prototype methods directly, without a real shadow
// DOM/customElements — covers only the pure-logic decision made by
// _isMachineOff(), not markup.
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
  const context = { HTMLElement, customElements: { define() {}, get() {}, whenDefined() { return new Promise(() => {}); } }, window: {}, console, URL, setTimeout, clearTimeout };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(src, context, { filename: path.join(__dirname, '..', 'glp-card.js') });
  return context.__GlpCard;
}

const GlpCard = loadGlpCard();

function makeInstance(switchEntity) {
  const inst = Object.create(GlpCard.prototype);
  inst._switchEntity = switchEntity ?? null;
  return inst;
}

// ── _isMachineOff() ─────────────────────────────────────────────────────────

test('_isMachineOff() is true when a configured switch is off', () => {
  const inst = makeInstance('switch.machine');
  assert.equal(inst._isMachineOff({ state: 'off' }, null), true);
});

test('_isMachineOff() is true when the switch is on but the machine is in standby', () => {
  const inst = makeInstance('switch.machine');
  assert.equal(inst._isMachineOff({ state: 'on' }, { state: 'on' }), true);
});

test('_isMachineOff() is true with no switch configured but the machine in standby', () => {
  const inst = makeInstance(null);
  assert.equal(inst._isMachineOff(null, { state: 'on' }), true);
});

test('_isMachineOff() is false with no switch configured and standby off', () => {
  const inst = makeInstance(null);
  assert.equal(inst._isMachineOff(null, { state: 'off' }), false);
});

test('_isMachineOff() is false with no switch configured and no standby entity', () => {
  const inst = makeInstance(null);
  assert.equal(inst._isMachineOff(null, undefined), false);
});

test('_isMachineOff() is false when the switch is on and no standby entity exists', () => {
  const inst = makeInstance('switch.machine');
  assert.equal(inst._isMachineOff({ state: 'on' }, undefined), false);
});
