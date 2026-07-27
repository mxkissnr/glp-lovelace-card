// Ready-by preheat scheduler tests (#61). Same vm-context approach as
// machine-config.test.js: loads the real glp-card.js into a sandboxed vm
// context and exercises GlpCard.prototype methods directly, without a real
// shadow DOM/customElements — covers only the pure-logic pieces
// (_resolveReadyByTarget's today/tomorrow date math, _readReadyBy's
// hass.states parsing), per this suite's existing boundary of not testing
// markup or hass.callService invocation.
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
  vm.runInContext(src, context, { filename: 'glp-card.js' });
  return context.__GlpCard;
}

const GlpCard = loadGlpCard();

function makeInstance({ config = {}, states = {} } = {}) {
  const inst = Object.create(GlpCard.prototype);
  inst._config = config;
  inst._hass = { states };
  return inst;
}

// ── _resolveReadyByTarget() ────────────────────────────────────────────────

test('_resolveReadyByTarget() returns today when the picked time has not passed yet', () => {
  const inst = makeInstance();
  const now = new Date(2026, 6, 27, 14, 0, 0);       // 2026-07-27 14:00
  const target = inst._resolveReadyByTarget('18:30', now);
  assert.equal(target.getFullYear(), 2026);
  assert.equal(target.getMonth(), 6);
  assert.equal(target.getDate(), 27);
  assert.equal(target.getHours(), 18);
  assert.equal(target.getMinutes(), 30);
});

test('_resolveReadyByTarget() rolls over to tomorrow when the picked time has already passed today', () => {
  const inst = makeInstance();
  const now = new Date(2026, 6, 27, 22, 0, 0);       // 2026-07-27 22:00
  const target = inst._resolveReadyByTarget('07:00', now);
  assert.equal(target.getFullYear(), 2026);
  assert.equal(target.getMonth(), 6);
  assert.equal(target.getDate(), 28);                // rolled to the next day
  assert.equal(target.getHours(), 7);
  assert.equal(target.getMinutes(), 0);
});

test('_resolveReadyByTarget() treats an exact-now match as already passed (rolls to tomorrow)', () => {
  const inst = makeInstance();
  const now = new Date(2026, 6, 27, 9, 15, 0);
  const target = inst._resolveReadyByTarget('09:15', now);
  assert.equal(target.getDate(), 28);
});

test('_resolveReadyByTarget() returns null for malformed input', () => {
  const inst = makeInstance();
  const now = new Date(2026, 6, 27, 9, 15, 0);
  assert.equal(inst._resolveReadyByTarget('', now), null);
  assert.equal(inst._resolveReadyByTarget('not-a-time', now), null);
  assert.equal(inst._resolveReadyByTarget('25:00', now), null);
  assert.equal(inst._resolveReadyByTarget(undefined, now), null);
});

// ── _readReadyBy() ──────────────────────────────────────────────────────────

test('_readReadyBy() reads scheduled targetAt/plannedAt off hass.states', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: '2026-07-28T07:00:00.000Z' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: '2026-07-28T06:40:00.000Z' },
    },
  });
  const { targetAt, plannedAt } = inst._readReadyBy();
  // note: targetAt/plannedAt are Date instances of the vm context's own
  // realm, not this test file's — `instanceof Date` doesn't hold across
  // realms, so behavior (toISOString) is asserted instead of the class.
  assert.equal(targetAt.toISOString(), '2026-07-28T07:00:00.000Z');
  assert.equal(plannedAt.toISOString(), '2026-07-28T06:40:00.000Z');
});

test('_readReadyBy() returns null targetAt/plannedAt when the sensors are unknown (nothing scheduled)', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: 'unknown' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: 'unknown' },
    },
  });
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt, null);
  assert.equal(plannedAt, null);
});

test('_readReadyBy() returns null when the sensor entities do not exist at all', () => {
  const inst = makeInstance({
    states: { 'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} } },
  });
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt, null);
  assert.equal(plannedAt, null);
});

