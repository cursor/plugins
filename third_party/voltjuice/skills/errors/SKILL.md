---
name: voltjuice-errors
description: Recover from a failed VoltJuice order without sending a duplicate or a larger order. Use when an order, cancel, or account read fails.
---

# When an order fails

Read the message. Do not retry the same command unchanged, and do not increase the size.

| What happened | What you do |
| --- | --- |
| No key, or the key was rejected | Stop. Secret-request `VOLTJUICE_API_KEY` again, or ask them to revoke the wallet on https://app.voltjuice.xyz/API and create one new key. Do not guess another key. |
| Master address missing, or `reason` is `key-address` | Ask for the Master address on the API page. Do not use the API wallet address. |
| Balance is below the order | Stop. On a shared account, `balance` is the number. On a split account, `next` of `move` means they move USDC to the contract balance on the site. |
| Size, price, trigger, leverage, or unknown market | Fix that one field. Tell them the correction in one sentence, then send the corrected order only if they already asked for the trade. |
| Above the cap | Stop. The cap stays. Offer a smaller size. |
| The command returned a network or unknown failure | Wait, then run `voltjuice orders` and `voltjuice account`. If the position or the order is already there, do not send it again. If both are absent, send the same order once. |
| The order was not accepted and the account has never traded | Open https://app.voltjuice.xyz/trade and ask them to place one small market order and sign once. Then send the same order once. |

After two failures in one run, run `voltjuice mode paper` and tell them live orders are paused. Do not keep looping.

One sentence is enough: what failed, what you did, and what you need from them. Speak the user's language.
