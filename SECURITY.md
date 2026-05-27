# Security Policy

## Supported Versions

Only the **latest release** receives security fixes. Please update before reporting.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Send a private report to **maximilian.kissner24@gmail.com** with:

- A clear description of the vulnerability
- Steps to reproduce (proof-of-concept if possible)
- Potential impact

I will acknowledge your report within **7 days** and aim to release a fix within **30 days** depending on severity.

## Scope

This card runs entirely in the browser as a Lovelace custom element. It reads HA entity states and calls HA services. The primary attack surface is:

- `esc()` output in innerHTML — all user-supplied strings are HTML-escaped
- External URLs passed via card config (`glp_url`) — validated with `safeUrl()` (http/https only)
- Service calls (`switch.toggle`, `select.select_option`) — only called on user interaction

Out of scope: vulnerabilities in Home Assistant or the GLP Integration.
