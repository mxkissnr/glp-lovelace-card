# Contributing

Bug reports, feature ideas and pull requests are welcome!

## Workflow

1. **Open an issue first** — describe the bug or feature before writing any code
2. **Fork & branch** — `feature/short-description` or `fix/short-description`
3. **Implement** — commit with `Closes #N` in the message
4. **Pull request** — reference the issue; keep PRs focused on one thing

## Reporting a bug

Include:
- Card version (visible in the browser console on HA startup)
- GLP Integration version
- Expected vs. actual behaviour
- Browser console output if relevant

## Code notes

| Area | Details |
|---|---|
| File | Single JS file `glp-card.js` — no build step, no bundler |
| Style | Vanilla ES2020, Web Components (`HTMLElement` + Shadow DOM) |
| Entity prefix | Auto-detected via `_resolvePrefix()`; card reads HA entity state objects directly |
| Testing | Load the card as a HACS custom resource and test in HA Lovelace |

## Versioning

`MAJOR.MINOR.PATCH` — update `GLP_CARD_VERSION` constant at the top of `glp-card.js`.
