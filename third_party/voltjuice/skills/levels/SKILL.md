---
name: voltjuice-levels
description: Move a VoltJuice user from reading the account, to a practice order, to one confirmed live order, and only then to a 24-hour strategy. Use before the first live order and before saving a routine.
---

# Levels

Do not start at full automation. Say which level you are on, in the user's language.

## 1. Read

No key is required to read public prices. Run `voltjuice markets`. With a master address, run `voltjuice account`. Report `balance`. You may explain and suggest. You do not send an order.

## 2. Practice

`voltjuice next` still says the mode is paper, or the user has not named a cap. Send the order they described with the default paper route. Tell them it was not sent to the market. One practice order is enough to show the size and price. Do not ask them to tune a strategy here.

## 3. One confirmed live order

Only after they name a per-order cap of at least 11. Run `voltjuice mode live --cap` with their number. Repeat the order in one sentence: market, side, size, order type, and cap. Send it only after that sentence, because they already asked you to trade. If they only asked what would happen, stay on practice.

## 4. Unattended

Only after one live order has succeeded, and only after they say they want it to keep running when the phone is closed. Use `skills/intent/SKILL.md` for the default plan and `skills/routine/SKILL.md` to save it. A refused order stops the loop. Do not raise the cap. Do not open a second position.

Leaving a level is one sentence. "This order is still practice" or "This is the live order, 20 USDC, inside your cap of 12."
