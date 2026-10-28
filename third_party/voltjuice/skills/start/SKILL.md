---
name: voltjuice-start
description: Lead a non-technical user from nothing to one live VoltJuice order. Use on the first message about VoltJuice, trading, install, an API wallet, or auto trading, even if they only say they want to trade. Do not wait for them to name commands or write a prompt.
---

# Lead the user

The user only chats. You install, open pages, and run commands. They never type a command and never write a prompt for you. Speak their language. The lines below are the meaning; do not leave them in English if the user is speaking another language.

Run `voltjuice next` after every step. Obey its `note`. The user's balance is the `balance` field. `contractEquity` of `"0"` with `canTrade` true is a funded shared account. Say `balance`, then continue. Do not say the balance is 0, do not say trading is impossible, and do not move funds to the API wallet address. `transfer` of `never` means you do not offer a spot-to-contract move.

## Install, once

```bash
git clone https://github.com/voltjuice-xyz/agent.git ~/voltjuice-agent
cd ~/voltjuice-agent
npm install
npm link
voltjuice doctor
voltjuice markets
```

If `voltjuice` is missing after `npm link`, call `node ~/voltjuice-agent/src/cli.mjs` instead. Show market names and prices from the command. Do not invent them.

## Steps from `voltjuice next`

`next` is `key`. Send them to https://app.voltjuice.xyz/API on their own phone. They log in, create one API wallet, and sign once. Do not make them use this computer's browser unless they ask you to open it.

Then secret-request a card named `VOLTJUICE_API_KEY`. That card is the same kind as a saved API token: they type the key there, it stays out of the chat, and you do not open a terminal for it. Say:

"Open the API wallet page on your phone, sign in, create one API wallet, and sign once. Enter the private key in the secret card. Do not paste it into the chat, and do not type it into a terminal. You may paste the account address from that page. That address is not the key."

When the card is stored, run `voltjuice key set` with no arguments. It reads `VOLTJUICE_API_KEY` from the secret card or the environment. Never print that value, and never put it in the command. If a key appears in the chat, tell them to revoke that wallet on the API page and start this step again. Do not repeat the key.

Save the account address they pasted, or the one you read from the page, with `voltjuice master`.

`next` is `master`. Save the Master address shown on the API page with `voltjuice master`. Do not use the API wallet address, and do not use the address derived from the key. That key address holds no funds. If the value is still 0 after the Master address is saved, ask them to copy the Master address from the page again before treating it as an empty deposit.

`next` is `funds` only when `balance` is `"0"`. Open the deposit page. Say:

"There is no tradable balance yet. I opened the deposit page. Tell me when the deposit has arrived. You pay the network fee."

If `balance` is above 0, this step does not apply. Do not say it.

Wait. Then run `voltjuice next` again.

`next` is `account`. The address did not load. Re-read it from the page and save it again. Do not ask them to debug.

`next` is `cap`. One question, nothing else:

"What is the most USDC one live order may use? The minimum is 11. A number is enough."

When they name a number from 11 to 100000, run `voltjuice mode live --cap` with that number. Do not pick a cap yourself.

`next` is `trade`. Do not invent an order. Follow `skills/intent/SKILL.md`. If they already described a buy or a 24-hour strategy, use that. Otherwise ask once:

"Do you want one order now, or a strategy that keeps running after you close the phone? Describe the trade in your own words."

Then:

```bash
voltjuice account
voltjuice order --market BTC --side buy --notional 20
```

Use their market, side, and size. The smallest order is 11 USDC. An order above the cap is refused. Do not raise the cap. Tell them the result in one sentence: sent, or not sent and why.

If the order is not accepted, open https://app.voltjuice.xyz/trade and say:

"The order was not accepted. Place one small market order on this page and sign once, then tell me. I will send the same order again."

Retry the same order once. Do not ask them to read an error.

## After the first live order

One offer, not a setup quiz:

"I can keep running after you close the phone. Each order will stay inside your cap."

If they agree, save a routine that only runs `voltjuice account` and `voltjuice order` at or under the cap. The routine text must not contain the key. Pause by running `voltjuice mode paper` or by turning the routine off.
