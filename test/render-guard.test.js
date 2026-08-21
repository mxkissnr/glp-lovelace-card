// Render-guard centralization + pending-render catch-up (#72). Same
// vm-context approach as the other suites: loads the real glp-card.js into a
// sandboxed vm context and exercises GlpCard.prototype methods directly,
// without a real shadow DOM/customElements.
//
// `_render()` itself (full shadow-DOM rebuild) is out of scope here, same
// boundary as the rest of this suite (see ready-by.test.js) — it is spied on
// instead of exercised for real; visual correctness is verified separately
// via `npm run screenshot`. The spy also clears `_pendingRender`, mirroring
// the real `_render()`'s own contract (glp-card.js: it resets
// `this._pendingRender = false` as soon as an actual render happens) so the
// "replayed exactly once" assertions below are meaningful.
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

function makeInstance() {
  const inst = Object.create(GlpCard.prototype);
  inst._profileInteracting = false;
  inst._animating = false;
  inst._maintConfirm = null;
  inst._readyByInteracting = false;
  inst._touchActive = false;
  inst._pendingRender = false;
  return inst;
}

// Stands in for the constructor's `this.addEventListener(...)` calls (the
// fake HTMLElement in this vm context has none) so `_bindTouchGuard()` can be
// exercised directly, same approach as the fake shadowRoot input further
// below for `_bindReadyByPicker()`.
function bindFakeTouchGuard(inst) {
  const listeners = {};
  inst.addEventListener = (type, handler) => { listeners[type] = handler; };
  inst._bindTouchGuard();
  return listeners;
}

// Replaces `_render` with a counting spy that also clears `_pendingRender`,
// mirroring the real method's contract (see file header).
function spyOnRender(inst) {
  let count = 0;
  inst._render = () => { count++; inst._pendingRender = false; };
  return () => count;
}

// ── _renderBlocked() ────────────────────────────────────────────────────────

test('_renderBlocked() is false when no guard flag is set', () => {
  const inst = makeInstance();
  assert.equal(inst._renderBlocked(), false);
});

test('_renderBlocked() is true for each guard flag independently', () => {
  const flags = ['_profileInteracting', '_animating', '_readyByInteracting', '_touchActive'];
  for (const flag of flags) {
    const inst = makeInstance();
    inst[flag] = true;
    assert.equal(inst._renderBlocked(), true, `expected blocked when ${flag} is true`);
  }
  const inst = makeInstance();
  inst._maintConfirm = 'descale';
  assert.equal(inst._renderBlocked(), true, 'expected blocked when _maintConfirm is set');
});

// ── _requestRender() ────────────────────────────────────────────────────────

test('_requestRender() renders immediately when nothing blocks (unchanged behavior)', () => {
  const inst = makeInstance();
  const renderCount = spyOnRender(inst);
  inst._requestRender();
  assert.equal(renderCount(), 1);
  assert.equal(inst._pendingRender, false);
});

test('_requestRender() defers via _pendingRender instead of rendering when blocked', () => {
  const inst = makeInstance();
  inst._profileInteracting = true;
  const renderCount = spyOnRender(inst);
  inst._requestRender();
  assert.equal(renderCount(), 0);
  assert.equal(inst._pendingRender, true);
});

// ── catch-up on guard release ───────────────────────────────────────────────

test('a blocked render is replayed exactly once once the blocking interaction ends (ready-by blur)', () => {
  const inst = makeInstance();
  const renderCount = spyOnRender(inst);

  const listeners = {};
  const fakeInput = { addEventListener(type, handler) { listeners[type] = handler; } };
  inst.shadowRoot = { getElementById: id => (id === 'glp-readyby-input' ? fakeInput : null) };
  inst._bindReadyByPicker();

  listeners.focus();
  assert.equal(inst._readyByInteracting, true);

  // A render request arrives mid-interaction — must be deferred, not dropped.
  inst._requestRender();
  assert.equal(renderCount(), 0);
  assert.equal(inst._pendingRender, true);

  // Interaction ends — the deferred render is replayed exactly once.
  listeners.blur();
  assert.equal(inst._readyByInteracting, false);
  assert.equal(renderCount(), 1);
  assert.equal(inst._pendingRender, false);

  // A second, unrelated blur (no pending render outstanding) must not
  // trigger another render.
  listeners.focus();
  listeners.blur();
  assert.equal(renderCount(), 1);
});

test('blur with nothing pending does not force a render (no-op catch-up)', () => {
  const inst = makeInstance();
  const renderCount = spyOnRender(inst);

  const listeners = {};
  const fakeInput = { addEventListener(type, handler) { listeners[type] = handler; } };
  inst.shadowRoot = { getElementById: id => (id === 'glp-readyby-input' ? fakeInput : null) };
  inst._bindReadyByPicker();

  listeners.focus();
  listeners.blur();
  assert.equal(renderCount(), 0);
});