// ── _readReadyBy() 'unavailable' vs 'unknown' (#68) ─────────────────────────
// 'unavailable' is a transient connectivity blip (coordinator poll failure,
// integration reload, ...) and must NOT be read as "nothing scheduled" — the
// card should keep showing the last successfully-parsed value. Only a
// genuine 'unknown' state (or the entity being missing) is a real "nothing
// scheduled" signal and should clear the display.

test('_readReadyBy() keeps showing the last-known-good target/planned across a transient "unavailable" blip', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: '2026-07-28T07:00:00.000Z' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: '2026-07-28T06:40:00.000Z' },
    },
  });

  // 1) real value — establishes the last-known-good cache
  const first = inst._readReadyBy();
  assert.equal(first.targetAt.toISOString(), '2026-07-28T07:00:00.000Z');
  assert.equal(first.plannedAt.toISOString(), '2026-07-28T06:40:00.000Z');

  // 2) transient 'unavailable' blip — must NOT drop to null, falls back to cache
  inst._hass.states['sensor.gaggiuino_local_profiler_preheat_ready_by_target_at'] = { state: 'unavailable' };
  inst._hass.states['sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at'] = { state: 'unavailable' };
  const duringBlip = inst._readReadyBy();
  assert.equal(duringBlip.targetAt.toISOString(), '2026-07-28T07:00:00.000Z');
  assert.equal(duringBlip.plannedAt.toISOString(), '2026-07-28T06:40:00.000Z');

  // 3) sensor recovers with a real value again
  inst._hass.states['sensor.gaggiuino_local_profiler_preheat_ready_by_target_at'] = { state: '2026-07-28T07:30:00.000Z' };
  inst._hass.states['sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at'] = { state: '2026-07-28T07:10:00.000Z' };
  const after = inst._readReadyBy();
  assert.equal(after.targetAt.toISOString(), '2026-07-28T07:30:00.000Z');
  assert.equal(after.plannedAt.toISOString(), '2026-07-28T07:10:00.000Z');
});

test('_readReadyBy() clears to null on a genuine "unknown" (real cancel/completion, not a blip)', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: '2026-07-28T07:00:00.000Z' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: '2026-07-28T06:40:00.000Z' },
    },
  });

  // 1) real value — establishes the last-known-good cache
  const first = inst._readReadyBy();
  assert.equal(first.targetAt.toISOString(), '2026-07-28T07:00:00.000Z');

  // 2) genuine 'unknown' — a real clear, must drop to null (not fall back to cache)
  inst._hass.states['sensor.gaggiuino_local_profiler_preheat_ready_by_target_at'] = { state: 'unknown' };
  inst._hass.states['sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at'] = { state: 'unknown' };
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt, null);
  assert.equal(plannedAt, null);

  // 3) and a later 'unavailable' blip has nothing to fall back to anymore
  inst._hass.states['sensor.gaggiuino_local_profiler_preheat_ready_by_target_at'] = { state: 'unavailable' };
  const afterBlip = inst._readReadyBy();
  assert.equal(afterBlip.targetAt, null);
});

test('_readReadyBy() caches targetAt and plannedAt independently — one blipping does not clobber the other', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: '2026-07-28T07:00:00.000Z' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: '2026-07-28T06:40:00.000Z' },
    },
  });
  inst._readReadyBy(); // establish both caches

  // only the planned sensor blips
  inst._hass.states['sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at'] = { state: 'unavailable' };
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt.toISOString(), '2026-07-28T07:00:00.000Z');
  assert.equal(plannedAt.toISOString(), '2026-07-28T06:40:00.000Z');   // held from cache
});

// ── _readReadyBy() optimistic pending override (#66) ───────────────────────
// Same shape as the pre-existing _pendingProfile pattern: a pending value set
// right after the "Set"/"Cancel" service calls is preferred over the live
// sensor read until the sensor confirms it.

