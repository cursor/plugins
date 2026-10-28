---
name: voltjuice-intent
description: Turn a user's plain-language trading idea into one order or a 24-hour strategy. Use when they say what they want to buy, sell, or automate, including vague retail ideas. Do not start with a parameter form.
---

# Listen, then choose one path

The user talks like a person. They may not know leverage, margin, or indicators. Do not quiz them. Do not ask them to name a command.

Finish `voltjuice next` until `next` is `trade` before sending anything. The balance you mention is `balance`.

When the account can trade, ask once, in their language:

"Do you want one order now, or a strategy that keeps running after you close the phone? Describe the trade in your own words."

Skip the question when they already said which one.

## One order

Use this when they describe a situation: a coin, a price, a size, "buy the dip", or "close it". Do not create a schedule.

Map their words onto one `voltjuice order`:

- Coin and buy or sell come from their sentence. If size is missing, use 11 USDC or their cap, whichever is smaller, and tell them the number.
- "At a price" or "if it falls to" is `--type limit --price`. "Now" or no price is `--type market`. A stop, a standalone take-profit, a ladder, TWAP, a chase, or a trailing stop is in `skills/orders/SKILL.md`. Use that file only for those words. Do not offer them first.
- They said a coin spot purchase, or named no leverage: `--book spot` only when they said spot. Otherwise `--book perp`.
- They did not mention margin or leverage: `--margin cross` and no leverage change. Do not ask.
- They named a target or a pain level: `--tp` and `--sl` on a perp order. A long target is above the mark and the pain level is below. A short is the reverse. If the side is wrong, fix it and tell them in one sentence. Do not attach these to a spot order.
- Read `accountMode`. Shared accounts (`unifiedAccount`, `portfolioMargin`) never move funds. Split accounts (`default`, `disabled`) stop on `next` of `move`.

Say the order back in one sentence, then send it if they already asked you to do it. Ask whether to place it only when the sentence was ambiguous. Speak the user's language.

## Always on

Use this when they say automatic, all day, 24 hours, or a strategy. They do not need to know what a strategy contains.

Propose one complete plan. Do not offer a menu of indicators. Fill every blank yourself:

- Perp, cross margin, leverage 3. Say that 3x is the cautious default and isolated is only if they later ask for a separate position.
- Market entry. Size is the smaller of their cap and one fifth of `balance`, and at least 11 USDC.
- Take-profit about 8% past the mark, stop about 4% the other way. Long is `--side buy`. Short is `--side sell`. Use the direction they named, and repeat that word before the first order. If they did not say a direction, use long and say so. Never open the opposite side.
- Each run: if that position is already open, do nothing. If not, send that one order. Never add a second position, and never raise the cap.
- Shared balance stays where it is. The API wallet address receives nothing.

Then one question only:

"Cross margin, 3x, a market order, take-profit about 8 percent, stop about 4 percent. If that position is already open, I will not add. Do you want a different leverage, or shall we use this?"

A number from 1 to 20 replaces only the leverage. Any other change replaces only that one piece. When they accept, save the routine from the routine skill. Repeat the finished plan in plain language before the first live run.
