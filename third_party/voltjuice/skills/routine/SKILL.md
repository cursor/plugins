---
name: voltjuice-routine
description: Save a repeating VoltJuice strategy, not a one-off buy. Use after the account can trade and the user wants it to keep running when the phone is closed.
---

# Strategy

A routine is a quantitative loop. It is not one market buy. Do not invent a buy just to "start trading."

Read `voltjuice next` first. If `next` is not `trade`, finish that step. If `canTrade` is false, do not place an order.

The routine text must name all of these, and only use `voltjuice` commands:

- `perp` or `spot`
- the account mode already set: shared (`unifiedAccount` or `portfolioMargin`) or split (`default` or `disabled`)
- for perp: `cross` or `isolated`, and leverage from 1 to 20
- `market` or `limit`; a limit includes the price
- size at or under the cap, and at least 11 USDC when opening
- `--tp` and `--sl` when the strategy protects a perp position
- `--side buy` for a long, `--side sell` for a short. The saved text and the schedule name use the side they named. Do not invert it.

Shared accounts never move funds between spot and contract. Split accounts stop and ask the user to move USDC on the site when `next` is `move`. The API wallet address is never a destination.

Each run reads `voltjuice account`, then sends one order inside the cap. A refused order is not retried larger. Close with the opposite side and `--reduce-only`. The text must not contain the key.

Pause with `voltjuice mode paper` or by turning the routine off.

If they name an end time, schedule a separate wake at that time whose only job is to pause and turn the routine off. A cron that stops at the previous hour, such as `0 5-7 * * *` for an 08:00 end, never reaches the end time, so a check inside those runs cannot turn it off. The last trading run is not a substitute. A daily cron left enabled trades again the next day. After the end time, the routine must show as off.
