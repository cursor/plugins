---
name: voltjuice-trade
description: Place a VoltJuice order after the start path says next is trade. Do not ask the user which command to run.
---

# Trade

If `voltjuice next` is not `trade`, finish the start path first.

Read `balance` from `voltjuice account`. That is the tradable USDC. Do not invent a balance, and do not call `contractEquity` the balance. If `canTrade` is true, place the order.

```bash
voltjuice order --market BTC --side buy --notional 20
```

Use the market, side, and size the user already gave. The smallest order is 11 USDC. An order above the cap is refused. Do not raise the cap. Close with the opposite side and `--reduce-only`.

Optional `--leverage` is 1–20 and changes the whole position. Return to practice with `voltjuice mode paper`.
