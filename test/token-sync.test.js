// Consistency check for JS blocks intentionally kept byte-identical between
// this repo and glp-order-card.js — originally just the GLP-TOKENS CSS
// block, extended (#74) to the shared helpers that had already drifted
// (esc/safeUrl, the machine-status matching predicate) without anyone
// noticing, because the old version only ever compared the CSS block.
//
// A second gap in this same spirit (#113): glp-card.js grew markers for
// theme-presets, machine-icon, app-theme-lookup and contrast over time, but
// glp-order-card.js and/or this BLOCKS list didn't always grow the matching
// half in lockstep — and a marker missing on the neighbor's side used to
// always skip instead of fail, so the guard quietly checked one block out
// of seven for a while. Both sides now carry every marker in BLOCKS, so a
// marker missing there is no longer a legitimate transitional state — it
// fails, the same as a byte-level drift would.
//
// "Neighbor repo not checked out" is a normal, expected state for local dev
// (skip) but not for CI, which is expected to check the neighbor out
// (see .github/workflows/validate.yml) — there, its absence means the
// checkout step is broken and this fails instead of silently skipping.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Overridable so CI can point this at wherever it checks out the neighbor
// repo, without disturbing the local-dev default (a sibling checkout under
// ~/Dokumente/Projekte/glp-project, per this machine's layout).
const NEIGHBOR_PATH = process.env.GLP_ORDER_CARD_PATH
  || path.join(os.homedir(), 'Dokumente', 'Projekte', 'glp-project', 'glp-order-card', 'glp-order-card.js');

const IN_CI = !!process.env.CI;

const OWN_SRC = fs.readFileSync(path.join(__dirname, '..', 'glp-card.js'), 'utf8');

// Anchored on a short, stable prefix rather than the full marker sentence —
// the marker's wording (it names both files) is itself part of the compared
// block and must stay identical too, but the search anchor shouldn't break
// if that wording is ever tweaked in lockstep on both sides.
const BLOCKS = [
  { name: 'GLP-TOKENS v1',               start: '/* GLP-TOKENS v1',               end: '/* /GLP-TOKENS v1 */' },
  { name: 'GLP-SHARED:esc v1',           start: '// GLP-SHARED:esc v1',           end: '// /GLP-SHARED:esc v1' },
  { name: 'GLP-SHARED:safeUrl v1',       start: '// GLP-SHARED:safeUrl v1',       end: '// /GLP-SHARED:safeUrl v1' },
  { name: 'GLP-SHARED:theme-presets v1', start: '// GLP-SHARED:theme-presets v1', end: '// /GLP-SHARED:theme-presets v1' },
  { name: 'GLP-SHARED:machine-icon v1',  start: '// GLP-SHARED:machine-icon v1',  end: '// /GLP-SHARED:machine-icon v1' },
  { name: 'GLP-SHARED:contrast v1',      start: '/* GLP-SHARED:contrast v1',      end: '/* /GLP-SHARED:contrast v1 */' },
  { name: 'GLP-SHARED:machine-match v1', start: '// GLP-SHARED:machine-match v1', end: '// /GLP-SHARED:machine-match v1' },
  { name: 'GLP-SHARED:app-theme-lookup v1', start: '// GLP-SHARED:app-theme-lookup v1', end: '// /GLP-SHARED:app-theme-lookup v1' },
];

function extractBlock(src, { start, end }) {
  const startIdx = src.indexOf(start);
  const endIdx = src.indexOf(end);
  if (startIdx === -1 || endIdx === -1) return null;
  return src.slice(startIdx, endIdx + end.length);
}

for (const block of BLOCKS) {
  test(`${block.name} block is byte-identical with glp-order-card.js (fails in CI if the neighbor repo/block is missing)`, (t) => {
    if (!fs.existsSync(NEIGHBOR_PATH)) {
      const msg = `glp-order-card.js not found at ${NEIGHBOR_PATH}`;
      if (IN_CI) { assert.fail(`${msg} — CI is expected to check out the neighbor repo for this test`); }
      t.skip(`${msg} — local-dev-only check, skipping`);
      return;
    }

    const ownBlock = extractBlock(OWN_SRC, block);
    assert.ok(ownBlock, `glp-card.js must contain a ${block.name} block`);

    const neighborSrc = fs.readFileSync(NEIGHBOR_PATH, 'utf8');
    const neighborBlock = extractBlock(neighborSrc, block);
    // A block missing on the neighbor's side used to always skip here (an
    // "expected transitional state, companion change not landed yet") — but
    // every block in BLOCKS now has a matching marker on both sides (#113),
    // so a marker disappearing from the neighbor is drift, not a transition,
    // and must fail exactly like a byte-level mismatch would.
    assert.ok(neighborBlock, `glp-order-card.js has no ${block.name} block — it must carry a matching marker`);

    assert.equal(neighborBlock, ownBlock, `${block.name} block drifted between glp-card.js and glp-order-card.js`);
  });
}
