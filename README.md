<p align="center">
  <img src="logo.svg" alt="GLP Shot Card" width="660"/>
</p>

<p align="center">
  <a href="https://github.com/mxkissnr/glp-lovelace-card/releases">
    <img src="https://img.shields.io/github/v/tag/mxkissnr/glp-lovelace-card?color=%23f59e0b&label=Version&style=flat-square" alt="Version"/>
  </a>
  <a href="https://github.com/mxkissnr/glp-lovelace-card/actions/workflows/validate.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/mxkissnr/glp-lovelace-card/validate.yml?branch=main&label=Validate&style=flat-square" alt="Validate"/>
  </a>
  <img src="https://img.shields.io/badge/Home%20Assistant-Lovelace%20Card-41bdf5?logo=home-assistant&style=flat-square" alt="HA Lovelace"/>
  <img src="https://img.shields.io/badge/HACS-Custom-orange?style=flat-square" alt="HACS Custom"/>
  <img src="https://img.shields.io/badge/Built%20with-Claude%20by%20Anthropic-D97706?style=flat-square" alt="Built with Claude"/>
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square" alt="License GPL-3.0"/>
</p>

<p align="center">
  Custom Lovelace card for <a href="https://github.com/mxkissnr/gaggiuino-local-profiler">Gaggiuino Local Profiler</a>.<br/>
  Premium dark card with hero metric typography, glowing shot chart and warm layered palette — feels like Decent Espresso or Apple Health, built for espresso.<br/>
  Mobile-first with swipe gestures, dot navigation, custom profile picker and live brewing view — all from the <a href="https://github.com/mxkissnr/glp-integration">GLP HA Integration</a>.
</p>

---

## Prerequisites

