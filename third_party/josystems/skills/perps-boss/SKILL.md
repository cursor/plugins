---
name: perps-boss
description: Core perps playbook for perps_bot (bots/perps.py) on Jupiter Perps (SOL, BTC, ETH). The bot builds per-chain packets in inbox/ and executes only what the agent writes to json_relay/perp_<chain>_signal.json (bots/tools/send_signal.py); it never opens a trade on its own. Leverage is collateral x multiplier, TP/SL are side-aware, every open position is re-tuned with update_params on each check, hard gates are never argued. Triggers: a "perps_bot - perp_<chain>_*.json" packet, inbox/perp_exit_suggestion.json, "open a long/short", "close my perp", "adjust my TP/SL", "check perps".
version: v4.4
allowed-tools: [Read, Write, Edit, Bash]
---

# Perps Boss

> **About this playbook (v4.4).** The rules for reading perps packets, sizing with leverage and managing open positions. Defaults are tuned for a cautious, newer owner; read SETUP.md section 4 and adjust size, leverage and stops to your owner's experience and risk.

## Owner rules come first

Before every trade decision (open, size, add, adjust, close, param change), read the owner's rules: `rules/rules.md`. Owner rules override every default in this skill (max size, max leverage, no-trade hours, loss limits). The bot's hard gates still apply on top. If a rule and a packet conflict, follow the rule and say so in your `reason`.


## Venue
Jupiter Perps only. Funding comes from the SOL wallet: opens wrap or swap SOL into
collateral, closes sweep the proceeds back to SOL.

## Leverage Vocabulary (use these words exactly)
- **Collateral**: the money you put up (the margin). It is what you can lose.
- **Leverage**: the multiplier, from 10x up to the owner's cap (`PERP_MIN_LEVERAGE` / `PERP_MAX_LEVERAGE`, set in bots/.env).
- **Position size (notional)**: collateral x leverage. This is the exposure the venue sees.
- **Liquidation price**: roughly `entry x (1 - 1/leverage)` for a long and
  `entry x (1 + 1/leverage)` for a short (`calc_liq_price`). Fees eaten from
  collateral move it closer; `calc_liq_from_account` uses the live account.
- **PnL %** is reported on collateral, net of fees.

Example: "0.25 SOL at 50x long" = 0.25 SOL collateral, 50x leverage, notional
of 12.5 SOL. A 2% move against you is near liquidation.

### Leverage Ladder (less collateral, more leverage)
The smaller the stake, the higher the leverage; it drops as collateral rises, and it never
goes above the owner's cap `PERP_MAX_LEVERAGE` (bots/.env; 20x by default, also when unset; settable 10x-250x). Defaults
(`PERP_LEV_LADDER` in bots/.env, `collateral_sol:leverage`, log-interpolated between steps):

| Collateral | Leverage | Notional |
|---|---|---|
| 0.1 SOL | 20x | 2 SOL |
| 1 SOL | 15x | 15 SOL |
| 10 SOL | 12x | 120 SOL |
| 50 SOL | 10x | 500 SOL |

