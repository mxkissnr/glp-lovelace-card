// Local-dev-only consistency check: the GLP-TOKENS block (shared HA-theme hybrid
// tokens + chart series palette) must stay byte-identical between this repo and
// glp-order-card, so both cards render with the same hybrid theming contract.
// Skips cleanly whenever there's nothing to compare yet: neighbor repo not
// checked out, or checked out but without its own GLP-TOKENS block yet.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Anchor on the short, stable prefix rather than the full marker sentence —
// the marker's wording (currently naming both files) is itself part of the
// compared block and must stay identical too, but the search anchor
// shouldn't break if that wording is ever tweaked in lockstep on both sides.
const START = '/* GLP-TOKENS v1';
const END = '/* /GLP-TOKENS v1 */';

function extractTokenBlock(src) {
  const startIdx = src.indexOf(START);
  const endIdx = src.indexOf(END);
  if (startIdx === -1 || endIdx === -1) return null;
  return src.slice(startIdx, endIdx + END.length);
}

test('GLP-TOKENS block is byte-identical with glp-order-card.js (skips if neighbor repo/block absent)', (t) => {
  const neighborPath = path.join(os.homedir(), 'Dokumente', 'Projekte', 'glp-project', 'glp-order-card', 'glp-order-card.js');
  if (!fs.existsSync(neighborPath)) {
    t.skip(`glp-order-card.js not found at ${neighborPath} — local-dev-only check, skipping`);
    return;
  }

  const ownSrc = fs.readFileSync(path.join(__dirname, '..', 'glp-card.js'), 'utf8');
  const neighborSrc = fs.readFileSync(neighborPath, 'utf8');

  const ownBlock = extractTokenBlock(ownSrc);
  const neighborBlock = extractTokenBlock(neighborSrc);

  assert.ok(ownBlock, 'glp-card.js must contain a GLP-TOKENS v1 block');

  if (!neighborBlock) {
    // glp-order-card hasn't picked up the shared contract yet (companion issue
    // #39 not implemented) — nothing to compare against yet, so skip rather
    // than fail. Once it adds its own GLP-TOKENS v1 block, this test starts
    // asserting the two stay byte-identical.
    t.skip('glp-order-card.js has no GLP-TOKENS v1 block yet — companion issue not implemented, skipping');
    return;
  }

  assert.equal(neighborBlock, ownBlock, 'GLP-TOKENS block drifted between glp-card.js and glp-order-card.js');
});
