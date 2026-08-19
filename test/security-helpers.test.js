// Loads the real glp-card.js source into a sandboxed vm context (stubbing
// only the browser globals it touches at top level: customElements, window,
// console) and pulls the actual esc()/safeUrl() function declarations out of
// it — so these tests exercise the shipped code, not a re-implementation.
// glp-card.js stays a single, build-step-free file; nothing here changes how
// it loads in HA.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCardHelpers() {
  let src = fs.readFileSync(path.join(__dirname, '..', 'glp-card.js'), 'utf8');
  // #141: glp-card.js is wrapped in an IIFE to avoid a top-level const
  // collision with the bundled glp-order-card.js, so esc()/safeUrl() no
  // longer auto-attach to the vm context's global object — expose them
  // explicitly for this test, same injection approach as __GlpCard below.
  src = src.replace(
    "customElements.define('glp-card', GlpCard);",
    "customElements.define('glp-card', GlpCard); globalThis.esc = esc; globalThis.safeUrl = safeUrl;"
  );

  class HTMLElement {}

  const context = {
    HTMLElement,
    customElements: { define() {} },
    window: {},
    console,
    URL,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(src, context, { filename: path.join(__dirname, '..', 'glp-card.js') });

  return { esc: context.esc, safeUrl: context.safeUrl };
}

const { esc, safeUrl } = loadCardHelpers();

test('esc() escapes HTML special characters', () => {
  assert.equal(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(esc('&'), '&amp;');
  assert.equal(esc('"'), '&quot;');
  assert.equal(esc("'"), '&#39;');
  assert.equal(esc('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('esc() neutralizes a quote-breakout attribute-injection payload', () => {
  const payload = `"><script>alert(document.cookie)</script>`;
  const escaped = esc(payload);
  assert.ok(!escaped.includes('<script>'));
  assert.ok(!escaped.includes('"'));
});

test('esc() handles null/undefined/number input', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(42), '42');
});

test('safeUrl() accepts http(s) URLs', () => {
  assert.equal(safeUrl('https://example.com/path'), 'https://example.com/path');
  assert.equal(safeUrl('http://192.168.1.50:8099'), 'http://192.168.1.50:8099/');
});

test('safeUrl() rejects javascript: URLs', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
});

test('safeUrl() rejects data: URLs', () => {
  assert.equal(safeUrl('data:text/html,<script>alert(1)</script>'), null);
});

test('safeUrl() rejects other non-http(s) schemes', () => {
  assert.equal(safeUrl('file:///etc/passwd'), null);
  assert.equal(safeUrl('vbscript:msgbox(1)'), null);
});

test('safeUrl() rejects malformed input', () => {
  assert.equal(safeUrl('not a url'), null);
  assert.equal(safeUrl(''), null);
  assert.equal(safeUrl(null), null);
});
