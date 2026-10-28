---
name: voltjuice-orders
description: VoltJuice order catalog, including professional order types. Use when the user asks for a stop, take-profit, scale, TWAP, chase, or trailing stop. Keep market and limit as the default words.
---

# Orders

Talk in the user's words. Market and limit are the normal orders. Open this list only when their idea needs it, or when they name one of these. Do not read the list aloud.

This file is the order manual. Do not browse another API document, and do not invent an order type that is not here.

| They say | You send | Rule |
| --- | --- | --- |
| Now, market | `--type market` | Default. |
| At a price | `--type limit --price` | Rests until filled. |
| Stop, market | `--type stop-market --trigger` | A buy stop sits above the mark. A sell stop sits below. |
| Stop, limit | `--type stop-limit --trigger --price` | Trigger plus the limit price. |
| Take-profit, market | `--type tp-market --trigger` | A buy sits below the mark. A sell sits above. |
| Take-profit, limit | `--type tp-limit --trigger --price` | Trigger plus the limit price. |
| Protect a new perp position | `--tp` and `--sl` on a market or limit | Long target above the mark, stop below. Short is the reverse. Not for spot. |
| Scale, ladder | `--type scale --scale-from --scale-to --scale-count` | Count is 2 to 20. Total size is still one order under the cap. |
| TWAP, slice it over time | `--type twap --minutes` | At least 100 USDC, so the cap must allow that. Minutes are 5 to 1440. |
| Chase the price | a routine | Each run: `voltjuice orders`, `voltjuice cancel` the old one, then a limit at the fresh mark. |
| Trailing stop | a routine | Each run: cancel the old stop, then `--type stop-market --trigger` at the new distance from the mark. |

Spot is `--book spot` and only market or limit. Perp is `--book perp`. Cross is the default. Isolated is `--margin isolated` and only when they asked. Leverage is `--leverage` from 1 to 20 and changes the whole perp position.

Say the choice back in one sentence. "I'll buy BTC with a market order if it trades through 82,000" is a stop-market. Do not also explain the other seven.
