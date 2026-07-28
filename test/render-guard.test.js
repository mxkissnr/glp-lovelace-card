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
  vm.runInContext(src, context, { filename: 'glp-card.js' });
  return context.__GlpCard;
}

const GlpCard = loadGlpCard();

function makeInstance() {
  const inst = Object.create(GlpCard.prototype);
  inst._profileInteracting = false;
  inst._animating = false;
  inst._maintConfirm = null;
  inst._readyByInteracting = false;
  inst._pendingRender = false;
  return inst;
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
  const flags = ['_profileInteracting', '_animating', '_readyByInteracting'];
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