Leave `leverage` out of an open and the bot uses the ladder for the collateral you gave
(the packet's `leverage_playbook.leverage_ladder` shows the live values). Set it yourself
to override, inside 10x to the cap. Owner rules can lower the cap.

Out-of-band requests are declined, never silently clamped. The number that lands
is the number asked for, or nothing lands. Recommended leverage in a packet is advice only.

## Signal Format (json_relay/perp_<chain>_signal.json)
One signal per file, one file per chain: `json_relay/perp_sol_signal.json`,
`perp_btc_signal.json`, `perp_eth_signal.json` (the legacy `perp_signal.json` also works;
the market then comes from the payload).
```json
{"action": "long", "market": "SOL-PERP", "perps_is_order": true, "collateral_sol": 0.25,
 "leverage": 50, "tp_pct": 4, "sl_pct": 1.5, "reason": "one line why"}
```
- `perps_is_order: true` is **required on every open** (`long` / `short` / `add`). Without it
  the signal is acknowledged and nothing is sent. Closes, adjusts and `update_params` do not need it.
- `action`: `long` | `short` | `close` | `close_pct` | `pull_initial` | `adjust` | `add` | `update_params` | `scan`
  (aliases such as `open_long`, `exit`, `modify`, `partial_close` are accepted).
- Sizing, pick ONE: `collateral_sol`, `collateral_usd`, or `size_usd` (notional).
  Bare `size` with `leverage` is read as SOL collateral. Old `collateral`/`amount`
  under 5 is read as SOL, otherwise USD. Be explicit to avoid guessing.
- Exits: `tp_price`/`sl_price` (prices) or `tp_pct`/`sl_pct` (percent of PRICE move from
  entry, side-aware). A level on the wrong side, or more than 50% away, is dropped with a warning.
- Always include `reason`. It is logged and used in autopsies.
- **Limit entries:** `action: "limit_long"` / `"limit_short"` with `limit_price` (plus the normal size, TP/SL and `perps_is_order: true`). Within 1% of the target it opens at market now. Otherwise it is parked in `bot_logs/perp_limit_order.json` (ack `status: parked`); the bot checks that market's mark price every ~30s and, when price reaches the target, sends it as a normal market open through every gate (ack with `signal_file: perp_limit_order.json` + Telegram). One parked entry at a time: a new one replaces the old. It expires after `expires_in_min` (or `expires_at`), default 24h (`PERP_LIMIT_TTL_HOURS`), ack `expired`. To cancel, delete `bot_logs/perp_limit_order.json`. `tp_pct`/`sl_pct` are priced at the fill; absolute `tp_price`/`sl_price` must still make sense at the target. If `NEW_POSITIONS_ENABLED` is off when it triggers, it is declined (`new_positions_off`) and consumed.

### Schema Check And Acks
The bot checks the shape before anything runs and declines with the reason: missing
`perps_is_order` on an open, no size or more than one size field, a market other than
SOL/BTC/ETH-PERP, or a non-number / non-positive value. The file is consumed as soon as it is
read, so it never runs twice. Every signal gets a final status in
`bot_logs/perp_signal_acks/<signal>.latest.json` (history in `acks.jsonl`):
- `parked`: a limit entry is waiting for its price (see Limit entries). Nothing was sent yet.
- `filled`: with `tx`, `entry`, `size_usd`, `collateral_usd`, `leverage`, `liq`, `tp`, `sl`, `exit_floor`.
- `declined`: a gate said no (band, minimum, schema, underfunded, new_positions_off). Nothing was sent.
- `failed`: the venue or funding failed. DNS/lookup and funding failures are not retried.
A `relay_ack` packet also lands in `inbox/` (failed / declined) or `inbox_results/done/` (filled).
Underfunded opens are declined, never shrunk: the number that lands is the number asked for.
The house exit floor always sits beyond your SL (between SL and liquidation); it is an alert, never a close.

## Each Cycle
1. Read the three chain packets (`inbox/perps_bot - perp_<chain>_*.json`).
2. Check open positions (`bot_logs/perp_positions.json`) and any exit suggestion (advice for you to decide; the bot never acts on it).
3. Weigh the feed lanes (below). They inform; they never fire anything.
4. Fire, adjust, close, tune open positions with `update_params`, or do nothing. Doing nothing is a valid call; say why.
5. Notify the owner through the owner-ping skill when you open, close, or decline.

## Position Modification
Run on every position check (the perps lane does it after draining packets). Each chain
packet with an open position carries `position_management.params` (the live TP, SL, trail
and exit floor, plus `params_source`) and `tune_with` (the action and the updatable keys).

1. **`update_params`**, change a running position's exit params (TP, SL, trail, exit
   floor) for one `market`. Per check, per position: tune them whenever price or thesis
   moved. Loss-direction inputs are normalized to positive magnitude. Every old -> new
   transition is logged to `bot_logs/perps_param_changes.jsonl` with your reason, and the
   owner sees "Params updated". Updatable:
   - `tp_price` or `tp_pct` / `take_profit_pct` (percent of price from entry, side-aware)
   - `sl_price` or `sl_pct` / `stop_loss_pct` (must stay on the safe side of liquidation)
   - `trail_activate_pct`, `trail_drop_pct` (percent of PnL, same units as TRAIL_ACTIVATE_PCT / TRAIL_DROP_PCT; drop clamped 3-50%)
   - `exit_floor` / `exit_floor_price` (clamped against liquidation, entry and TP)
   Size, leverage, collateral and direction are refused here (use `add` / `adjust`).
   A TP on the wrong side of entry or an SL past liquidation rejects the whole update.
   Aliases accepted: `set_params`, `params`, `update_levels`.
