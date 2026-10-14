<p align="center">
  <img src="logo.png" alt="Alexa HA Config" width="250">
</p>

<p align="center">
  <a href="https://github.com/jasimancas/Alexa-HA-Config/releases"><img src="https://img.shields.io/github/v/release/jasimancas/Alexa-HA-Config?label=release" alt="Release"></a>
  <a href="https://github.com/jasimancas/Alexa-HA-Config/actions/workflows/ci.yml"><img src="https://github.com/jasimancas/Alexa-HA-Config/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/arch-amd64%20%7C%20aarch64-informational" alt="Architectures">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jasimancas/Alexa-HA-Config" alt="License"></a>
</p>

# Alexa HA Config

A Home Assistant add-on to manage the **Amazon Alexa Smart Home** integration from a web
panel instead of hand-editing YAML: which entities Alexa sees, what they are called by
voice, what type of device they are, and the integration's own settings.

It edits the `alexa:` section of your configuration surgically: comments, `!include`
and `!secret` stay exactly where they were.

## Features

| | |
|---|---|
| **Entity selection** | Share or unshare entities one by one or everything matching a filter (domain, area, manufacturer, text). Pending changes are counted and can be discarded before publishing. |
| **Per-entity settings** | Spoken name, description and Alexa device type (light, smart plug, fan, thermostat...) written to `entity_config`. |
| **Compatibility check** | For each entity, what Alexa can actually do with it (on/off, brightness, colour, position, temperature...) based on its real state, and a warning when it can't use it. |
| **Integration settings** | Language, proactive events region and Client ID / secret. Credentials are write-only and always stored in `secrets.yaml`. |
| **Secrets audit** | Detects credentials written in plain text under `alexa:` and moves them to `secrets.yaml` with one click. |
| **Apply safely** | Validates the configuration through the Supervisor and only then restarts Home Assistant. |

## Requirements

- Home Assistant OS or Supervised (add-ons need the Supervisor), 2024.1 or newer
- The [Alexa Smart Home](https://www.home-assistant.io/integrations/alexa.smart_home/)
  integration set up with `alexa: smart_home:` in YAML (this add-on manages it, it does not create the skill)

## Installation

[![Add repository to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fjasimancas%2FAlexa-HA-Config)

Or manually: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**, add
`https://github.com/jasimancas/Alexa-HA-Config`, then install **Alexa HA Config** and start it.
It appears in the sidebar for administrators.

## Usage

1. Toggle the entities Alexa should see. Use the ✏️ button to give one a spoken name or device type.
2. Click **Publish Changes** and confirm.
3. Choose **Check & restart**: the configuration is validated and Home Assistant restarts.
4. Ask Alexa to *discover devices*.

## What it writes

Only these keys under `alexa.smart_home` are touched:

```yaml
alexa:
  smart_home:
    locale: es-ES                               # Settings
    endpoint: https://api.eu.amazonalexa.com/v3/events
    client_id: !secret alexa_client_id          # always as !secret
    client_secret: !secret alexa_client_secret
    filter:
      include_entities:                         # entity selection
        - light.living_room
        - switch.coffee_maker
    entity_config:                              # per-entity settings
      light.living_room:
        name: Salón
        display_categories: LIGHT
```

Everything else in the file is left as it was. If the section lives in another file
(`alexa: !include alexa.yaml`), that file is edited instead.

## Safety

- **Backups**: every modified file is copied to `.alexa_ha_config_backups/` first (last 10 kept).
- **Atomic writes**: Home Assistant never reads a half-written file.
- **Secrets never leave the server**: the UI only learns whether a credential is set and how it is stored.
- **Least privilege**: Ingress only (no open ports), admin-only panel, `homeassistant` Supervisor role.

Full option reference and troubleshooting: [DOCS.md](DOCS.md).

## Development

```bash
pnpm install
pnpm dev            # Next.js dev server
pnpm test           # unit tests (Vitest)
pnpm test:e2e       # end-to-end tests against a mock Home Assistant (Playwright)
pnpm lint && pnpm type-check
```

Releases: bump `version` in `config.yml` and `package.json`, update `CHANGELOG.md` and push a
`vX.Y.Z` tag. Images are published to `ghcr.io/jasimancas/alexa-ha-config-{amd64,aarch64}`.

## Credits

Based on [alexa_share](https://github.com/cfpinto/alexa_share) by
[cfpinto](https://github.com/cfpinto), released under the MIT License. Alexa HA Config
started as a fork of that project and has since been largely rewritten and extended.

## License

[MIT](LICENSE). Amazon, Alexa and Echo are trademarks of Amazon.com, Inc.; this project is
not affiliated with or endorsed by Amazon.
