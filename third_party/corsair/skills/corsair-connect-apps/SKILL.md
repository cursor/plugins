---
name: corsair-connect-apps
description: Use when the user wants to use an app through Corsair that isn't connected yet, asks which apps are connected, or a Corsair call fails because an app isn't connected. Covers finding the app, handing the user the sign-in link from add_integrations, and confirming the connection.
---

# Connect an app through Corsair

Corsair can reach the user's apps (Gmail, Slack, GitHub, Linear and hundreds more). Most need the user to sign in first. Your part is to find the app, get the sign-in link, hand it over, and confirm it worked. You never sign in on the user's behalf.

## Steps

1. **See what's connected.** Call `list_integrations` with no arguments. Each app is in one of four states:
   - "connected and ready to use": use it.
   - "set up, but nobody has signed in to it yet": go to step 3.
   - "can be connected from here": go to step 3.
   - "needs setting up before it can be connected": see "When there's no link" below.
2. **Look up an app that isn't listed.** Call `list_integrations` with `search`, for example `{"search": "notion"}`. Use the `id` it returns in every later call. Don't guess ids: Google Calendar is `googlecalendar`.
3. **Get the link.** Call `add_integrations` with `{"integration": "<id>"}`.
4. **Hand over the link exactly as returned.** Give the user the `connect_url` (the result text repeats it), ask them to tell you when they've signed in, and stop.
5. **Confirm.** When the user says they're done, call `list_integrations` again. The app should read "connected and ready to use". Then do what they first asked for.

## Rules for the link

- Copy it character for character. Don't shorten it, rebuild it, or put it behind another URL.
- Never write a link yourself. If `add_integrations` returned no link, there is no link.
- Call `add_integrations` once per app. Each call mints a new sign-in session, so calling it again only produces more links. Get a new one only if the user says the link failed or expired (`expires_at` in the result).
- Don't open the link or try to finish the sign-in yourself.

## When it comes back ready

A few apps that Corsair provides directly come back with `connected: true` and no link. There is nothing to sign in to. Use the app right away.

## When there's no link

- **There's no `add_integrations` tool.** This connection can't add apps. Tell the user to connect the app in Corsair, or to allow this link to add apps, then confirm with `list_integrations`.
- **`connect_blocked_by` is set, or the result says the app "has no sign-in link yet".** Whoever manages this Corsair connection, or the Corsair project behind it, has to finish setting the app up first, for example by adding its OAuth credentials. Tell the user that, quote the reason, and stop.
- **"not permitted to authorize it. An admin has to connect it."** This connection can use apps but not connect new ones. Whoever manages the connection can connect the app in Corsair, or allow it to send connect links.

## When a call fails because an app isn't connected

`run_script` can fail with "<app> is not connected. Connect it here: <url>". Treat that URL the same way: hand it over, wait, confirm with `list_integrations`, then run the original call again. If it says "no connect link could be made" instead, tell the user the reason it gave and stop.

## Example

User: "Post the standup notes to Slack."

1. `list_integrations` returns "slack can be connected from here."
2. `add_integrations {"integration": "slack"}` returns a link.
3. Reply: "Slack isn't connected yet. Sign in here: <the link, exactly as returned>. Tell me when you're done and I'll post the notes."
4. The user confirms. `list_integrations` now says Slack is connected and ready to use. Post the notes.
