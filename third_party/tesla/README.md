# Tesla

Cursor plugin that connects Grok Bot to your [Tesla](https://www.tesla.com) account through Cursor's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Read cars and Powerwall or solar sites, and send commands. Commands that unlock the car, open a closure, start keyless driving, or change backup power ask you before they run.

## Install

1. Open **Grok Bot Settings → Plugins**.
2. Search for **Tesla**.
3. Click **Install**, then complete the Tesla sign-in prompt.

## MCP

```json
{
  "mcpServers": {
    "tesla": {
      "type": "http",
      "url": "https://api.cursor.com/rest-mcp/tesla/mcp"
    }
  }
}
```

Auth is OAuth 2.0 against Tesla with the scopes `openid`, `offline_access`, `user_data`, `vehicle_device_data`, `vehicle_location`, `vehicle_cmds`, `vehicle_charging_cmds`, `energy_device_data`, and `energy_cmds`. Tesla shows each scope as its own checkbox. Grok Bot prompts for Tesla sign-in when the plugin connects. Accounts on tesla.cn are not supported.

Commands that reach the car need Cursor's key paired in the Tesla app. `get_vehicle` reports whether it is paired and returns a pairing link when it is not. A sleeping car is not woken by a read. `wake_vehicle` is a separate command, and Tesla bills each wake. Car coordinates come only from `get_vehicle_location`.

## Tools

- **Account and cars:** `get_account`, `list_orders`, `list_vehicles`, `get_vehicle`, `get_vehicle_data`, `get_vehicle_location`, `find_nearby_chargers`, `get_recent_alerts`, `get_service_status`, `get_release_notes`, `list_drivers`, `get_vehicle_entitlements`
- **Energy sites:** `list_energy_sites`, `get_energy_site`, `get_energy_history`
- **Commands:** `wake_vehicle`, `navigate_to`, `navigate_to_coordinates`, `navigate_to_supercharger`, `lock_vehicle`, `honk_horn`, `flash_lights`, climate and seat controls, charging and schedules, `control_media`, `set_vehicle_name`, `set_backup_reserve`, `set_energy_operation_mode`, `set_storm_watch`, `set_grid_import_export`, `set_off_grid_ev_reserve`
- **Commands that always ask:** `unlock_vehicle`, `actuate_trunk`, `open_frunk`, `control_windows`, `control_sunroof`, `remote_start_drive`, `set_sentry_mode`, `set_valet_mode`, `set_speed_limit`, `set_pin_to_drive`, `trigger_homelink`, `manage_software_update`

## Docs

- Tesla Fleet API: https://developer.tesla.com/docs/fleet-api

Logo is the Tesla T emblem, placed on a white tile with padding so it reads well in the UI:
https://commons.wikimedia.org/wiki/File:Tesla_T_symbol.svg