test('a render requested while blocked by one flag is still deferred if another flag remains set on release', () => {
  const inst = makeInstance();
  inst._profileInteracting = true;
  const renderCount = spyOnRender(inst);

  const listeners = {};
  const fakeInput = { addEventListener(type, handler) { listeners[type] = handler; } };
  inst.shadowRoot = { getElementById: id => (id === 'glp-readyby-input' ? fakeInput : null) };
  inst._bindReadyByPicker();

  listeners.focus(); // _readyByInteracting = true too, now two flags block
  inst._requestRender();
  assert.equal(renderCount(), 0);
  assert.equal(inst._pendingRender, true);

  // Only the ready-by interaction ends — _profileInteracting is still true,
  // so the render must stay deferred rather than firing early.
  listeners.blur();
  assert.equal(renderCount(), 0);
  assert.equal(inst._pendingRender, true);

  // Now the remaining flag clears too, and a fresh _requestRender() (as the
  // real call sites would issue on their own next trigger) flushes it.
  inst._profileInteracting = false;
  inst._requestRender();
  assert.equal(renderCount(), 1);
});

// ── touch guard (#147 — iOS: page couldn't scroll past the card because a
// `set hass()`-triggered innerHTML rebuild mid-gesture aborted the WKWebView
// touch-scroll) ──────────────────────────────────────────────────────────────

test('_bindTouchGuard(): touchstart sets _touchActive, touchend (last finger) clears it', () => {
  const inst = makeInstance();
  const listeners = bindFakeTouchGuard(inst);

  listeners.touchstart();
  assert.equal(inst._touchActive, true);

  listeners.touchend({ touches: [] });
  assert.equal(inst._touchActive, false);
});

test('_bindTouchGuard(): touchcancel also clears _touchActive (e.g. an interrupted gesture)', () => {
  const inst = makeInstance();
  const listeners = bindFakeTouchGuard(inst);

  listeners.touchstart();
  listeners.touchcancel({ touches: [] });
  assert.equal(inst._touchActive, false);
});

test('a render requested while the finger is on the card is deferred, then replayed exactly once on touchend', () => {
  const inst = makeInstance();
  const renderCount = spyOnRender(inst);
  const listeners = bindFakeTouchGuard(inst);

  listeners.touchstart();
  inst._requestRender();
  assert.equal(renderCount(), 0, 'must not rebuild the DOM while the finger is still on the card');
  assert.equal(inst._pendingRender, true);

  listeners.touchend({ touches: [] });
  assert.equal(renderCount(), 1, 'the deferred render must be replayed exactly once on touchend');
  assert.equal(inst._pendingRender, false);
});

test('touchcancel replays a pending render exactly once, same as touchend', () => {
  const inst = makeInstance();
  const renderCount = spyOnRender(inst);
  const listeners = bindFakeTouchGuard(inst);

  listeners.touchstart();
  inst._requestRender();
  assert.equal(renderCount(), 0);

  listeners.touchcancel({ touches: [] });
  assert.equal(renderCount(), 1);
});

// A `touchend` fires once per finger lifted, not once all fingers are gone
// (Touch Events spec) — e.g. an accidental second finger resting near the
// card's edge while scrolling, or a pinch/zoom starting on the card. Lifting
// the *first* finger must not release the guard while the second is still in
// contact, or it reproduces the #147 mid-gesture rebuild for the
// multi-touch case.
test('_bindTouchGuard(): a second finger on the card keeps the guard held until touches.length reaches 0', () => {
  const inst = makeInstance();
  const renderCount = spyOnRender(inst);
  const listeners = bindFakeTouchGuard(inst);

  listeners.touchstart(); // first finger down
  listeners.touchstart(); // second finger down
  inst._requestRender();
  assert.equal(renderCount(), 0);
  assert.equal(inst._pendingRender, true);

  // First finger lifts — one touch point remains in contact.
  listeners.touchend({ touches: [{}] });
  assert.equal(inst._touchActive, true, 'guard must stay held while a second finger is still touching');
  assert.equal(renderCount(), 0, 'must not rebuild the DOM while a finger is still on the card');

  // Second (last) finger lifts — no touch points remain.
  listeners.touchend({ touches: [] });
  assert.equal(inst._touchActive, false);
  assert.equal(renderCount(), 1, 'the deferred render must be replayed exactly once once all fingers are gone');
  assert.equal(inst._pendingRender, false);
});

test('set hass() pushes during an active touch do not rebuild the DOM, and touchend catches up with the latest hass state', () => {
  const inst = makeInstance();
  inst._startOrdersPoll = () => {};
  inst._loadBeansInfo = () => {};
  inst._ordersPoll = 1; // already "running" — set hass() must not try to start it again
  const listeners = bindFakeTouchGuard(inst);

  let renderedWith = null;
  inst._render = () => { renderedWith = inst._hass; inst._pendingRender = false; };

  listeners.touchstart();

  inst.hass = { states: {}, language: 'en' }; // mid-scroll hass push #1
  assert.equal(renderedWith, null, 'no rebuild while _touchActive is true');
  assert.equal(inst._pendingRender, true);

  const latest = { states: {}, language: 'en' };
  inst.hass = latest; // hass push #2, still mid-gesture — still deferred
  assert.equal(renderedWith, null);

  listeners.touchend({ touches: [] });
  assert.equal(renderedWith, latest, 'the catch-up render must see the latest hass state, not a stale one');
});
