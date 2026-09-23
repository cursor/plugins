---
name: X Money guide
description: >-
  Read this before the first X Money action in a session and again on any
  X Money error, refusal, or missing capability. Covers the approval rule for
  every action that moves money (always ask, every time, no exceptions), how
  the connection works (connection code plus passkey in the X app), how to
  guide the user through connect, reconnect, and revoke at
  x.com/i/money/settings/connections, and what each failure message means.
---

# X Money guide

This plugin connects the agent to the user's X Money account through the **X Money MCP** at `https://mcp.money.x.com/mcp`. The user connects once in Grok Bot, and the agent then acts on their X Money account on their behalf.

Discover what the user can do from the server's tool list. The list is decided per account by X Money, so do not assume an action exists because it is mentioned here. Every result carries a `message` written for the user. Relay it in your own words instead of describing internals.

## Always confirm before moving money

Some actions move real money or create a way to spend it: sending money, requesting money, and paying a merchant. For each one:

1. **Ask first, every time.** Send a `SendToUser` widget with **Approve** and **Cancel**. The prompt is one sentence that states exactly what the user is approving: who gets paid or is asked, how much, and what for. For a purchase: the item, the merchant, and the total. Put the breakdown (items, shipping, tax, fees) in the help text. If the amount is an estimate, say so.
2. **Wait for the answer.** Call the tool only after the user picks Approve. If they pick Cancel, or do not answer, do nothing and say so.
3. **Approve one action at a time.** Never batch several payments under one approval. Never carry an approval over from an earlier message, an earlier session, or a general instruction such as "handle it".
4. **Re-ask when anything changes.** A different amount, recipient, merchant, or purpose is a new action and needs a new approval.
5. **Never fake it.** Every money-moving tool has an approval input. The server rejects the call when it is not set and confirms that nothing was done. Set it only after a real Approve in this conversation.

Ask for balances and transactions freely. Those are read-only.

## How the connection works

1. The user taps **Connect** on the X Money plugin in Grok Bot.
2. A page titled **Connect Grok Bot to X Money** opens. It shows a **connection code** and a QR code.
3. The user enters the code in the **X Money app** (or scans the QR code) on the X account that owns the X Money account, then approves with their **passkey**.
4. The page shows **Connected. You can return to Grok Bot.** and the connection completes on its own.

The code is valid for about 5 minutes. The connection then stays active until the user revokes it or stops using it for a long period. There is no client ID, API key, or token for the user to handle, and the agent never sees one.

## Connections screen

`https://x.com/i/money/settings/connections` — in the X app: **Money → Settings → Connections**.

Send the user here to:

- see which agents are connected to X Money and what each one can do,
- revoke Grok Bot's access,
- confirm that a connection they just approved is listed.

Revoking ends the connection at once. The next X Money action fails with an authorization error and the user must connect again.

## Troubleshooting

Match the situation, say the quoted line in your own voice, then give the one next step. Do not explain OAuth, tokens, or how the connection works internally.

### Not connected, or authorization error on a call

Signals: X Money shows as needing authorization, no X Money tools are listed, or a call fails with `401` or `invalid bearer token`.

> Your X Money connection is not active. Open the X Money plugin in Grok Bot and tap Connect, then enter the connection code in the X Money app and approve it with your passkey.

If the user says they did not revoke anything, still reconnect. There is no other way to restore a connection.

### "This code has expired. Start again from Grok Bot."

The consent page says this after about 5 minutes.

> The connection code expired. Tap Connect again in Grok Bot to get a new code, then approve it in the X Money app right away.

### "This connection was not approved."

The user declined in the X Money app.

> The connection was declined. If you still want to connect, tap Connect again in Grok Bot and approve the new code.

### "The connection code is invalid, expired, or already used."

The X Money app says this when the code was claimed on another account, was already used, or expired.

Ask which X account they are signed into in the X Money app. The code must be approved from the X account that holds the X Money account. Each code works once. Tell them to start again from Connect.

### Passkey step fails

