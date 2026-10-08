// Smoke test for the shared card loader (#180): the other suites cannot even
// start if src/glp-card.ts fails to load, and the failure then shows up only as
// a generic file-level "test failed". This fails with a one-line summary of the
// environment when the loader is broken and passes when it works.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function brief(e) {
  return (e && e.code ? e.code + ':' : '') + String(e && e.message ? e.message : e).split('\n')[0].slice(0, 200);
}

test('card source loads in this environment', () => {
  const root = path.join(__dirname, '..');
  const card = path.join(root, 'src', 'glp-card.ts');
  const info = [];
  info.push('node=' + process.version);
  info.push('execPath=' + process.execPath);
  info.push('platform=' + process.platform + '/' + process.arch);
  info.push('features=' + JSON.stringify(process.features || {}));
  for (const p of ['lit', 'happy-dom', 'esbuild', 'typescript', 'c8']) {
    try {
      info.push(p + '=' + require.resolve(p, { paths: [root] }));
    } catch (e) {
      info.push(p + '=MISSING(' + brief(e) + ')');
    }
  }
  try {
    const esbuild = require('esbuild');
    info.push('esbuild.version=' + esbuild.version);
    const { outputFiles } = esbuild.buildSync({
      entryPoints: [card], bundle: true, format: 'cjs', platform: 'node',
      target: 'node18', write: false, logLevel: 'silent',
    });
    info.push('esbuild-bundle=OK(' + outputFiles[0].text.length + 'B)');
  } catch (e) {
    info.push('esbuild-bundle=' + brief(e));
  }
  try {
    const { loadCard } = require('./helpers/load-card.cjs');
    loadCard({ expose: ['esc', 'safeUrl', 'metricLineHtml'] });
    info.push('loadCard=OK');
  } catch (e) {
    info.push('loadCard=' + brief(e));
    assert.fail('card loader broken: ' + info.join(' || '));
  }
});