test('_readReadyBy() prefers a pending Set target over a still-stale (unknown) sensor', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: 'unknown' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: 'unknown' },
    },
  });
  const pending = new Date(2026, 6, 28, 7, 0, 0);
  inst._pendingReadyByTargetAt = pending;
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt, pending);
  assert.equal(plannedAt, null);
  // still pending — the sensor hasn't confirmed yet
  assert.equal(inst._pendingReadyByTargetAt, pending);
});

test('_readReadyBy() clears the pending Set override once the sensor reports a real targetAt', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: '2026-07-28T07:00:00.000Z' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: '2026-07-28T06:40:00.000Z' },
    },
  });
  inst._pendingReadyByTargetAt = new Date(2026, 6, 28, 7, 0, 0);
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt.toISOString(), '2026-07-28T07:00:00.000Z');
  assert.equal(plannedAt.toISOString(), '2026-07-28T06:40:00.000Z');
  // resolved — pending override cleared so future renders read the sensor
  assert.equal(inst._pendingReadyByTargetAt, null);
});

test('_readReadyBy() prefers a pending Cancel (targetAt=null) over a still-stale (set) sensor', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: '2026-07-28T07:00:00.000Z' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: '2026-07-28T06:40:00.000Z' },
    },
  });
  inst._pendingReadyByTargetAt = false;
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt, null);
  assert.equal(plannedAt, null);
  assert.equal(inst._pendingReadyByTargetAt, false);
});

test('_readReadyBy() clears the pending Cancel override once the sensor reports no target', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: 'unknown' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: 'unknown' },
    },
  });
  inst._pendingReadyByTargetAt = false;
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt, null);
  assert.equal(plannedAt, null);
  assert.equal(inst._pendingReadyByTargetAt, null);
});

// ── _readyByCountdownText() ─────────────────────────────────────────────────

test('_readyByCountdownText() returns empty string when nothing is planned or pending', () => {
  const inst = makeInstance();
  assert.equal(inst._readyByCountdownText(null), '');
});

test('_readyByCountdownText() returns the scheduling placeholder when a target is set but plannedAt is not known yet', () => {
  // LANG defaults to 'de' at module load until _render() sets it from
  // hass.language — this suite never calls _render(), so the German string
  // is what T() resolves to here.
  const inst = makeInstance();
  assert.equal(inst._readyByCountdownText(null, new Date()), 'Wird geplant …');
});

// ── _bindReadyByPicker() / _readyByInteracting guard (#64) ─────────────────
// No real shadow DOM here (matches this suite's existing boundary) — stubs
// shadowRoot.getElementById with a fake input exposing addEventListener, and
// asserts the focus/blur handlers toggle the flag the render-gates check.

function makeFakeInput() {
  const listeners = {};
  return {
    el: {
      addEventListener(type, handler) { listeners[type] = handler; },
    },
    fire(type) { listeners[type](); },
  };
}

test('_bindReadyByPicker() sets _readyByInteracting=true on focus and false on blur', () => {
  const inst = makeInstance();
  inst._readyByInteracting = false;
  const { el, fire } = makeFakeInput();
  inst.shadowRoot = { getElementById: id => (id === 'glp-readyby-input' ? el : null) };

  inst._bindReadyByPicker();
  assert.equal(inst._readyByInteracting, false);

  fire('focus');
  assert.equal(inst._readyByInteracting, true);

  fire('blur');
  assert.equal(inst._readyByInteracting, false);
});

test('_bindReadyByPicker() is a no-op when the input is not present in the DOM', () => {
  const inst = makeInstance();
  inst._readyByInteracting = false;
  inst.shadowRoot = { getElementById: () => null };
  assert.doesNotThrow(() => inst._bindReadyByPicker());
  assert.equal(inst._readyByInteracting, false);
});