2. **`adjust`** / **`add`**, change size or leverage (hard gates apply).
3. **`close`**, full exit.

**Manual way:**
```json
{"action": "update_params", "market": "SOL-PERP",
 "params": {"tp_pct": 6, "sl_pct": 1.2, "trail_activate_pct": 3, "trail_drop_pct": 4},
 "reason": "funding flipped, tighten the stop and let the trail take it"}
```

| Want | Action | Example |
|---|---|---|
| Move TP / SL | `update_params` | `{action: "update_params", market, params: {tp_price: 182.5, sl_price: 171}}` |
| Lock more profit | `update_params` | `{action: "update_params", market, params: {trail_drop_pct: 3}}` |
| Raise the exit floor | `update_params` | `{action: "update_params", market, params: {exit_floor: 168}}` |
| Bigger / smaller, more / less leverage | `add` / `adjust` | see Signal Format |
| Get out | `close` | `{action: "close", market, reason: "..."}` |

## Profit Ratchet (default manage loop on every open)
Take profit on structure, not on hope. The bot never closes for you: TP and trail hits are
alerts, so the ratchet is how you lock gains.

1. **Map first** at entry: direction, first trim (base), good, moon, invalidation, and an
   add zone or an explicit no-add.
2. **Walk SL and TP up on structure as price climbs toward the first trim, before peeling.**
   Once it is clearly working and the thesis is alive, move SL to breakeven; closer to the trim,
   lock under the last higher low (lower high for a short). Do not leave SL at entry while it runs.
3. **Peel 30-40% at the first trim** (`close_pct`), unless you named take-the-whole-thing.
4. **The remainder is the runner.** Keep walking stops (`update_params`), take more toward
   good / moon, and `pull_initial` once it unlocks if you want house money only.
5. **One add max**, only on a pullback that holds the mapped add zone with the thesis alive.
   Never add into a fade, a big giveback, or a regime flip.
6. **Thesis death = full flatten** (`close`). Do not trim a dead thesis.

No makeup peels: if you missed the trim and it gave back, do not sell the pullback to look
compliant. Hold if the thesis lives, flatten if it died.

### Exit Vocabulary (one signal per file in `json_relay/perp_<chain>_signal.json`)
| Action | What it does | Example |
|---|---|---|
| `close` | Full exit. | `{"action": "close", "market": "SOL-PERP", "reason": "..."}` |
| `close_pct` | Close a chunk (`pct` 1-100); the rest stays open. | `{"action": "close_pct", "market": "SOL-PERP", "pct": 35, "reason": "first trim at base"}` |
| `pull_initial` | Bank roughly the initial collateral, let the rest ride. Unlocks at +50% equity (1.5x); at 2x it closes about half, at 4x about a quarter. | `{"action": "pull_initial", "market": "SOL-PERP", "reason": "..."}` |
| `update_params` | Walk TP / SL / trail / exit floor on an open position. | `{"action": "update_params", "market": "SOL-PERP", "params": {"sl_price": 182.0, "tp_price": 196.0}, "reason": "SL to the higher low"}` |
| `adjust` / `add` | Change size or leverage (hard gates apply). | see Signal Format |

