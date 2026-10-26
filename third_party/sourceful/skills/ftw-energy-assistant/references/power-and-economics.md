# Power, energy and economics reference

## Observations, measurements and forecasts

1. Record the requested interval in the home's local timezone, with explicit UTC offsets when a clock transition occurs. Distinguish collected timestamps from device clock and ingestion timestamps.
2. Use `status` for instant power and equipment state. The reading age and source are as important as its value. A W value sampled at one instant cannot by itself establish daily kWh.
3. The public tools return power trends, not the measured Wh ledger. If exact energy, costs or savings are needed, explain that gap and guide the user to the box's local history. Null coverage is unknown, not zero.
4. For solar self-consumption, grid import/export, battery input/output or EV use, inspect `flow`, `asset`, `unit`, `quality` and source before selecting categories. Do not derive overlapping energy categories by summing without a verified ledger definition.
5. Use `history_query` for visualization and approximate hourly patterns; be explicit if trend downsampling or gaps influence interpretation.

## Sign convention (instantaneous)

Let values be in watts in the FTW **site** convention:

- `grid_w` positive = buy/import; negative = sell/export.
- `pv_w` negative when PV produces.
- `battery_w` positive when battery charges; negative when it discharges.
- `load_w` positive = site load.
- `ev_w` positive when car charges. It may be a subset of site load; never add it to `load_w` without source evidence.

Consistency check: `grid_w = load_w + battery_w + pv_w`. A mismatch may reflect non-synchronous measurements, additional sources, lost readings or an equipment model issue; check freshness and semantics rather than labeling it a hardware fault from a single sample.

For positive PV production display `max(0, -pv_w) / 1000` kW. For positive battery discharge display `max(0, -battery_w) / 1000` kW. For imports display `max(0, grid_w) / 1000` kW.

## Cost analysis and arbitrage

- Read tariff inputs and price units from source first. Spot, retail import tariff, grid energy tariff, effect tariff, taxes, VAT, export remuneration and export fees are distinct. Do not substitute Swedish generic values for the home's contract.
- Daily net energy cost requires measured kWh buckets multiplied by the correct time-varying effective prices, plus applicable grid costs. If the prices are unavailable, present energy separately and label hypothetical price examples as scenarios.
- Battery discharge to self-consume and grid export can have different economics. The relevant comparison is *incremental* cost/revenue, not a single DA spread.
- Arbitrage gross spread is not realized net profit. Include conversion losses, variable tariffs, degradation per throughput, power limits, SoC/reserve constraints and any contracted export rules. Verify whether imported energy is double-taxed when stored and exported rather than assuming relief.
- Peak shaving depends on tariff's measurement interval, billable demand peak definitions and relevant grid billing cycles. A 15-minute reduction cannot be monetized without the actual agreement.
- If the user provides a local savings report, explain its baseline, assumptions and coverage. The public connection does not retrieve that report. Do not present it as a guaranteed saving.
- Observe whether the system's planner reasons include `cheap_import`, `expensive_import`, `solar_surplus`, `peak_shaving`, `reserve_held`, `export_paid` or `idle`. These reason codes explain intent, not execution.

## Suggested report

**Nu:** one paragraph with the site flows, battery SoC, operating mode, and freshness.

**Senaste 24h/7d:** measured import, export, PV, battery charge/discharge and EV if data supports them; gaps/estimated shares.

**Nästa dygn:** battery/EV plan, expected high/low-price actions and primary constraints; mark forecasts.

**Ekonomi:** realized/estimated cost with sources and missing tariff components, avoiding false precision.

**Åtgärd:** one prioritized suggestion, with a clear separation between advice and an actual command.
