# GLP Shot Card

Custom Lovelace card for [Gaggiuino Local Profiler](https://github.com/mxkissnr/gaggiuino-local-profiler).

Displays the last espresso shot (profile, score, duration, yield, ratio, pressure), shots today, last sync time and a live brewing indicator — all sourced from the [GLP HA Integration](https://github.com/mxkissnr/gaggiuino-profiler-integration).

## Prerequisites

- [Gaggiuino Local Profiler](https://github.com/mxkissnr/gaggiuino-local-profiler) add-on installed
- [GLP Integration](https://github.com/mxkissnr/gaggiuino-profiler-integration) installed and configured

## Installation via HACS

1. In HACS → Frontend → ⋮ → Custom repositories → add `mxkissnr/glp-lovelace-card` (category: **Lovelace**)
2. Download the card
3. Add a manual resource or let HACS handle it

## Configuration

```yaml
type: custom:glp-card
entity_prefix: sensor.gaggiuino_local_profiler_   # default, adjust if your device has a different name
glp_url: http://homeassistant.local:8099           # optional — adds "GLP öffnen" link
title: Gaggiuino                                   # optional header title
```

### Options

| Option | Description | Default |
|---|---|---|
| `entity_prefix` | Prefix shared by all GLP sensor entities | `sensor.gaggiuino_local_profiler_` |
| `glp_url` | URL to the GLP web interface (adds an "open" link) | *(none)* |
| `title` | Card header title | `Gaggiuino` |

## What it shows

- Machine online / error / brewing status
- Live "Bezug läuft …" banner when a shot is in progress
- Last shot: profile name, coffee bean, score, duration, yield, brew ratio, avg pressure
- Shots pulled today
- Time since last sync with the Gaggiuino controller
