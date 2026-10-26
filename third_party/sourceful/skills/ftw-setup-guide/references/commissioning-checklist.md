# Commissioning checklist

Use as a sequential verification plan, not a permission to control equipment. For new users without a connected home, guide locally; if an owner grants the FTW plugin access, use supported read tools to verify observations.

## Baseline and safety

- Record actual site fuse rating from installer/label, phase count, meter placement, equipment manufacturer/model and firmware. Electrical wiring and CT installation require a qualified electrician.
- Establish only one Core/controller owns each writable device. Keep vendor app/emergency and manual fallbacks working.
- Assign a stable DHCP lease or otherwise stable host address. Keep site API LAN-only or behind the approved FTW Cloud mechanism, not an ad hoc public port forward.
- Configure an independent grid/site meter and check healthy, fresh per-phase measurements before active dispatch.

## Device pairing and validation

- Check model/firmware in https://srcfl.github.io/device-drivers/ and identify *actual* read/control support and whether it was verified with real hardware.
- Setup the site meter and limits first. Add inverter/PV and battery one by one; then OCPP charging and optional heat pump. Preserve unit IDs, protocol IP/port and manufacturer constraints only after source-backed validation.
- Verify signed power flows: FTW site convention `grid_w = load_w + battery_w + pv_w`, solar generation negative, battery charging positive, grid importing positive. EV power may already be part of load; don't add again. A mismatch can reflect timing/staleness rather than malfunction.
- Check new device data freshness, state of charge bounds, maximum charge/discharge power, actual battery vs inverter limits and any exporter restrictions. Do not claim hardware obeys a command without measured response.

## Operation and completion

- Confirm plan availability, accurate price zone and source, grid/fuse limits, reserve rules and EV charging goals if relevant. Only assert savings when measured histories and tariff terms support it.
- After safe commissioning check FTW runtime health, devices, planner, logs, backup and recovery procedure. Perform a scheduled reboot and verify readings and control ownership afterward.
- Optional: enable FTW Cloud by owner choice; only then connect the AI assistant via OAuth and grant appropriate scopes. Validate `homes_list`, live data, health and planner with real tool outputs.
- Deliver a short handover: host and software version (no secrets), devices, permissions, known data gaps, backup location (not credentials) and one next action.
