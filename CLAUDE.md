# CLAUDE.md — GLP Lovelace Card

Working rules for this repo (mirrors the app repo's rules; full rationale lives in
`../gaggiuino-local-profiler/CLAUDE.md`).

- **Issue first, then code** — no implementation without a GitHub issue number
  (`gh issue create --repo mxkissnr/glp-lovelace-card`, add to GLP Roadmap project 2,
  owner mxkissnr). Only exception: typos.
- **Language**: code/comments/commits/issues/PRs in English.
- **Version** lives in `glp-card.js` line 1 (`GLP_CARD_VERSION`) — patch for fixes,
  minor for features. Never bump it outside a release.
- **Tests/build**: `npm test` (node --test) and `npm run build` (syntax check) must be
  green after every change; a newly-failing test is a stop condition.
- **Commits**: CHANGELOG.md entry in the same commit as the code. Trailer required,
  model spelled out: `Co-Authored-By: Claude <model name> <noreply@anthropic.com>`.
- **XSS**: card renders HA data into DOM — always escape/textContent, never
  unsanitized innerHTML from entity attributes.
- **Releases** end at the GitHub release + HACS; no HA deploy (Max installs himself).
- Screenshots: `npm run screenshot` regenerates docs assets when the UI changes.
