# Changelog

## [Unreleased]
### Changed
- **Flat HA-theme redesign — hybrid tokens, decorative glow removed.** Purely visual/theming, no behavior change (one small bugfix called out below). Closes #56
  - Added a `GLP-TOKENS v1` block (`--glp-radius`, `--glp-radius-sm`, `--glp-bg`, `--glp-surface`, `--glp-border`, `--glp-text`, `--glp-sub`, `--glp-accent`, `--glp-ok`, `--glp-warn`, `--glp-err`, plus the 4 chart series tokens) that reads Home Assistant's own theme CSS variables first (`--ha-card-background`, `--primary-text-color`, `--divider-color`, `--primary-color`, `--error-color`, etc.) and only falls back to the old standalone Apple-iOS palette values when a theme doesn't set them. This exact block is the shared contract with `glp-order-card` (new test `test/token-sync.test.js`, skips cleanly when the neighbor repo/block isn't present locally). No new YAML config option — no `theme:` switch, HA's active theme always wins.
  - Migrated all ~57 hardcoded `rgba()` overlay colors in `STYLES` onto the new tokens (mostly via `color-mix()` against `--glp-text`/`--glp-ok`/`--glp-warn`/`--glp-err`), and the inline SVG chart chrome (gridlines, ticks, axis labels, plot background, phase-shading) onto the same tokens — the chart and the rest of the card now render correctly in both light and dark HA themes, not just the original dark-only design.
  - Consolidated the radius scale (previously ad-hoc 6–20px) onto `--glp-radius` (outer/major containers) and `--glp-radius-sm` (chips/pills/small controls); the fully-round profile-picker pills keep their own literal radius since they need to stay capsule-shaped regardless of theme.
  - Removed purely decorative glow/gradient with no replacement: the card's `--shadow` custom property and gradient background, the tab-bar active-tab shadow, and the metric-card top-hairline shine. Card elevation now comes from `var(--ha-card-box-shadow)` plus a flat 1px `--glp-border` hairline. Also fixed a latent double-chrome bug this surfaced: the card renders inside HA's own `<ha-card>`, which paints its own theme-driven background/shadow/radius — previously the inner `.card` div painted a second, unrelated dark box on top of it, which is part of why light HA themes looked broken; `ha-card` is now reset to transparent so there's a single surface.
  - Flattened glow-based motion to flat-ring motion, keeping the underlying live/brewing indication: `.status-dot.online`/`.brewing` now use a solid fill + flat non-blurred ring instead of a blurred halo (the `.brewing` opacity pulse is unchanged); `.lm-live-dot`'s expanding-ring "radar ping" animation is now a fixed-size ring whose opacity pulses instead, respecting `prefers-reduced-motion: reduce`; `.preheat-bar-fill` is a flat `--glp-accent` fill instead of an amber→red gradient.
  - Unified the shot chart's series palette onto a new GLP-series palette chosen for readability against both light and dark plot backgrounds: pressure `#0072b2`, flow `#c77000`, temperature `#c0392b`, weight `#009e73`. Deleted the dead legacy `.chart-legend`/`.l-pres`/`.l-temp`/`.l-wt` CSS block — `chartLegendHtml()` has only emitted `.chart-legend2`/`.cl-item`/`.cl-dot` markup for a while.
  - **Bugfix:** `.section-label` was used in the collapsed/machine-off Orders view but had no matching CSS rule (only `.maint-section-label` existed), so it rendered as unstyled text. Merged the two selectors onto one rule rather than renaming either usage.
  - `scripts/screenshot.mjs` gained a `--light` flag (or `GLP_SCREENSHOT_THEME=light` env var) that renders against the "GLP Light" HA theme values from `glp-ha-theme.yaml` and writes `docs/screenshots/card-light.png`, used to verify this redesign's light-theme readability.
  - **Follow-up fix:** `--glp-ok`/`--glp-warn`'s fixed values (`#22c55e`/`#eab308`) only cleared 2.28:1/1.92:1 against a white background — well under the 4.5:1 WCAG AA floor this card's small/bold badge, banner and star-rating text needs — visibly broken in the "Brühbereit" preheat banner, the live status dot ring and the star rating in `docs/screenshots/card-light.png`. `--glp-err`'s fallback (`#ef4444`, 3.76:1) had the same problem. None of `--glp-ok`/`--glp-warn`/`--glp-err` chain through HA's own `--success-color`/`--warning-color`/`--error-color` (unlike the other tokens) — checked HA frontend's own out-of-the-box defaults (`#43a047`/`#ffa600`/`#db4437`, same in light and dark mode) and `glp-ha-theme.yaml`'s "GLP Light" theme, and neither reliably clears 4.5:1 against white either (success 3.30:1, warning 3.19:1 / 1.96:1, error 4.29:1 for HA's own defaults) — trusting an arbitrary theme's value here would still ship a contrast failure under HA's own vanilla install.
  - **Mechanism correction:** the first pass of this fix used a `@media (prefers-color-scheme: light)` override, which was wrong — OS/browser color-scheme preference can flatly disagree with the actually-selected HA theme (dark system + light HA theme is a common combination), so the media query missed exactly the case it was meant to fix. Replaced with `_applySemanticColorContrast()`, called from `_render()` right after the shadow DOM is (re)built: it reads the card's own resolved `--glp-bg` via `getComputedStyle`, computes WCAG relative luminance, and sets `--glp-ok`/`--glp-warn`/`--glp-err` as an inline style on the host (light: `#15803d`/`#a16207`/`#dc2626`, 5.02:1/4.92:1/4.83:1 vs white; dark: `#22c55e`/`#eab308`/`#ef4444`, 7.78:1/9.24:1/4.71:1 vs dark bg) — inline styles always outrank stylesheet rules regardless of media query state, and this keys off the theme that's actually rendering, not a proxy for it.
  - `scripts/screenshot.mjs` gained independent `--ha-theme=light|dark` and `--os-scheme=light|dark` axes (plus `--out=`) so the OS/HA-theme mismatch case can be reproduced and verified directly; `--light` remains shorthand for light/light.

## [2.15.0] – 2026-07-13
### Added
- **`machine` config option for multi-machine setups** (companion to app v2.0.0's multi-machine mode, GLP #317). When set, `_resolvePrefix()` matches the `*_machine_status` entity whose `friendly_name`/`entity_id` references the configured name/slug, before falling back to the existing "first Gaggiuino-named entity, else any" heuristic — cards without this option (still the vast majority, single-machine setups) behave exactly as before. The switch-entity `localStorage` key is also machine-scoped (`glp_switch_entity_<slug>`) when `machine` is set, so two cards for two machines on the same dashboard no longer share/collide on the same stored switch entity. No visual config editor exists for this card yet, so `machine` is YAML-only for now. `glp-card.js`, `test/machine-config.test.js` (new, 6 tests). Closes #50

## [2.14.0] – 2026-07-10
### Added
- **IT/FR/ES/NL translations.** The STRINGS-based i18n table (introduced in v2.13.0 for DE/EN) now covers all 6 GLP UI languages; `hass.language` falls back to English for anything unsupported instead of the old binary DE/EN check. `glp-card.js`. Closes #49
- Test suite (`test/`, Node's built-in `node:test`, no new dependency) covering `esc()` and `safeUrl()` — the card's HTML-escaping and URL-scheme guards — against script/quote-injection payloads and `javascript:`/`data:` URLs. The tests load the real `glp-card.js` in a sandboxed `vm` context rather than reimplementing the logic. CI gained a `test` job (`npm test` + a syntax-check build step) in `.github/workflows/validate.yml` alongside the existing HACS validation. Closes #48
- **README hero screenshot + screenshot tooling** — `scripts/screenshot.mjs` (new `playwright` devDependency) boots a throwaway static server for this repo, mounts `<glp-card>` with a realistic mock `hass` (machine on, preheat ready, a selected profile, a recent shot with a full pressure/flow/temp/weight curve, maintenance rows) and screenshots the rendered card to `docs/screenshots/card.png` at 2x scale; run via `npm run screenshot`. README now shows this screenshot near the top, ahead of the public HACS/Reddit launch.

## [2.13.1] – 2026-07-06
### Fixed
- **Security audit finding: the GLP footer link's `href` wasn't escaped** — `safeUrl()` only checked the protocol and returned the raw config string, which could still break out of the `href="..."` attribute via a quote/angle-bracket character; it now returns the parsed `u.href` instead, and the render site also wraps it in `esc()` as a second layer. Only exploitable via the card's own YAML config (`glp_url`), not via any backend-supplied data — self-XSS at most, but fixed as defense in depth.

## [2.13.0] – 2026-07-05
### Added
- **Bean info on the shot hero** — next to the bean name the card now shows the origin country flag, variety and roast age ("🇷🇼 · Red Bourbon · 12d", tooltip with roast date wording). Data comes from the new `GET /api/glp/library/beans-info` proxy (integration ≥ 1.16.0, app ≥ 1.96.0), joined case-insensitively by bean name, cached and refreshed every 5 minutes. On older installations the endpoint is missing and the card silently hides the enrichment; closes #47
- **DE/EN localization** — all UI strings (tabs, orders, maintenance, banners, metric labels, chart legend, tooltips) now follow `hass.language` via a STRINGS table (same pattern as the order card). German wording is unchanged; English is new; closes #47

### Fixed
- Removed `getConfigElement()` referencing the never-defined `glp-card-editor` element — the card is configured via YAML (`getStubConfig` unchanged); closes #47

## [2.12.3] – 2026-06-19
### Fixed
- **Power button now reliably responds on every tap** — the `pointerdown` listener was re-attached after each full `innerHTML` re-render; if a HA state update triggered a render mid-gesture the new button had no listener for a brief window; replaced with a single delegated listener on `this.shadowRoot` (never replaced by innerHTML) so the handler survives every render; closes #45

## [2.12.2] – 2026-06-19
### Fixed
- **Orders poll reliably starts on load** — `_startOrdersPoll()` was only called from `connectedCallback()`, where `this._hass` is often still null; the 1500 ms retry could be missed in certain HA lifecycle orderings leaving `this._orders` permanently empty; added a safety-net call in `set hass()` so the poll starts as soon as HA is available, regardless of element-lifecycle ordering; closes #44

## [2.12.1] – 2026-06-19
### Fixed
- **Orders tab no longer disappears during brewing** — `ordersTabAvail` previously included `&& !brewing`, so the Bestellungen tab vanished whenever a shot was being pulled and the barista had to re-navigate to it after every shot; tab is now always visible whenever there are active orders; closes #43

## [2.12.0] – 2026-06-19
### Fixed
- **Orders visible while machine is off** — pending/accepted orders are now shown in the collapsed machine-off view, so the barista can manage the queue while the machine warms up; closes #42

## [2.11.0] – 2026-06-17
### Added
- **Manage orders from the card** — a 🛒 Bestellungen tab appears when there are active orders; the barista can **accept** a pending order with an ETA (3/5/8/10 min), mark an accepted order **done**, or **decline** it, directly from the shot card (via the integration's `/api/glp/orders/*` proxy). Polls every 6 s; the tab badge shows the pending count; closes #41

## [2.10.0] – 2026-06-17
### Added
- **Last grind setting + grinder** shown in the shot hero (⚙️ grinder · grind) so you can quickly see your last setup; from `recent_shots.grinder/grind` (requires GLP Integration v1.14.0+); closes #39
- **Machine-on timer** in the card header — a live-ticking chip showing how long the machine has been switched on (from the switch entity); closes #40

## [2.9.0] – 2026-06-17
### Added
- **Shot score badge** — the shot score (0–100) is shown as a colored ring next to the profile name in the shot hero (green ≥80, amber ≥55, else red); sourced from `recent_shots.score`; requires GLP Integration v1.13.0+; closes #38

## [2.8.0] – 2026-06-17
### Changed
- **Shot chart redesigned to match the GLP app** — pressure + flow on a left bar axis (0–12), temperature + weight on a right axis, a real **time axis in seconds** with ticks, gridlines and axis labels, **preinfusion/extraction phase shading** (detected from the pressure curve like the app), and a legend showing peak/final values with units plus phase durations. App series colors (pressure blue, flow orange, temp red, weight green); requires GLP Integration v1.12.0+ for the flow line; closes #37

## [2.7.1] – 2026-06-17
### Fixed
- Shot stats showed the **live machine** Temp/target instead of the displayed shot's values — a recorded shot showed "ZIEL: Aus" when the machine was currently on a boiler-off profile; "Temp" is now derived from the shot's own temperature curve and the (live-only) "Ziel" pill was removed from the shot section (it lives in the "Maschine live" panel); closes #36
- Maintenance confirmation prompt flickered while open because periodic `set hass` updates rebuilt the card DOM — re-renders are now suppressed while a maintenance confirm is open (same as the profile dropdown); closes #35

## [2.7.0] – 2026-06-17
### Added
- **Maintenance is now actionable from the card** — tapping a task in the Wartung tab asks for confirmation ("Als erledigt markieren? ✓ Ja / ✕") and, on confirm, marks it done via the new `gaggiuino_profiler.maintenance_done` service (resets the timer). Works for the five machine tasks and per-grinder cleaning; requires GLP Integration v1.11.0+; closes #34

## [2.6.2] – 2026-06-17
### Fixed
- Shot chart: the **temperature curve was invisible for low temperatures** (e.g. boiler-off profiles ~50°C) because the temp axis used a fixed 70–105°C range — values below it were drawn off-screen; the temperature range is now data-adaptive so the curve always shows; closes #33

## [2.6.1] – 2026-06-17
### Fixed
- Tab, profile and power buttons now use `pointerdown` instead of `click` — `click` was eaten by frequent `set hass` re-renders, making the **Wartung tab switch and profile picker fire only sporadically**; closes #32
- **Profile switch felt slow** — the picker kept showing the old profile until the machine coordinator reported back (up to 5 s); now shows the selected profile immediately (optimistic, with a "wechselt …" hint) and clears when the machine confirms (8 s safety timeout); closes #32
- **Target temperature showed "1.0°"** for boiler-off profiles (e.g. "[UT] Boiler Off") — the live panel and the shot's Ziel pill now show "Aus" when the boiler target is effectively off; closes #32

## [2.6.0] – 2026-06-17
### Added
- **Live machine panel** — a static live status row showing the machine's current boiler temperature (with target and an "Aufheizen" highlight while below target), live pressure and live scale weight; sourced from the integration's machine sensors and updated every ~5 s; shown when the machine is on and not brewing; closes #31
### Fixed
- Shot swipe/arrow navigation: only the **first** navigation animated smoothly — a `set hass` state update (machine sensors poll every 5 s) re-rendered and wiped the in-flight animation; added an `_animating` guard so state updates don't re-render mid-animation and new navigation is ignored until the current one finishes; closes #30
- The **profile picker** (and the shot nav row) no longer slide together with the shot content — they were inside the animated `.swipe-content`; moved out into the static card area so only the shot data swipes; closes #30

## [2.5.1] – 2026-06-17
### Added
- HACS validation workflow (`.github/workflows/validate.yml`) running the official `hacs/action` (`category: plugin`) on push, PR, daily schedule and manual dispatch — required for submission to the HACS default repository; closes #27
- Validation status badge in README
- GitHub repository topics for discoverability (`home-assistant`, `hacs`, `lovelace`, `gaggiuino`, `espresso`)

## [2.5.0] – 2026-06-16
### Changed
- **Dual-panel shot transition** — replaces the single-element CSS keyframe with a proper dual-panel JS animation: the old shot content is cloned and slides out in one direction while the new content slides in from the opposite side simultaneously (36 px offset + opacity fade, 220 ms ease-out); both panels animate independently so the transition looks like iOS/Android navigation instead of a single-element pop; the animation plays only on explicit navigation, never on HA state updates; closes #26

## [2.4.0] – 2026-06-16
### Added
- **Slide animation between shots** — tapping an arrow or swiping triggers a 220 ms slide-in from the correct direction (right → older shot slides in from the right, left → newer shot slides in from the left); animation only plays on actual navigation, not on HA state updates; closes #26
### Fixed
- **Drink type badge showed internal ID** (`m_1779888566035`) instead of a readable name — the card now receives the resolved display name from Integration v1.10.2 (which looks up the drink menu); requires GLP Integration v1.10.2+; closes (see integration)

## [2.3.0] – 2026-06-16
### Added
- **Drink type badge** — shows the prepared drink (e.g. "Espresso", "Cappuccino") as a small pill badge next to the coffee name in the shot hero; sourced from `drink_type` in `recent_shots` (requires GLP Integration v1.10.1+); hidden when not set; closes #25

## [2.2.2] – 2026-06-16
### Fixed
- Nav arrow taps occasionally did nothing — `click` events on mobile fire ~100–300 ms after `touchstart`; if a HA state update (`set hass()`) arrived in that window, `_render()` replaced the entire shadow DOM, destroying the button before the `click` fired; some browsers silently drop `click` events on detached elements; switched nav buttons to `pointerdown` (fires immediately on press, before any re-render) with manual `disabled` guard

## [2.2.1] – 2026-06-16
### Fixed
- Navigation dot animation caused the active dot to shake/vibrate — `_render()` replaces the full `innerHTML` on every HA state update, restarting the keyframe animation every time; fix: animation only plays when `_shotIndex` actually changes (tracked via `_prevShotIndex`), not on every re-render

## [2.2.0] – 2026-06-16
### Fixed
- Temperature curve was invisible — the chart auto-detects the value scale now (×10 integer format vs. raw units), so the amber temp line is always rendered in the correct vertical range regardless of what format the integration sends
- Temperature is now drawn last (on top of weight and pressure) so it can't be hidden beneath another curve
### Changed
- Metric cards (duration / yield / ratio) now show neutral white numbers instead of red/green — red and green imply good/bad which is misleading for neutral shot metrics; colour is reserved for status indicators (brewing banner, preheat, water level)
- Profile picker moved to the top of the shot section (below the tab bar), before the shot history nav — it's a live machine setting, not a historical data field
- Active navigation dot now animates with a spring-style grow keyframe (`cubic-bezier(.34,1.56,.64,1)`) instead of a static CSS transition; closes #24

## [2.1.1] – 2026-06-16
### Fixed
- `ReferenceError: Cannot access 'dotClass' before initialization` — a dead `_headerHtml` template literal referenced `dotClass` before the variable was declared; this crashed `_render()` on every call, causing the card to never render

## [2.1.0] – 2026-06-16
### Changed
- **Premium visual redesign** — warm dark palette with layered gradient background (`#1c1b22 → #0f1012`); all borders replaced with translucency + `box-shadow`; subtle top-edge highlight on metric cards via CSS `::before`
- **Hero metric trio** — duration, yield and ratio each get a dedicated card with 1.75 rem (1.9 rem on touch) bold number, coloured accent (`--accent` red / `--green` / default), unit in superscript and uppercase label — replacing the flat stats grid
- **Profile name as visual anchor** — bumped to 1.45 rem / weight 800 with a tighter letter-spacing (`-.02em`), sits above the metric trio
- **Chart taller + glowing** — SVG chart height increased to 72 px; each polyline now has a `feGaussianBlur` + merge glow filter (red / amber / green per series); subtle 1-px grid lines at ⅓ and ⅔ height; chart background is a very faint white tint for depth
- **Status dot glow** — brewing state pulses with a red box-shadow halo; online dot has a green glow ring; machine-off state leaves no glow
- **Brewing banner** — warm red translucent background with accent border, larger weight and spacing
- **Tab bar** — slightly taller pill with faint shadow on active tab, letter-spacing tightened
- **Ghost-style nav arrows** — bare text characters (`‹ / ›`), 1.35 rem, no background, low opacity at rest; active dot is an 18 px × 5 px rounded pill
- **Profile picker** — label + current name stacked vertically in the button; opens as a pill-chip grid; active chip in red tint
- **Secondary stats** — flat `stat-pill` with label / value side by side, replacing the previous grid tiles
- **Star rating** — coloured per tier: green ≥ 4, amber ≥ 3, red < 3 (replaces uniform yellow)
- **Touch targets** — all interactive elements ≥ 44 px on touch devices unchanged; metric numbers 1.9 rem on touch

## [2.0.1] – 2026-06-16
### Fixed
- Card showed full content when machine was already off on page load — `machine_status` sensor attributes are empty when the sensor is unavailable (HA clears them on coordinator failure), so the switch entity was never resolved after a browser reload. Fix: `switch_entity` is now persisted in `localStorage` as soon as it is found for the first time; subsequent loads (including cold loads with machine already off) restore it immediately from storage without needing the HA attribute.

## [2.0.0] – 2026-06-16
### Changed
- **Mobile-first redesign** — one adaptive card: `@media (pointer: coarse)` enlarges all touch targets to ≥ 44 px (arrows, tabs, profile picker, power button); desktop behaviour unchanged
- **Swipe gestures** — swipe left/right anywhere on the card body to navigate between shots (50 px threshold, ignores near-vertical swipes and open profile picker)
- **Dot navigation** — replaces the "X / Y" counter with a scrolling row of dots (max 10) alongside ‹ / › arrows; a timestamp line appears below when viewing a historical shot
- **Custom profile picker** — replaces the native `<select>` with a pill-button dropdown; opens/closes with a chevron button; active profile highlighted in red; survives HA state updates without closing
- **Visual polish** — refined tab bar (pill indicator with shadow), stat tiles with consistent rounded corners, status dot glow effect, improved color palette, smoother transitions, cleaner header layout
- **switch_entity caching fix** — entity is now retained once resolved so the machine-off collapse no longer flickers when the attribute temporarily disappears on state updates; closes #22

## [1.9.0] – 2026-06-11
### Added
- **Maintenance tab** — a tab bar (☕ Shot | 🔧 Wartung) appears at the top of the card when GLP maintenance sensors are present; the Wartung tab shows all five machine maintenance tasks (descaling, backflush, group head, gaskets & screens, water filter) plus per-grinder cleaning schedules, each with a status pill (✓ OK / Bald fällig / ⚠ Fällig / Nie erledigt), days/shots since last service and a colored progress bar; the tab label shows ⚠ when any task is due; read-only — marking tasks done stays in the GLP dashboard; auto-hidden when no maintenance sensors exist; during brewing the card always switches to the live shot view; requires glp-integration with maintenance sensors (v1.7.0+); closes #21

## [1.8.1] – 2026-05-27
### Fixed
- Navigation arrows were reversed — → now goes to older shots (2/10, 3/10 …) and ← goes back to newer; closes #18
- Shot charts were only shown during live brewing; each historical shot now renders its own pressure / temperature / weight SVG chart below the stats grid, sourced from the `dp` field in `recent_shots` (requires glp-integration v1.9.5+); closes #18

## [1.8.0] – 2026-05-27
### Added
- **Shot navigation** — browse the last 10 recorded shots using ← / → buttons above the profile name; navigation resets to the newest shot automatically when a new shot arrives; a timestamp (DD.MM.YY HH:MM) is shown below the nav row when viewing a historical shot; data sourced from `recent_shots` attribute added in glp-integration v1.9.4; closes #16
- **Live SVG chart during brewing** — while `binary_sensor.*_brewing` is `on`, a pure inline SVG polyline chart (no CDN needed) shows pressure (red), temperature (amber) and weight (green) curves updated every 2 s; elapsed seconds shown in the brewing banner; data sourced from `datapoints` attribute added in glp-integration v1.9.4; closes #16
- Live profile name shown above the chart during an active shot (from `binary_sensor.*_brewing` `profile_name` attribute)

## [1.7.1] – 2026-05-27
### Fixed
- Star rating tile: `last_shot_score` renamed to `last_shot_rating` to match glp-integration v1.9.3; display changed from numeric score to ★★★★☆ star row (green ≥4, amber ≥3, red <3)

## [1.7.0] – 2026-05-27
### Fixed
- Profile select not showing — entity ID was hardcoded to `select.gaggiuino_profiler_profile`; it is now resolved via the prefix resolver (same as brewing/preheat binary sensors), yielding the correct `select.gaggiuino_local_profiler_profile`; closes #15
### Added
- **Live stats during brewing** — temp, live pressure, live weight shown as a compact mini-stats row below the brewing banner (updates every 5 s via machine coordinator)
- **Water level badge** in footer — reads `machine_water_level` sensor; always visible when available
- **Low water warning banner** — shown when water level is below 20%
- **Steam mode banner** — shown when `binary_sensor.*_steam_switch` is on

## [1.6.0] – 2026-05-27
### Changed
- Profile selector now reads from `select.gaggiuino_profiler_profile` (created by glp-integration v1.9.0+) instead of `select.gaggiuino_profile` (ALERTua/hass-gaggiuino); same profile options, same service call; closes #14

## [1.5.0] – 2026-05-26
### Added
- `Temp` and `Ziel` stat tiles in the stats grid — read from `machine_temperature` and `machine_target_temperature` HA sensors (glp-integration v1.8.0+); tiles are omitted automatically when the sensors are unavailable; closes #13

## [1.4.1] – 2026-05-25
### Fixed
- Profile dropdown closed immediately on every Home Assistant state update — `set hass()` replaced `innerHTML` on each call, destroying the open `<select>`; a `_profileInteracting` flag now blocks re-renders while the select has focus and clears on blur/change; closes #12

## [1.4.0] – 2026-05-25
### Added
- Profile selector dropdown — reads available profiles and current selection from `select.gaggiuino_profile` (provided by the GLP integration); calls `select/select_option` via `hass.callService` on change; hidden automatically when the entity is not present; closes #11

## [1.3.6] – 2026-05-25
### Fixed
- Card showed "Konfigurationsfehler" when machine was turned off via power socket — `machineOff` only matched `switch_entity.state === 'off'`; when the smart plug loses power from the same circuit the entity transitions to `unavailable`, which now also triggers the collapsed (off) view; closes #9

## [1.3.5] – 2026-05-24
### Fixed
- Security: profile name and coffee bean injected into `innerHTML` are now HTML-escaped via `esc()` — prevents stored XSS from annotated shot data
- Security: card title from YAML config is now escaped before `innerHTML` insertion
- Security: `glp_url` is validated with `safeUrl()` — rejects `javascript:` and other non-http/https schemes before the link is rendered

## [1.3.4] – 2026-05-24
### Changed
- Power button hit area enlarged: padding increased from `3px 7px` to `8px 12px`, icon from 13 px to 18 px

## [1.3.3] – 2026-05-24
### Fixed
- Power button click not working from collapsed (machine-off) state — replaced shadow-root event delegation with direct listener bound to the button after each render; event retargeting at the `ha-card` shadow boundary caused `e.target.closest()` to resolve to `ha-card` rather than the button, silently swallowing the click

## [1.3.2] – 2026-05-24
### Fixed
- Power toggle button now works when `switch_entity` is auto-detected — constructor click handler was reading `this._config?.switch_entity` (always null for auto-detected case) instead of the resolved `this._switchEntity`

## [1.3.1] – 2026-05-24
### Fixed
- `switch_entity` is now auto-detected from `machine_status` sensor attribute (set by integration v1.4.1) — no manual card config needed; explicit `switch_entity` config still supported as fallback; closes #6

## [1.3.0] – 2026-05-24
### Added
- Optional `switch_entity` config: power toggle button in header; card collapses to header-only when machine is off to save dashboard space; closes #5

## [1.2.0] – 2026-05-24
### Added
- Preheat progress bar + countdown while machine warms up, sourced from `preheat_elapsed` / `preheat_remaining` / `preheat_ready` entities; closes #4
- README updated with add-on-style header (badges, "Built with Claude" badge) and preheat entities table

## [1.1.0] – 2026-05-24
### Added
- `entity_prefix` is now optional — the card auto-detects the prefix by scanning `hass.states` for a `_machine_status` entity from the GLP integration; explicit prefix still supported for edge cases; closes #3

## [1.0.2] – 2026-05-24
### Fixed
- Binary sensor prefix regex was `sensor\.$` (matched end of string, never triggered) — changed to `^sensor\.` so the entity correctly resolves to `binary_sensor.…_brewing`

## [1.0.1] – 2026-05-24
### Fixed
- Entity ID suffixes corrected to match actual HA integration sensor names:
  - `last_shot_weight` → `last_shot_yield`
  - `last_shot_ratio` → `last_shot_brew_ratio`
  - `last_shot_pressure` → `last_shot_avg_pressure`
  - Binary sensor: `is_brewing` → `brewing`

## [1.0.0] – 2026-05-24
### Added
- Initial release
- Shows machine status (online / error / brewing), live brewing banner, last shot (profile, coffee, score, duration, yield, brew ratio, avg pressure), shots today, last sync time
- Configurable `entity_prefix`, `glp_url`, `title`
- HACS-compatible (`hacs.json`, release asset)