Every close and partial close sweeps proceeds back to SOL. Tell the owner (owner-ping) when you peel, walk stops or close.

## Feed Lanes In The Packet
Every lane says `source`, `age_min`, `stale` (see `feed_sources`). Check `flags` first.
- **flow** (Flow public data; `stale` = older than FLOW_STALE_MIN):
  - `call`: Flow's per-coin call (direction, entry, tp, sl, horizon, locked, levels_stale,
    `mechanical_confluence` with votes). `risk.do_not_size_when` = Flow's own don't-size rules.
  - `live_call`: the live 12h call, `invalidate_if` kill lines, `minutes_left`, drift. Timing.
  - `cycle`: score, trend, phase (`phase_source` editorial / mechanical), next_move, cliff
    proximity, regime, regime_break. Regime.
  - `signals`: net signal, weighted bull/bear, top weighted signals, market drivers.
  - `risk`: blowoff composite/alert, invariants firing, live patterns, abort conditions.
  - `context`: macro (vol, VIX, DXY, rates, funding, fear & greed), rotation stage,
    200-week ratio, Pi cycle, 7-day projection with band, `curated_projection`.
  - `editorial`: the Flow editor's thesis, leverage bias, calls and their ages, and
    `hit_rate_vs_mechanical`. Treat as one opinion; check its age.
  - `calibration`: Flow's call hit rate and expectancy, model hit rates, whether the
    projection is decision-grade, pattern match quality. Low hit rate = less leverage.
- **odds_live** (fetched live at this packet, never cached):
  - `kalshi.hourly`: the nearest hourly ladder; `kalshi.daily`: the end-of-day (5pm ET) ladder.
    Each has `event`, `expiry`, `implied_median`, `p_up` (crowd P(price above spot at expiry))
    and `ladder` (strike, p_above, oi). Hourly = next-hour timing; daily = the session's lean.
    `kalshi_macro`: Fed / CPI / unemployment.
  - `polymarket.price_markets`: threshold markets (`threshold_usd`, `side` above/below,
    `implied_prob`, deadline); `polymarket.movers`: 24h moves of 10+ points.
- **news_feed**: this chain's headlines with `signal` bull/bear/neutral and counts.

How to use it: agreement across call + live_call + odds + signals supports conviction
(still inside the hard gates). Disagreement (e.g. flag "flow call LONG vs Kalshi p_up 0.38"),
a stale lane, or an abort condition argues for smaller size, lower leverage, or a pass.

Need fresher data? Ask: write `json_relay/feed_request.json`
`{"lanes": ["flow","news","odds"], "chains": ["SOL"]}` (answer lands as
`inbox/perps_bot - feed_SOL_<ts>.json`), or use query action `feed_packet` / `pull_feeds`.
Scheduled pulls follow `FEED_CADENCE` in `bots/.env` (minutes, default 5; `manual` = only when asked). Odds are also fetched live at every decision.

## Macro Prints (`macro_prints` packet block)
Every chain packet carries `macro_prints`: the released US CPI numbers behind the macro
headlines. Use it to check whether a loud headline is backed by the print.
- `cpi`: `headline_yoy_pct`, `core_yoy_pct` (y/y, not seasonally adjusted), `headline_mom_pct`,
  `core_mom_pct`, `gasoline_mom_pct` (m/m, seasonally adjusted), `gasoline_yoy_pct`, plus `period_label`.
- `flow`: Flow's FRED fields when present (`core_cpi`, `cpi_chg_3m`, `cpi_accelerating`,
  `fed_funds_rate`, `unemployment`, `oil`, `oil_chg`).
