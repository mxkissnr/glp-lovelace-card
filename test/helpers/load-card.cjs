// Shared test loader for the card source (#180). The card ships as a classic
// script bundled into a single IIFE, so its class and top-level helpers are not
// reachable from the page; the tests instead import them straight from
// src/glp-card.ts. Node loads that directly through its native TypeScript
// support where it is on by default (Node >= 22.18 / 23.6); on runtimes without
// it the source is bundled with esbuild — the same bundler `npm run build`
// uses — into an in-memory CommonJS module, so the tests load the same way on
// every supported Node. The module is evaluated once per test process, so every
// test file calls loadCard() once.
'use strict';

const path = require('node:path');
const Module = require('node:module');

const CARD_TS = path.join(__dirname, '..', '..', 'src', 'glp-card.ts');

function loadTsModule(file) {
  // process.features.typescript reports whether native type stripping is
  // actually on (Node 22.6-22.17 need --experimental-strip-types; 22.18+/23.6+
  // enable it by default), so it is the reliable switch rather than a version
  // check.
  if (process.features && process.features.typescript) return require(file);

  // Fallback for runtimes without native stripping: esbuild bundles the source
  // (and the ESM-only `lit` dependency, which a bare require() of the .ts file
  // cannot pull in) into one in-memory CommonJS module.
  const esbuild = require('esbuild');
  const { outputFiles } = esbuild.buildSync({
    entryPoints: [file],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    write: false,
    logLevel: 'silent',
  });
  const compiled = new Module(file, module);
  compiled.filename = file;
  compiled.paths = Module._nodeModulePaths(path.dirname(file));
  compiled._compile(outputFiles[0].text, file);
  return compiled.exports;
}

function loadCard({ expose = [], context = {} } = {}) {
  const stubs = {
    HTMLElement: class HTMLElement {},
    customElements: { define() {}, get() {}, whenDefined() { return new Promise(() => {}); } },
    window: {},
    navigator: { language: 'en-US' },
    // Lit's runtime calls document.createTreeWalker while it is imported; the
    // DOM-rendering suites override this with a real happy-dom document.
    document: { createTreeWalker() { return {}; } },
    ...context,
  };
  // defineProperty, not assignment: Node already defines some of these (e.g.
  // `navigator`) as getter-only globals, so a plain `globalThis.navigator = ...`
  // would throw.
  for (const [name, value] of Object.entries(stubs)) {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }

  const mod = loadTsModule(CARD_TS);
  const result = { GlpCard: mod.GlpCard };
  for (const name of expose) result[name] = mod[name];
  return result;
}

module.exports = { loadCard };
