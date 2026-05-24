# Changelog

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
