// Shared loader for the real glp-card.js in a sandboxed vm context.
//
// Every vm-based test suite needs the same two things: the sandbox globals the
// card expects (HTMLElement, customElements, ...) and a source patch that
// promotes the top-level `class GlpCard` onto the sandbox so its prototype can
// be exercised directly. Keeping the sandbox and the patch here — rather than
// copied into each suite — means the later TypeScript/esbuild build switch only
// has to update the anchor in one place.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const CARD_PATH = path.join(__dirname, '..', '..', 'glp-card.js');
const ANCHOR = "customElements.define('glp-card', GlpCard);";

class HTMLElement {}

function loadCard({ expose = [], context = {} } = {}) {
  const source = fs.readFileSync(CARD_PATH, 'utf8');
  if (!source.includes(ANCHOR)) {
    throw new Error(
      `loadCard: could not find the source anchor ${ANCHOR} in ${CARD_PATH} — ` +
        'the test patch no longer matches the card (did the build switch quote style?)'
    );
  }

  // A top-level `class` declaration does not become a property of the vm
  // context, so append explicit globalThis assignments after the define() call.
  const patch = [
    ANCHOR,
    'globalThis.__GlpCard = GlpCard;',
    ...expose.map((name) => `globalThis.${name} = ${name};`),
  ].join(' ');

  const sandbox = {
    HTMLElement,
    customElements: {
      define() {},
      get() {},
      whenDefined() {
        return new Promise(() => {});
      },
    },
    window: {},
    console,
    URL,
    setTimeout,
    clearTimeout,
    ...context,
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(source.replace(ANCHOR, patch), sandbox, { filename: CARD_PATH });

  const exposed = Object.fromEntries(expose.map((name) => [name, sandbox[name]]));
  return { GlpCard: sandbox.__GlpCard, ...exposed };
}

module.exports = { loadCard };