The X Money app cannot complete the passkey challenge.

> Approving an agent connection needs a passkey on your X account. Set one up in X → Settings → Security, then approve the connection again.

### "New customer connections are not currently accepted."

The connection was approved but X Money did not activate it. This is a staged rollout, not an account problem.

> X Money is not accepting new agent connections for your account right now. Try again later.

Do not suggest workarounds.

### "Something went wrong. Refresh this page to try again." or "Something went wrong. Try again."

A transient error on the consent page.

> Refresh the page. If it fails again, tap Connect in Grok Bot to start over.

### "This X Money MCP tool isn't ready for you yet." or an action is missing

X Money enables actions per account. A missing tool, or this message on a call, means the action is not turned on for this user.

> That X Money action is not enabled for your account yet.

Offer the actions that are present. Do not tell the user to reinstall or reconnect.

### "Not authorized to call tool"

The user's role on the account does not allow this action, for example a member of a joint account.

> Your X Money account does not allow that action from here. You can do it in the X Money app.

### "MCP is not enabled"

X Money has paused agent access for everyone.

> X Money is temporarily unavailable to agents. Try again later.

### User has no X Money account

The consent page or the X Money app says the user cannot use X Money, or the user says they never set it up.

> X Money is available to eligible customers in the United States. Set up X Money in the X app first, then connect it here.

## Reading payment results

Every send or request returns an `outcome` and a `message`.

| Outcome | Meaning | What to do |
| --- | --- | --- |
| `completed` | The money moved, or the request reached the other person | Relay the message |
| `pending` | X Money is reviewing it, or the other person has to act | Relay the message. Do not send again. The user can watch it in the X Money app |
| `refused` | X Money did not make it | Relay the message. **Never retry a refusal** and never change the amount to get around it |

Common refusal messages and what to add:

| Message contains | Add |
| --- | --- |
| `verify this payment in the X Money app` | Agents cannot complete verification. The user can send it themselves in the X app. |
| `per-payment limit for agents` or `Agents can't move money for this account` | Agent payments have their own limits. The user can do this in the X Money app. |
| `sending limits` or `Too many transfers` | Try again later or pay in the X Money app. |
| `balance is too low` | Check the balance and offer a smaller amount, or adding funds in the X app. |
| `No X user named` | Confirm the @handle. Handles change; a numeric X user id is more stable. |
| `isn't on X Money yet` | The other person has to set up X Money before they can be paid or asked. |
| `own X account` | Pick another X user. |
| `only accepts money from people they follow` | Nothing to fix from here. |
| `different currencies` or `can't receive` or `can't send` | Nothing to fix from here. Pay in the X Money app. |
| `X Money did not allow this payment` | X Money blocked it and gives no further reason. Do not retry. |

Two results are not outcomes but errors, and both matter:

- **`X Money could not process this right now; try again later`** — a transient failure. Nothing moved. Tell the user. Retry once later only if they still want it, with a fresh approval.
- **`X Money accepted this payment but could not confirm it. Do not send it again`** — the payment may have gone through. **Never send it again.** Tell the user to check the transaction in the X Money app.

When you retry the very same payment after a network failure, reuse the same idempotency key so X Money never makes it twice. A reused key returns the earlier result and says so.

## Purchases with a card

- Approve the purchase itself: item, merchant, and total. The card X Money issues is not what the user approves.
- If the result says **no card was created** because a daily limit is reached, it names when limits reset. Tell the user and stop. Do not try again today.
- `failed to create card, try again` is transient. One retry is fine, with the same approval.
- Card details go straight into the merchant checkout. Never print the card number, CVC, or expiry in chat, and never store them.

## Never

- Never ask the user for an X Money password, passkey, card number, or bank login.
- Never ask the user to paste a token or code into chat.
- Never move money, request money, or create a card without a fresh approval for that exact action.
- Never retry a refusal, an unconfirmed payment, or a limit result.
- Never explain tokens or how the connection works internally. Name the situation and the next step.
