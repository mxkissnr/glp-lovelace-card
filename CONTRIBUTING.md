# Contributing

Bug reports, feature ideas and pull requests are welcome!

## Workflow

1. **Open an issue first** — describe the bug or feature before writing any code
2. **Fork & branch** — `feature/short-description` or `fix/short-description`
3. **Implement** — commit with `Closes #N` in the message
4. **Pull request** — see [Pull requests](#pull-requests) below

## Pull requests

Every PR must:

- **Link an issue** — `Closes #N` in the description (no PRs without a linked issue)
- **Do one thing** — keep the diff focused; split unrelated changes
- **Use a Conventional Commits title in English** — `feat:` `fix:` `docs:` `chore:` `refactor:` `test:` `build:`
- **Explain what and why** in the description, not just what
- **Pass CI** — lint, tests and build green before requesting review
- **Update `CHANGELOG.md`** for any user-facing change
- **Include before/after screenshots** for UI changes
- **Disclose AI assistance** — see below
- **No real names** in commit messages, PR text, code comments or docs

### AI assistance

Be transparent about AI tool use so reviewers know what they are reviewing.

- **Per commit (machine-readable, required):** every commit an AI tool helped write carries a
  trailer, e.g. `Co-Authored-By: Claude <noreply@anthropic.com>` or
  `Co-Authored-By: Copilot <198982749+Copilot@users.noreply.github.com>`. Claude Code also
  adds a `Claude-Session:` trailer. For this repo the Claude trailer names the specific model,
  e.g. `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (see [CLAUDE.md](CLAUDE.md)).
- **Per PR (summary, required):** the "AI assistance disclosure" section of the PR template —
  one of `none` / `assisted` / `substantial` / `generated`, plus the tool and model names.

CI blocks the PR until the disclosure section is filled in, and fails on a contradiction
(commits carry an AI trailer while the PR claims `none`).

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
