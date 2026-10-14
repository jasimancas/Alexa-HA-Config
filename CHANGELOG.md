# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-14

First release of **Alexa HA Config**.

### Features
- Web UI (Home Assistant Ingress) to choose which entities are exposed to Amazon Alexa
- Search by name, device, manufacturer or entity ID; filter by Domain, Area, Manufacturer and status
- "Share all shown" / "Unshare all shown" bulk actions for the current filter
- Unpublished changes counter with Discard, and a warning before leaving the page
- After publishing, validate the configuration and restart Home Assistant from the add-on

### Safe configuration editing
- Only `alexa.smart_home.filter.include_entities` is changed: comments, blank lines,
  ordering and `!include` / `!secret` tags in `configuration.yaml` are preserved
- Follows `!include` (e.g. `alexa: !include alexa.yaml`) and refuses paths outside the config folder
- Atomic writes and timestamped backups in `.alexa_ha_config_backups/` (last 10 kept)

### Home Assistant integration
- Entities inherit the area of their device; disabled entities are hidden unless already shared
- Fails fast with a clear message on invalid token, Home Assistant errors or a 15s timeout
- Least-privilege add-on permissions: Ingress only, admin-only panel, `homeassistant` Supervisor role
- Minimal image (Next.js standalone output) supervised by `run.sh`
- Multi-architecture images: amd64, aarch64