- `source` (`flow+bls` / `flow+fred` / `bls` / `fred` / `flow` / `none`), `age_min`, `stale`, `new_print_today`, `errors`.
- `read`: an optional one-line SI-brain read made from these numbers only (blank when the brain is off).

How to use it:
1. On a macro headline (CPI, "inflation surges"), read the numbers before reacting to the words.
2. Compare headline vs core. A hot headline with tame core and a big gasoline/energy m/m is an
   energy spike, not broad inflation. Hot core is the broad, stickier read.
3. Check `new_print_today` and `age_min`. A print from weeks ago is already priced; do not trade it as news.
4. It is context for your call, next to the flow, odds and news lanes. It never fires, gates or sizes
   a trade, and a stale or missing block is not a reason to act. Say in your `reason` what the print
   showed if it shaped the call (e.g. "headline hot, core tame, gas-driven").

The fetcher reads Flow first and uses the public BLS API for components (FRED mirror of the same
series if BLS refuses; at most daily, plus release-morning re-checks, capped well under the BLS limit). Cache: `bot_logs/macro_prints.json`.

## New Positions And Entry Alerts Switches
- `NEW_POSITIONS_ENABLED` (tuner, default true). Off = the owner halted new exposure: every `long`, `short`
  and `add` is declined with reason `new_positions_off` (ack `status: declined`, a "declined" Telegram note).
  On that decline: do not resend, do not try another market or a smaller size, and do not switch it back on
  yourself. Keep managing open positions (`close`, `close_pct`, `pull_initial`, `update_params`, `adjust`
  all still work), log the setup you would have taken in your `reason`/notes, and tell the owner once
  (owner-ping) that a signal was blocked by the switch. Only the owner turns it back on.
- `ENTRY_ALERTS_ENABLED` (tuner, default true). Off = no intel-scanner entry alerts. Packets still arrive and
  your signals still work; read the packets yourself.
- The bot never opens a trade on its own; both switches only narrow what happens. `AUTO_TRADE_ENABLED` is the
  deprecated old name and sets both.

## Trade Autopsy Packets
After a losing close (default `AUTOPSY_ON=loss`; `all` adds wins, `off` stops it) the bot reviews that ONE trade
and drops `perps_bot - trade_autopsy_<CHAIN>_<ts>.json` in your inbox: `verdict` (<=25 words), `root_cause`
(thesis_wrong, entered_early, entered_late, oversized, stop_too_tight, stop_too_wide, ignored_flip, news_shock, macro_shock, gave_back_profit, fees, noise_within_plan, worked_as_planned), `evidence` (up to 3 cited facts), `lesson`, optional `proposal`, `confidence`, `source`
(`grok:<model>` / `local:<model>` = SI brain, `rules` = the offline check; `si_note` says why rules were used).
Inputs: the position (entry/exit, size, TP/SL/trail, the `events` list of tp_reached / sl_near / sl_hit /
trail_active / trail_hit / liq_warn / floor_breach / flip alerts), your entry reason and conviction, the chain
packet you saw at entry (`entry_packet`), param changes during the hold, macro_prints, news lean at exit, fees.
History: `bot_logs/perp_trade_autopsies.jsonl` (one line per position, never repeated). The lesson also lands in
learnings Section 8 (`learnings/LEARNINGS.md`).
How to read it:
1. **Acknowledge it**: one line in your cycle notes (market, root cause, agree / disagree and why), then file the
   packet like any other.
2. **Judge the lesson**: it is one trade. Check it against the evidence and your rules; `rules` is a coarse
   check. One autopsy is a note; the same root cause again and again is a pattern (the nightly self-eval counts them).
3. **Apply what is yours**: entry timing, size inside your caps, acting on flips and alerts.
4. **Never change params silently**: a `proposal` (or any lesson that implies a tuner / param change) goes to the
   owner with the evidence (owner_inbox/ via owner-ping); apply it only after the owner agrees, through the normal directive.
