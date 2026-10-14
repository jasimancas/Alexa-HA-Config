# Alexa HA Config Documentation

## Overview

Alexa HA Config is a Home Assistant add-on that provides a web interface for selecting which Home Assistant entities to expose to Amazon Alexa. Instead of exposing your entire smart home, you can choose exactly which entities should be shared.

## Prerequisites

Before using Alexa HA Config, ensure you have:

1. **Home Assistant** version 2023.0.0 or later
2. **Amazon Alexa integration** configured in Home Assistant
3. A Home Assistant **Supervisor** installation (Home Assistant OS or Supervised)

## Installation

### Quick Install

Click the button below to add the repository to your Home Assistant instance:

[![Add Repository](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fjasimancas%2FAlexa-HA-Config)

### Manual Installation

1. Navigate to **Settings** > **Add-ons** > **Add-on Store**
2. Click the menu icon (three dots) in the top right corner
3. Select **Repositories**
4. Add the following URL: `https://github.com/jasimancas/Alexa-HA-Config`
5. Click **Add**
6. Find "Alexa HA Config" in the add-on store and click **Install**

## Permissions

The add-on asks only for what it needs:

| Permission | Why |
|---|---|
| `homeassistant_config:rw` | Read and update the Alexa entity list in your configuration |
| `homeassistant_api` | Read the device, entity and area registries |
| `hassio_role: homeassistant` | Validate the configuration and restart Home Assistant after publishing |

The panel is only visible to **administrators**, and the UI is only reachable through
Home Assistant Ingress (no ports are opened on your host).

## Configuration

### Add-on Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ha_websocket_url` | URL | `http://supervisor/core/websocket` | Home Assistant WebSocket URL. Usually doesn't need to be changed. |
| `ha_access_token` | Password | (empty) | Long-lived access token. Leave empty to use the Supervisor token (recommended). |
| `ha_entity_domains` | List | See below | Entity domains to display in the UI |

### Default Entity Domains

By default, the following entity domains are available:

- `switch` - Switches and smart plugs
- `scene` - Scenes
- `sensor` - Sensors
- `binary_sensor` - Binary sensors (on/off)
- `light` - Lights
- `climate` - Thermostats and HVAC
- `button` - Buttons
- `automation` - Automations

You can customize this list in the add-on configuration to show only the domains you need.

### Example Configuration

```yaml
ha_websocket_url: http://supervisor/core/websocket
ha_access_token: ""
ha_entity_domains:
  - light
  - switch
  - climate
  - scene
```

## Usage

### Accessing the UI

After installation, access Alexa HA Config through:

- **Sidebar**: Click "Alexa HA Config" in the Home Assistant sidebar
- **Add-on page**: Go to the add-on and click "Open Web UI" (the UI is only available through Home Assistant Ingress)

### Selecting Entities

1. **Browse entities**: The main table shows all entities from your configured domains (disabled entities are hidden unless already shared)
2. **Search**: Filter by entity name, device, manufacturer or entity ID
3. **Filter**: Use the dropdowns to filter by Domain, Area or Manufacturer, and the tabs for All / Synced / Unsynced
4. **Toggle**: Click the switch to share or unshare an entity
5. **Bulk**: **Share all shown** / **Unshare all shown** apply to everything matching the current filters
6. **Review**: The header shows how many unpublished changes you have; **Discard** reverts them

### Alexa column and per-entity settings

The **Alexa** column shows, for each entity:

- ✅ what Alexa can do with it (on/off, brightness, colour, position, temperature...), based on its real state
- ⚠️ warnings, e.g. locks and garage doors ask for a voice PIN, scenes can't be turned off,
  sensors need proactive events to trigger routines
- ⛔ entities Alexa can't use at all (only temperature `sensor`s and door/window/motion
  `binary_sensor`s are supported)

Click the ✏️ button to set, for that entity:

| Field | What it does |
|---|---|
| Spoken name | The name you say to Alexa. It does not rename the entity in Home Assistant |
| Description | Shown in the Alexa app |
| Device type | Alexa display category (Light, Smart plug, Fan, Thermostat...). Changes the icon and grouping; e.g. a plug driving a lamp as *Light* obeys "turn off the lights" |

Edits are kept as unpublished changes and written to `alexa.smart_home.entity_config` on **Publish**.

### Settings

The **Settings** button configures:

- **Language (locale)**: must match your Echo devices (e.g. `es-ES`)
- **Proactive events**: region plus Client ID / Client secret from *Alexa Skill Messaging*.
  Needed for sensors and doorbells to trigger Alexa routines

Credentials are **write-only**: the add-on never shows their value, only whether they are set
and how they are stored. New values are always saved to `secrets.yaml` and referenced with `!secret`.

### Credentials in plain text

If `client_id`, `client_secret` or any other credential under `alexa:` is written in plain
text, a red banner offers **Migrate to secrets.yaml**. It moves each value to `secrets.yaml`
(reusing an existing key if the value is already there, never overwriting a different one),
replaces it with `!secret ...`, keeps your comments and backs up both files.

### Publishing Changes

1. Click **Publish Changes** (enabled only when there is something to publish)
2. Review the number of entities and click **Publish**
3. The add-on updates the entity list and keeps a backup of the previous file

### Applying the changes

The Alexa `smart_home` YAML configuration is only read when Home Assistant starts.
After publishing you will be offered **Check & restart**: the add-on validates the
configuration first and only restarts Home Assistant if it is valid. Choose **Later**
to restart yourself.

Once Home Assistant is back, ask Alexa to *"discover devices"*.

## How It Works

Alexa HA Config only edits `alexa.smart_home.filter.include_entities`. Everything else in the
file — comments, blank lines, key order, `!include` and `!secret` — is left untouched.

- If your Alexa configuration lives in another file (`alexa: !include alexa.yaml`), that file is updated instead. Includes pointing outside the config folder are refused.
- Before each change a timestamped copy is saved to `.alexa_ha_config_backups/` inside your config folder (the last 10 are kept).
- Files are written atomically, so Home Assistant never reads a half-written file.

Example of the generated configuration:

```yaml
alexa:
  smart_home:
    filter:
      include_entities:
        - light.living_room
        - switch.bedroom_fan
        - climate.thermostat
```

## Troubleshooting

### Add-on won't start

- Check the add-on logs for error messages
- Ensure Home Assistant is version 2023.0.0 or later
- Verify the Supervisor is running properly

### Entities not showing

- Verify the entity domain is included in `ha_entity_domains` configuration
- Check that entities exist and are not disabled in Home Assistant
- Try clicking the **Reload Devices** button

### Changes not reflected in Alexa

1. Ensure you clicked **Publish** and confirmed the changes
2. Restart Home Assistant (the add-on offers **Check & restart** after publishing)
3. Ask Alexa to "discover devices"
4. Wait a few minutes for changes to propagate

### Restoring a backup

Copy the desired file from `.alexa_ha_config_backups/` over your `configuration.yaml`
(for example with the File editor or Samba add-on) and restart Home Assistant.

### "Home Assistant rejected the access token" / "Timed out"

- Leave `ha_access_token` empty to use the Supervisor token
- If you set a long-lived token, make sure it is still valid

### WebSocket connection errors

- Ensure `ha_websocket_url` is correct (default works for most setups)
- If using a custom URL, ensure it's accessible from the add-on container
- Check Home Assistant core logs for WebSocket errors

### Permission errors

- The add-on needs write access to `/config` (Home Assistant configuration directory)
- Ensure the add-on has the required API permissions enabled

## Support

- **Issues**: [GitHub Issues](https://github.com/jasimancas/Alexa-HA-Configissues)
- **Source Code**: [GitHub Repository](https://github.com/jasimancas/Alexa-HA-Config)

## License

This add-on is released under the [MIT License](LICENSE).
