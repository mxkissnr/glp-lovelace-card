// Minimal Playwright E2E smoke test. Reuses the static-server harness from
// scripts/e2e-harness.mjs (shared with scripts/screenshot.mjs) to render the
// real glp-card.js in a headless Chromium tab -- not a vm sandbox -- so it
// can exercise real custom-element lifecycle, shadow DOM and pointerdown
// event wiring that vm.runInContext-based unit tests structurally can't
// reach. Mirrors glp-order-card's test/e2e/smoke.test.mjs (same harness
// shape, same npm test auto-discovery via test/**/*.test.mjs).
//
// Covers three things pure unit tests can't: (1) the card actually mounts
// and renders real DOM in a browser, (2) a switch entity going
// 'unavailable' collapses to the defined off-card branch instead of
// throwing, and (3) the ready-by optimistic-UI guard (_pendingReadyByTargetAt,
// see glp-card.js's _readReadyBy()) survives a concurrently-arriving `hass`
// push wired through the *real* pointerdown handler and _render() -- the
// exact bug class (#66/#68/#70) that ready-by.test.js covers in isolation
// on the pure _readReadyBy()/_resolveReadyByTarget() functions, but can't
// prove is actually connected end-to-end.
'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../../scripts/e2e-harness.mjs';

const PREFIX = 'sensor.gaggiuino_local_profiler_';

function buildMockStates({ switchState = 'on', readyByTarget = 'unknown' } = {}) {
  const now = Date.now();
  return {
    [PREFIX + 'machine_status']: {
      state: 'online',
      attributes: {
        switch_entity: 'switch.gaggiuino_local_profiler_machine',
        recent_shots: [{ id: 1, profile: 'Standard Espresso', coffee: 'Bombe', drink_type: 'Espresso' }],
      },
    },
    'switch.gaggiuino_local_profiler_machine': {
      state: switchState,
      last_changed: new Date(now - 3600 * 1000).toISOString(),
      attributes: {},
    },
    [PREFIX + 'preheat_ready_by_target_at']:      { state: readyByTarget, attributes: {} },
    [PREFIX + 'preheat_planned_switch_on_at']:    { state: 'unknown', attributes: {} },
  };
}

function harnessHtml(mockStates) {
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body>
<div id="wrap"><glp-card id="card"></glp-card></div>
<script type="module" src="/glp-card.js"></script>
<script type="module">
  const mockStates = ${JSON.stringify(mockStates)};
  const card = document.getElementById('card');
  card.setConfig({ title: 'Gaggiuino', entity_prefix: '${PREFIX}' });
  card.hass = { language: 'de', states: mockStates, callService: () => {} };
</script>
</body></html>`;
}

// The page.evaluate()/waitForFunction() callbacks below run inside the
// browser tab via Playwright, not in this Node process -- `document` is a
// real global there, even though ESLint's static analysis (correctly, for
// a .mjs Node test file) doesn't know that.
/* eslint-disable no-undef */

async function setUpCard(mockStates, readySelector) {
  const server = await startServer(harnessHtml(mockStates));
  const { port } = server.address();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err));
  await page.goto(`http://127.0.0.1:${port}/__harness.html`);
  await page.waitForFunction(sel => {
    const el = document.querySelector('glp-card');
    return !!el?.shadowRoot?.querySelector(sel);
  }, readySelector, { timeout: 10000 });
  return { server, browser, page, pageErrors };
}

async function tearDown({ server, browser }) {
  await browser.close();
  server.close();
}

test('card renders the hero view with a realistic mocked hass', async () => {
  const ctx = await setUpCard(buildMockStates(), '.shot-profile');
  const { page, pageErrors } = ctx;
  try {
    const profileText = await page.evaluate(() =>
      document.querySelector('glp-card').shadowRoot.querySelector('.shot-profile').textContent);
    assert.equal(profileText, 'Standard Espresso');
    assert.deepEqual(pageErrors, []);
  } finally {
    await tearDown(ctx);
  }
});

test('switch entity going unavailable collapses to the off-card without throwing', async () => {
  const ctx = await setUpCard(buildMockStates({ switchState: 'unavailable' }), '.card.collapsed');
  const { page, pageErrors } = ctx;
  try {
    const offLabelShown = await page.evaluate(() =>
      !!document.querySelector('glp-card').shadowRoot.querySelector('.off-label'));
    assert.equal(offLabelShown, true);
    assert.deepEqual(pageErrors, [], 'an unavailable switch entity must not throw during render');
  } finally {
    await tearDown(ctx);
  }
});

test('a concurrent hass update does not clobber an in-progress ready-by pick', async () => {
  const ctx = await setUpCard(buildMockStates({ switchState: 'off' }), '.ready-by-picker');
  const { page, pageErrors } = ctx;
  try {
    await page.locator('#glp-readyby-input').fill('07:30');
    // Real pointerdown-driven click (the card binds its action handlers on
    // 'pointerdown', not 'click' -- a page.evaluate(() => el.click()) would
    // silently no-op here since the native .click() method never dispatches
    // pointerdown).
    await page.locator('[data-action="set-ready-by"]').click();

    await page.waitForFunction(() => {
      const el = document.querySelector('glp-card');
      return !!el?.shadowRoot?.querySelector('.ready-by-set');
    }, { timeout: 5000 });

    const pendingAfterClick = await page.evaluate(() =>
      !!document.querySelector('glp-card')._pendingReadyByTargetAt);
    assert.equal(pendingAfterClick, true, 'optimistic target is set right after the click');

    // Simulate a hass push landing before the backend has confirmed the new
    // schedule (preheat_ready_by_target_at still 'unknown') -- the exact
    // race #66/#70 guard against: a concurrently-arriving hass update must
    // not wipe the just-picked, still-unconfirmed target.
    await page.evaluate(mockStates => {
      const el = document.querySelector('glp-card');
      el.hass = { language: 'de', states: mockStates, callService: () => {} };
    }, buildMockStates({ switchState: 'off' }));

    const state = await page.evaluate(() => {
      const el = document.querySelector('glp-card');
      return {
        pendingTargetAt: !!el._pendingReadyByTargetAt,
        readySetShown: !!el.shadowRoot.querySelector('.ready-by-set'),
        pickerShown: !!el.shadowRoot.querySelector('.ready-by-picker'),
      };
    });
    assert.equal(state.pendingTargetAt, true, 'pending target survives the concurrent hass push');
    assert.equal(state.readySetShown, true, 'still shows the set/cancel view, not reverted to the picker');
    assert.equal(state.pickerShown, false);
    assert.deepEqual(pageErrors, []);
  } finally {
    await tearDown(ctx);
  }
});
/* eslint-enable no-undef */
