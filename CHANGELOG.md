# Changelog

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
