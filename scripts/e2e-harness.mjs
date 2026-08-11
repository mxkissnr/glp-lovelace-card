// Shared browser-test scaffolding: a throwaway http.createServer serving
// this repo's root (so glp-card.js can be loaded without file:// CORS
// issues) plus a `/__harness.html` route. Used by both scripts/screenshot.mjs
// (README screenshots) and test/e2e/smoke.test.mjs (Playwright E2E smoke
// test) so the two don't duplicate this setup — mirrors glp-order-card's
// scripts/e2e-harness.mjs (same pattern, kept independent per repo since the
// two cards' mock-data shapes differ enough that a shared module would just
// add indirection).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.join(__dirname, '..');

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function startServer(harnessHtml) {
  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    if (urlPath === '/__harness.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(harnessHtml);
      return;
    }
    const filePath = path.join(repoRoot, decodeURIComponent(urlPath));
    if (!filePath.startsWith(repoRoot)) { res.writeHead(403); res.end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}
