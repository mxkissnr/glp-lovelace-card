// Shared test loader for the card source (#180). The card ships as a classic
// script bundled into a single IIFE, so its class and top-level helpers are not
// reachable from the page; the tests instead import them straight from
// src/glp-card.ts. Where the runtime can load that source itself it is used
// directly (Node's native TypeScript support is on by default from 22.18/23.6
// and available with --experimental-strip-types from 22.6); where it cannot the
// source is bundled with esbuild — the same bundler `npm run build` uses — into
// an in-memory CommonJS module, so the tests load the same way on every
// supported Node. The module is evaluated once per test process, so every test
// file calls loadCard() once.
'use strict';

const path = require('node:path');
const Module = require('node:module');

const CARD_TS = path.join(__dirname, '..', '..', 'src', 'glp-card.ts');

// Bundle the entry point (and its imports, including the ESM-only `lit`
// dependency) into one CommonJS module and evaluate it in memory.
function bundleWithEsbuild(file) {
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

function loadTsModule(file) {
  // Try the runtime's own handling first — fastest where it works. It throws
  // with ERR_UNKNOWN_FILE_EXTENSION when native type stripping is off, and with
  // ERR_REQUIRE_ESM (or a similar load error) on runtimes whose require() cannot
  // pull in the ESM modules the source imports; either way the esbuild bundle
  // below loads the very same source. A genuine error inside the card module
  // would make the bundle fail too, so the original error is rethrown then.
  try {
    return require(file);
  } catch (err) {
    try {
      return bundleWithEsbuild(file);
    } catch {
      throw err;
    }
  }
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
