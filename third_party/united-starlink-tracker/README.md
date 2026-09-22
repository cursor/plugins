# United Starlink Tracker

Cursor plugin that connects agents to [United Starlink Tracker](https://unitedstarlinktracker.com), a community-run tracker of United Airlines' Starlink WiFi rollout, through its hosted remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Check whether a specific United flight is assigned a Starlink-equipped aircraft, estimate Starlink odds for flights and routes, find confirmed Starlink departures in the next couple of days, plan connections that maximize Starlink hours, and pull fleet-wide rollout stats and tail numbers.

Setup page: https://unitedstarlinktracker.com/mcp

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **United Starlink Tracker**.
3. Click **Install**.

Or run `/add-plugin united-starlink-tracker` in chat.

## MCP

```json
{
  "mcpServers": {
    "united-starlink-tracker": {
      "type": "http",
      "url": "https://unitedstarlinktracker.com/mcp"
    }
  }
}
```

No authentication is required. There is no API key, OAuth login, or environment variable to configure.

## Before you connect

No account is needed. The server is public and read-only.

## What agents can do

| Tool | What it does |
| --- | --- |
| `check_flight` | Firm yes/no for a United flight number and date once the aircraft assignment is published (about 2 days out); falls back to a probability estimate otherwise |
| `predict_flight_starlink` | Probability that a United flight number gets a Starlink plane, from historical observations, for dates too far out for a confirmed assignment |
| `predict_route_starlink` | United flights between two airports (or touching one airport) ranked by Starlink probability |
| `search_starlink_flights` | Confirmed Starlink departures in the next ~2 days, filtered by origin and/or destination |
| `plan_starlink_itinerary` | Multi-stop routings between two airports ranked by coverage ratio (expected Starlink hours / total flight hours), with nonstops listed first |
| `get_fleet_stats` | Starlink installation counts and percentages across United mainline and express fleets, with a per-aircraft-type breakdown |
| `list_starlink_aircraft` | Starlink-equipped tail numbers, aircraft types, operators, and install dates |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- United Starlink Tracker is an independent community project and is not affiliated with, endorsed by, or an official product of United Airlines or Starlink.
- Predictions are probabilities derived from historical aircraft assignments, not guarantees. Confirmed yes/no answers are only available once United publishes assignments, roughly two days before departure.
- Itineraries from `plan_starlink_itinerary` are probability-ranked routings built from route history, not bookable itineraries. Connection timing is not validated; confirm on united.com before booking.
- All tools are read-only and idempotent. Nothing in this plugin writes data or makes bookings.
- The tracker hosts the server itself; this plugin does not wrap a local stdio server.

## Docs

- Setup page and tool overview: https://unitedstarlinktracker.com/mcp
- Tracker site: https://unitedstarlinktracker.com/
- Server URL: https://unitedstarlinktracker.com/mcp

Logo is the tracker's own site icon, as published at unitedstarlinktracker.com.

## License

MIT
