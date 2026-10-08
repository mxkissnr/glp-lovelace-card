// Ready-by preheat scheduler tests (#61). Card loaded via the shared test
// helper (test/helpers/load-card.cjs), which evaluates the real glp-card.js
// and exposes GlpCard.prototype methods to the test directly, without a real
// shadow DOM/customElements — covers only the pure-logic pieces
// (_resolveReadyByTarget's today/tomorrow date math, _readReadyBy's
// hass.states parsing), per this suite's existing boundary of not testing
// markup or hass.callService invocation.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCard } = require('./helpers/load-card.cjs');

const { GlpCard } = loadCard();

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
  // pending value constructed from the ISO string (not local y/m/d/h/m/s
  // fields) so the getTime() match against the sensor's UTC state is
  // timezone-independent.
  inst._pendingReadyByTargetAt = new Date('2026-07-28T07:00:00.000Z');
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt.toISOString(), '2026-07-28T07:00:00.000Z');
  assert.equal(plannedAt.toISOString(), '2026-07-28T06:40:00.000Z');
  // resolved — pending override cleared so future renders read the sensor
  assert.equal(inst._pendingReadyByTargetAt, null);
});

test('_readReadyBy() (#70) keeps a pending re-schedule when the sensor still reports the old target', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      // sensor still holds the *old* target — hasn't caught up to the new pick yet
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: '2026-07-28T07:00:00.000Z' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: '2026-07-28T06:40:00.000Z' },
    },
  });
  const newPending = new Date('2026-07-28T08:00:00.000Z'); // 08:00, different from the sensor's 07:00
  inst._pendingReadyByTargetAt = newPending;
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt, newPending);
  assert.equal(plannedAt, null);
  // not confirmed yet — a truthy-but-mismatched realTargetAt must not clear it
  assert.equal(inst._pendingReadyByTargetAt, newPending);
});

test('_readReadyBy() (#70) clears a pending re-schedule once the sensor reports the matching new target', () => {
  const inst = makeInstance({
    states: {
      'sensor.gaggiuino_local_profiler_machine_status': { attributes: {} },
      'sensor.gaggiuino_local_profiler_preheat_ready_by_target_at': { state: '2026-07-28T08:00:00.000Z' },
      'sensor.gaggiuino_local_profiler_preheat_planned_switch_on_at': { state: '2026-07-28T07:40:00.000Z' },
    },
  });
  inst._pendingReadyByTargetAt = new Date('2026-07-28T08:00:00.000Z');
  const { targetAt, plannedAt } = inst._readReadyBy();
  assert.equal(targetAt.toISOString(), '2026-07-28T08:00:00.000Z');
  assert.equal(plannedAt.toISOString(), '2026-07-28T07:40:00.000Z');
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

// ── ready-by focus/blur handlers / _readyByInteracting guard (#64) ──────────
// The focus/blur listeners now live in the Lit template, so the handlers are
// exercised directly; they toggle the flag the render-gates check.

test('_readyByFocus()/_readyByBlur() toggle _readyByInteracting', () => {
  const inst = makeInstance();
  inst._readyByInteracting = false;

  assert.equal(inst._readyByInteracting, false);
  inst._readyByFocus();
  assert.equal(inst._readyByInteracting, true);

  inst._readyByBlur();
  assert.equal(inst._readyByInteracting, false);
});

test('_readyByBlur() replays a render deferred while the input was focused', () => {
  const inst = makeInstance();
  inst._readyByInteracting = false;
  inst._pendingRender = false;
  let rendered = 0;
  inst._render = () => { rendered++; inst._pendingRender = false; };

  inst._readyByFocus();
  inst._requestRender();
  assert.equal(rendered, 0);
  assert.equal(inst._pendingRender, true);

  inst._readyByBlur();
  assert.equal(inst._readyByInteracting, false);
  assert.equal(rendered, 1);
  assert.equal(inst._pendingRender, false);
});