- [Gaggiuino Local Profiler](https://github.com/mxkissnr/gaggiuino-local-profiler) app installed
- [GLP Integration](https://github.com/mxkissnr/glp-integration) installed and configured

## Installation via HACS

1. In HACS → Frontend → ⋮ → Custom repositories → add `mxkissnr/glp-lovelace-card` (category: **Lovelace**)
2. Download the card
3. Add a manual resource or let HACS handle it

## Configuration

Minimal (auto-detects the integration):
```yaml
type: custom:glp-card
```

Full config:
```yaml
type: custom:glp-card
glp_url: http://homeassistant.local:8099          # optional — adds a "GLP ↗" link in the footer
title: Gaggiuino                                  # optional header title
entity_prefix: sensor.gaggiuino_local_profiler_   # optional — auto-detected if omitted
switch_entity: switch.espresso_plug               # optional — power toggle + collapse when off
```

### Options

| Option | Description | Default |
|---|---|---|
| `entity_prefix` | Prefix shared by all GLP sensor entities — auto-detected if omitted | *(auto)* |
| `switch_entity` | HA switch entity ID for the smart plug — auto-detected from integration v1.4.1+; only set manually if using an older integration | *(auto)* |
| `glp_url` | URL to the GLP web interface (adds an "open" link) | *(none)* |
| `title` | Card header title | `Gaggiuino` |

## What it shows

- Machine online / error / brewing status
- Preheat progress bar + countdown while machine warms up; "Brühbereit ☕" badge when ready
- **Shot navigation** — ‹ / › arrows + **dot indicators** to browse the last 10 recorded shots; **swipe left/right** on the card to navigate on touch devices; auto-resets to newest when a new shot arrives; requires [GLP Integration](https://github.com/mxkissnr/glp-integration) v1.9.4+
- **App-style shot chart** — pressure + flow on a left bar axis, temperature + weight on a right axis, a real time axis (seconds), gridlines + axis labels, preinfusion/extraction phase shading and a legend with peak/final values; for both recorded and live shots; flow line requires [GLP Integration](https://github.com/mxkissnr/glp-integration) v1.12.0+
- **Live machine panel** — static live status row with current boiler temperature (plus target, highlighted while heating up), live pressure and live scale weight; updates every ~5 s when the machine is on and idle; requires [GLP Integration](https://github.com/mxkissnr/glp-integration) v1.9.0+
- **Live brewing stats** — temp, pressure, weight shown as mini-stats during a running shot (5 s updates)
- **Profile selector** — custom pill-button picker (no native `<select>`) to switch the active brew profile; stays open across HA state updates; auto-detected via entity prefix; requires `select.*_profile` from [GLP Integration](https://github.com/mxkissnr/glp-integration) v1.9.0+; hidden when unavailable
- **Maintenance tab** — tab bar (☕ Shot | 🔧 Wartung) appears automatically when GLP maintenance sensors exist; shows all five machine maintenance tasks plus per-grinder cleaning schedules with status pill, days/shots since last service and a colored progress bar; ⚠ on the tab label when anything is due; **tap a task to mark it done** (with a confirmation step) via the `gaggiuino_profiler.maintenance_done` service — requires [GLP Integration](https://github.com/mxkissnr/glp-integration) v1.11.0+
- **Steam mode banner** — shown automatically when steam switch is active
- **Water level** in footer (💧 XX%); warning banner when below 20%
- Last shot: profile name, coffee bean, rating (★), duration, yield, brew ratio, avg pressure, temp, target temp
- Shots pulled today
- Time since last sync with the Gaggiuino controller

## Entities used

The card reads the following entities (with default `entity_prefix`):

| Entity | Description |
|---|---|
| `binary_sensor.gaggiuino_local_profiler_brewing` | Live brewing state; attributes: `datapoints`, `profile_name`, `seq` during active shot (v1.9.4+) |
| `binary_sensor.gaggiuino_local_profiler_preheat_ready` | Machine warmed up |
| `binary_sensor.gaggiuino_local_profiler_steam_switch` | Steam mode active *(optional)* |
| `sensor.gaggiuino_local_profiler_preheat_elapsed` | Warmup elapsed (s) |
| `sensor.gaggiuino_local_profiler_preheat_remaining` | Warmup remaining (s) |
| `sensor.gaggiuino_local_profiler_machine_temperature` | Current boiler temperature |
| `sensor.gaggiuino_local_profiler_machine_target_temperature` | Target temperature |
| `sensor.gaggiuino_local_profiler_machine_live_pressure` | Live pressure (bar) — 5 s updates *(optional)* |
| `sensor.gaggiuino_local_profiler_machine_live_weight` | Live weight (g) — 5 s updates *(optional)* |
| `sensor.gaggiuino_local_profiler_machine_water_level` | Water reservoir level (%) *(optional)* |
| `sensor.gaggiuino_local_profiler_last_shot_profile` | Profile name |
| `sensor.gaggiuino_local_profiler_last_shot_coffee` | Coffee bean |
| `sensor.gaggiuino_local_profiler_last_shot_rating` | Shot rating (1–5 ★); renamed from `last_shot_score` in integration v1.9.3 |
| `sensor.gaggiuino_local_profiler_machine_status` | online / error; attribute `recent_shots` holds last 10 shots for navigation (v1.9.4+) |
| `sensor.gaggiuino_local_profiler_last_shot_duration` | Duration (s) |
| `sensor.gaggiuino_local_profiler_last_shot_yield` | Yield (g) |
| `sensor.gaggiuino_local_profiler_last_shot_brew_ratio` | Brew ratio |
| `sensor.gaggiuino_local_profiler_last_shot_avg_pressure` | Avg pressure (bar) |
| `sensor.gaggiuino_local_profiler_shots_today` | Shots today |
| `sensor.gaggiuino_local_profiler_last_sync` | Last sync timestamp |
| `sensor.gaggiuino_local_profiler_maintenance_descaling` … `_backflush`, `_group_head`, `_gaskets`, `_water_filter` | Maintenance task status (ok/soon/due/never); attributes `pct`, `days_since`, `shots_since` — feeds the Wartung tab *(optional)* |
| `sensor.gaggiuino_local_profiler_maintenance_grinders` | Worst grinder status; attributes hold per-grinder details — feeds the Wartung tab *(optional)* |
| `select.gaggiuino_local_profiler_profile` | Active brew profile — auto-resolved; requires [GLP Integration](https://github.com/mxkissnr/glp-integration) v1.9.0+ *(optional)* |

GLP sensor entities are provided by the [GLP Integration](https://github.com/mxkissnr/glp-integration).

---

<p align="center">
  <a href="https://github.com/mxkissnr/gaggiuino-local-profiler/wiki">📖 Documentation (Wiki)</a> ·
  <a href="https://github.com/mxkissnr/gaggiuino-local-profiler">🔧 GLP App</a> ·
  <a href="https://github.com/mxkissnr/glp-integration">⚡ GLP Integration</a> ·
  <a href="https://github.com/mxkissnr/glp-lovelace-card/issues">🐛 Issues</a>
</p>

---

## License

GPL-3.0 © 2024–2026 mxkissnr — free to use, fork and modify; any derivative work must remain open source under the same license. Commercial use is not permitted.

## Acknowledgements

Inspired by [BeanConqueror](https://github.com/graphefruit/beanconqueror) by graphefruit — a fantastic open-source coffee tracking app that pioneered many of the ideas around shot logging and coffee library management that influenced this project.

Built on top of the [Gaggiuino](https://gaggiuino.github.io/) project and the original [Gaggiuino Home Assistant Integration](https://github.com/ALERTua/hass-gaggiuino) by ALERTua — without their work this project would not exist.

---

<p align="center">
  <sub>Built with <a href="https://claude.ai/code">Claude Code</a> by Anthropic</sub>
</p>