The bot changed nothing. Cost guard: at most `AUTOPSY_SI_MAX_PER_DAY` (6) SI calls a day, then rules.

## Hard Gates (never argue with these)
Leverage outside 10x to the cap, missing collateral (with no leverage either), or no live price
blocks the trade. Report the block, do not retry with tweaked numbers.

## Directives (perp_meeting.json)
With an SI brain on, plain language works. With the brain off (LLM_MAIN and LLM_FALLBACK
`off`, or none reachable) use exact form: `set PARAM VALUE`, `default PARAM VALUE`,
`reset PARAM` (join several with `;`), or JSON `{"translated_to": [{"param": ..., "action": "set", "new": ...}]}`.
Anything else comes back as a clarification asking for exact form. Packets still carry
all data; brain summaries (flip digest, fused brief) are just blank.

## Contract update 2026-10-16: one-per-market setting, side field, richer acks
- **PERP_ONE_PER_MARKET** (.env / wizard / UI). `true` = one position per market: a long blocks a short on the same market, so close it first. `false` (public default) = what Jupiter allows: long and short on one market as separate positions. A same-side re-open is always `action=add`. The boot line prints the setting.
- **side** on close / update_params: when long AND short are both open on a market, add `"side":"long"` or `"side":"short"`. Without it the bot refuses with that reason. With one position open, side is optional.
- **Every refusal has a reason** in the ack (`status: declined`, `reason`) and a console line `[perp] DECLINED ...`. "see console" is gone.
- **update_params ack** (`status: processed`) shows the new `tp`, `sl`, `exit_floor`, trail values, `changes`, `params_rev`. A TP/SL change recomputes the exit floor so it stays beyond the SL. A floor you set yourself is kept and re-clamped.
- **close ack** (`status: filled`) shows `exit_price` (read AFTER the keeper executed, `exit_price_source`), `gross_pnl_usd`, `fees_usd`, `pnl_usd`, `pnl_pct_on_collateral`. `exit_mark_equals_entry: true` flags an oracle that had not moved.
- **open ack** shows `collateral_usd` as the chain holds it (`collateral_source: chain_position_account`), `collateral_requested_usd`, and `funding` (USDC on hand + swapped).
- **Max leverage** on the boot line is PERP_MAX_LEVERAGE (your cap).
- **Collateral cap**: `PERP_MAX_COLLATERAL_SOL` (bots/.env, optional). When set, an open with more collateral is declined, and size can never exceed that collateral x the leverage cap. Unset = no extra cap beyond the wallet.

## Tools (use these instead of hand-writing files)
- `python bots/tools/send_signal.py --market SOL --action long --collateral-usd 11 --tp-pct 2 --sl-pct 1 --reason "why" --wait` writes `json_relay/perp_<chain>_signal.json`, adds `perps_is_order: true` on opens, leaves leverage to the ladder unless you pass `--leverage`, and waits for the ack (exit 0 filled/processed/parked, 2 declined/failed/expired, 3 no ack, 4 previous signal still unconsumed).
- `python bots/tools/lane_run.py --lane perps --list`, then `--apply decisions.json` stamps, moves and audits every inbox file the lane owns (see the perps lane automation).
- Lessons go through `learnings_writer` (`python bots/sub-bots/learnings_writer.py --append "text" --type <type> --source perps`, or drop a JSON in `json_relay/learnings/`; it writes between the Section 8 markers of `learnings/LEARNINGS.md`). Never edit LEARNINGS.md by hand; the nightly learnings-summarizer distills Section 8.
- **Live-update**: a patch on disk now reloads even with positions open (only an op in flight waits). The new process re-adopts positions from perp_positions.json and logs it. If the relaunch fails or the engine heartbeat goes stale, the owner gets a Telegram alert and an inbox note lands (`relaunch_failed` / `perps_engine_stale`): tell the owner. Do not restart anything yourself.
