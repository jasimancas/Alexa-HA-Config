# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-10-14

First release as **Alexa HA Config** (new add-on slug `alexa_ha_config`).

### Changed
- Publishing now edits only `alexa.smart_home.filter.include_entities`: comments,
  blank lines, ordering and `!include`/`!secret` tags in `configuration.yaml` are preserved
- Follows `!include` (e.g. `alexa: !include alexa.yaml`) and writes to the included file
- Atomic writes and timestamped backups in `.alexa_ha_config_backups/` (last 10 kept)
- Entities inherit the area of their device, like the Home Assistant UI
- Disabled entities are hidden unless they are already shared
- The sidebar port 8080 is no longer exposed; the UI is only reachable through Ingress

### Added
- After publishing, optionally validate the configuration and restart Home Assistant
- Name column and search by entity name
- "Share all shown" / "Unshare all shown" bulk actions for the current filter
- Unpublished changes counter with Discard, and a warning before leaving the page
- Publish is disabled when there is nothing to publish

### Fixed
- Loading entities hung forever when there were no areas or devices, or the token was invalid; now fails fast with a clear message and a 15s timeout
- Switches lost their state when changing page and the Shared/Unshared tabs ignored local changes
- Searching with characters like `(` or `[` crashed the page
- API error messages were replaced by a generic "Request failed with status code 500"

## [1.0.3] - 2026-01-21

### Added
- Items per page dropdown with options: 10, 20, 50, 100, and All

## [1.0.2] - 2025-01-17

### Added
- Split search component with hierarchical dropdown filters
- Filter entities by Domain (light, switch, sensor, etc.)
- Filter entities by Area (Living Room, Kitchen, etc.)
- Filter entities by Manufacturer (Philips, Ecobee, etc.)
- Combined filtering: use dropdowns and text search together

### Changed
- Sync toggle now displays blue color when active
- Updated @material-tailwind/react to 2.1.10

## [1.0.1] - 2025-01-16

### Added
- Initial public release
- Web UI for selecting Home Assistant entities to expose to Amazon Alexa
- Support for multiple entity domains: lights, switches, sensors, binary sensors, climate, scenes, buttons, and automations
- Search functionality to filter entities by name
- Tab-based filtering by sync status (All, Synced, Unsynced)
- Pagination for large entity lists
- Sortable columns (Name, Domain, Area)
- Publish changes dialog with confirmation
- Home Assistant ingress support for seamless integration
- Multi-architecture support (amd64, aarch64)
- Responsive design for mobile and desktop
