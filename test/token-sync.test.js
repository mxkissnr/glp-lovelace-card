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
// of seven for a while. A marker missing on the neighbor (or a byte-level
// mismatch) is drift, not a legitimate transitional state, and fails —
// UNLESS the block is listed in TRANSITIONAL below, see that comment.
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
//
// GLP_ORDER_CARD_PATH, when set, is a single file path and wins as-is (CI
// points it at the glp-order-card.js it checks out). The local default is
// that sibling checkout's directory, and describes two cases: if it has a
// src/ directory — the Order Card's TypeScript sources, since its shipped
// glp-order-card.js is now an esbuild bundle without the GLP-SHARED markers —
// the neighbor source is every src/*.ts file, sorted by name and joined with
// '\n'; otherwise it is the checkout's root glp-order-card.js.
const NEIGHBOR_PATH = process.env.GLP_ORDER_CARD_PATH
  || path.join(os.homedir(), 'Dokumente', 'Projekte', 'glp-project', 'glp-order-card');

// Returns the neighbor's shared-block source text, or null when the neighbor
// checkout (or the CI-provided file) is not present.
function readNeighborSource() {
  if (process.env.GLP_ORDER_CARD_PATH) {
    return fs.existsSync(NEIGHBOR_PATH) ? fs.readFileSync(NEIGHBOR_PATH, 'utf8') : null;
  }
  const srcDir = path.join(NEIGHBOR_PATH, 'src');
  if (fs.existsSync(srcDir)) {
    return fs.readdirSync(srcDir)
      .filter((name) => name.endsWith('.ts'))
      .sort()
      .map((name) => fs.readFileSync(path.join(srcDir, name), 'utf8'))
      .join('\n');
  }
  const bundle = path.join(NEIGHBOR_PATH, 'glp-order-card.js');
  return fs.existsSync(bundle) ? fs.readFileSync(bundle, 'utf8') : null;
}

const IN_CI = !!process.env.CI;

// esbuild strips the GLP-SHARED/GLP-TOKENS marker comments, so the shared
// blocks can only be extracted from the src/*.ts sources, not the bundle (#180).
const OWN_SRC = fs.readdirSync(path.join(__dirname, '..', 'src'))
  .filter((name) => name.endsWith('.ts'))
  .sort()
  .map((name) => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8'))
  .join('\n');

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
  { name: 'GLP-SHARED:icons v1',         start: '// GLP-SHARED:icons v1',         end: '// /GLP-SHARED:icons v1' },
  { name: 'GLP-SHARED:contrast v1',      start: '/* GLP-SHARED:contrast v1',      end: '/* /GLP-SHARED:contrast v1 */' },
  { name: 'GLP-SHARED:machine-match v1', start: '// GLP-SHARED:machine-match v1', end: '// /GLP-SHARED:machine-match v1' },
  { name: 'GLP-SHARED:app-theme-lookup v1', start: '// GLP-SHARED:app-theme-lookup v1', end: '// /GLP-SHARED:app-theme-lookup v1' },
];

// TRANSITIONAL — a merge-window escape hatch, NOT a standing exemption.
//
// Adding or changing a shared block always touches both repos, and both
// halves can never merge in the same instant — so for as long as one PR is
// open, this side and the neighbor's `main` are guaranteed to disagree on
// that block (missing marker, or a byte-level mismatch on the parts that
// changed). Without an escape hatch that's a deadlock: this repo's PR fails
// CI until the neighbor's PR merges, and the neighbor's PR fails CI on the
// blocks THIS PR touches until this PR merges.
//
// A block listed here is exempted from both failure modes (missing marker
// on the neighbor, byte-level mismatch) for the duration of that named
// companion PR only. Every entry MUST carry an issue reference — an entry
// without one is a bug, and the file refuses to load if it finds one (see
// the validation loop below). The list MUST be emptied immediately once the
// named companion PR(s) merge (#115 tracked this repo's post-#114 cleanup).
// A non-empty TRANSITIONAL outside of an active cross-repo merge window
// means the guard is silently checking less than it claims to, exactly the
// failure mode #113 was filed to fix in the first place.
//
// Normal state: EMPTY. Populate it only while a companion PR that changes a
// GLP-SHARED block is open on the neighbor repo, and empty it again in the
// same round that companion PR merges — see #115 for the shape that
// cleanup PR takes.
const TRANSITIONAL = {
  'GLP-SHARED:machine-icon v1': {
    issue: '#197',
    reason: "typed in lockstep; the Order Card's main still carries the untyped block until its next release",
  },
  'GLP-SHARED:icons v1': {
    issue: '#197',
    reason: "typed in lockstep; the Order Card's main still carries the untyped block until its next release",
  },
  'GLP-SHARED:contrast v1': {
    issue: '#197',
    reason: "typed in lockstep; the Order Card's main still carries the untyped block until its next release",
  },
  'GLP-SHARED:machine-match v1': {
    issue: '#197',
    reason: "typed in lockstep; the Order Card's main still carries the untyped block until its next release",
  },
  'GLP-SHARED:app-theme-lookup v1': {
    issue: '#197',
    reason: "typed in lockstep; the Order Card's main still carries the untyped block until its next release",
  },
};

for (const [name, entry] of Object.entries(TRANSITIONAL)) {
  if (!entry || !entry.issue) {
    throw new Error(`TRANSITIONAL entry "${name}" is missing an issue reference — that's a bug, not a valid transitional state`);
  }
}

function extractBlock(src, { start, end }) {
  const startIdx = src.indexOf(start);
  const endIdx = src.indexOf(end);
  if (startIdx === -1 || endIdx === -1) return null;
  return src.slice(startIdx, endIdx + end.length);
}

for (const block of BLOCKS) {
  test(`${block.name} block is byte-identical with glp-order-card.js (fails in CI if the neighbor repo/block is missing)`, (t) => {
    const neighborSrc = readNeighborSource();
    if (neighborSrc == null) {
      const msg = `glp-order-card sources not found at ${NEIGHBOR_PATH} — expected its src/*.ts sources or its root glp-order-card.js`;
      if (IN_CI) { assert.fail(`${msg} — CI is expected to check out the neighbor repo for this test`); }
      t.skip(`${msg} — local-dev-only check, skipping`);
      return;
    }

    const ownBlock = extractBlock(OWN_SRC, block);
    assert.ok(ownBlock, `glp-card.js must contain a ${block.name} block`);

    const neighborBlock = extractBlock(neighborSrc, block);
    const inSync = neighborBlock != null && neighborBlock === ownBlock;

    const transitional = TRANSITIONAL[block.name];
    if (transitional && !inSync) {
      // Loud on purpose — this must be impossible to miss scrolling a CI
      // log, not a quietly-skipped line among hundreds of others.
      const msg = `TRANSITIONAL: ${block.name} not checked, see ${transitional.issue} (${transitional.reason})`;
      console.log(`\n########## ${msg} ##########\n`);
      t.skip(msg);
      return;
    }

    // A block missing on the neighbor's side, or a byte-level mismatch, is
    // drift (or a companion change not landed) — fails, unless TRANSITIONAL
    // exempted it above.
    assert.ok(neighborBlock, `glp-order-card.js has no ${block.name} block — it must carry a matching marker`);
    assert.equal(neighborBlock, ownBlock, `${block.name} block drifted between glp-card.js and glp-order-card.js`);
  });
}
