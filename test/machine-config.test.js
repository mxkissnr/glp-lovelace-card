// Multi-machine `machine` config option tests (#50). Loads the real
// glp-card.js into a sandboxed vm context (same approach as
// security-helpers.test.js) and exposes the GlpCard class via a
// test-only source patch (a top-level `class` declaration doesn't become a
// context property on its own) so _resolvePrefix()/_switchStorageKey() can
// be exercised directly without a full custom-element/shadow-DOM harness.
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
  const context = { HTMLElement, customElements: { define() {} }, window: {}, console, URL };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(src, context, { filename: path.join(__dirname, '..', 'glp-card.js') });
  return context.__GlpCard;
}

const GlpCard = loadGlpCard();

function makeInstance({ config, states }) {
  const inst = Object.create(GlpCard.prototype);
  inst._config = config;
  inst._hass = { states };
  return inst;
}

test('_resolvePrefix() without `machine` keeps the existing behavior (first Gaggiuino-named entity)', () => {
  const inst = makeInstance({
    config: {},
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: { friendly_name: 'Gaggiuino Machine Status' } },
      'sensor.kitchen_gaggimate_machine_status': { attributes: { friendly_name: 'Kitchen GaggiMate Machine Status' } },
    },
  });
  assert.equal(inst._resolvePrefix(), 'sensor.gaggiuino_local_profiler_');
});

test('_resolvePrefix() with `machine` matches the entity whose friendly_name references it', () => {
  const inst = makeInstance({
    config: { machine: 'Kitchen GaggiMate' },
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: { friendly_name: 'Gaggiuino Machine Status' } },
      'sensor.kitchen_gaggimate_machine_status': { attributes: { friendly_name: 'Kitchen GaggiMate Machine Status' } },
    },
  });
  assert.equal(inst._resolvePrefix(), 'sensor.kitchen_gaggimate_');
});

test('_resolvePrefix() with `machine` falls back to the Gaggiuino/any heuristic when nothing matches', () => {
  const inst = makeInstance({
    config: { machine: 'Nonexistent Machine' },
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: { friendly_name: 'Gaggiuino Machine Status' } },
    },
  });
  assert.equal(inst._resolvePrefix(), 'sensor.gaggiuino_local_profiler_');
});

test('entity_prefix still wins over `machine` (explicit override, unchanged precedence)', () => {
  const inst = makeInstance({
    config: { machine: 'Kitchen GaggiMate', entity_prefix: 'sensor.custom_' },
    states: {},
  });
  assert.equal(inst._resolvePrefix(), 'sensor.custom_');
});

test('_switchStorageKey() is the unscoped global key when `machine` is not set', () => {
  const inst = makeInstance({ config: {}, states: {} });
  assert.equal(inst._switchStorageKey(), 'glp_switch_entity');
});

test('_switchStorageKey() is machine-slugged when `machine` is set, so two cards on one dashboard do not collide', () => {
  const inst = makeInstance({ config: { machine: 'Kitchen GaggiMate' }, states: {} });
  assert.equal(inst._switchStorageKey(), 'glp_switch_entity_kitchen_gaggimate');
});
