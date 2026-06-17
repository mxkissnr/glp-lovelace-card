# Changelog

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
