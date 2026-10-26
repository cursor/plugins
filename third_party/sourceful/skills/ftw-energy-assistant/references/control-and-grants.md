# Control and grant policy

This is a physical energy system, not a purely digital application. The FTW gateway is the safety authority. Model decisions cannot override it.

## Grant discovery

Call `homes_list` before writing. Capture the home's granted operation list (`ops`), scopes, caps (`holdS`, `maxW`, `perMin`) and expiry. Do not confuse a tool being visible with the home owner having granted it. Current grants can be read-only.

If the user asks for full control, accurately describe the requested capability and the FTW owner-side approval that is still required. The skill itself cannot elevate privileges, change MCP OAuth scopes or approve physical commands.

## Short-lived actions

Use `chargers_list` to resolve a current exact charger `loadpoint` ID, not a guessed label. Inspect whether plugged in, charging and under an owner hold. `ev_charge_now` can set a bounded fixed-W charge for a short interval and may enforce lower box caps than the tool's absolute maximum. The home-specific `holdS` and `maxW` are decisive. Never choose a higher power than the charger/site ratings or granted maximum. Use `stop: true` only for this agent's own hold, not an owner hold.

Read the action result; separate requested, accepted, active and ended where the tool exposes them. `requestedHoldSeconds` is the requested charging interval. `leaseExpiresInSeconds` is a command lease and does not establish the hold duration or measured power. A stop result has no requested hold duration. Do not repeat writes on ambiguous errors.

## Long-lived changes

Use `goal_request` when a user asks to change energy operating mode, the battery export planning policy, surplus-only EV charging or car SoC correction. Resolve allowed mode keys from `status` and charger IDs from `chargers_list` first. Supply a concise, human-readable `why` in the user's own language. Explain that approval in FTW is required; a submission is not execution. Follow with `requests_list` to confirm the lifecycle.

For planning fields, do not make up battery export legality or permitted feed-in. 'unknown' is different from 'allowed'. Do not select new default safety factors without the user telling you what behavior they want.

## Out-of-scope operations

No direct register writes, bypassed overload/fuse limits, firmware updates, arbitrary API calls, or token extraction. Reading secrets, exporting sensitive diagnostics or copying logs should be purpose-limited and minimized.

If a request cannot be executed with the installed tool and grant, report exactly what is missing, and offer a read-only diagnosis or an owner-side authorization step. Never imply control was exercised if it was not.

## Car schedules and setup

`car_goal_request` uses exactly one current opaque car or charger ID. Confirm the box time zone, local departure time, target and weekday mask before requesting a schedule. A new schedule replaces the prior one and still needs owner approval.

Setup tools use `ftw.setup.write` and diagnostic access; use the Setup Guide. Draft edits, validation, saving and restart are separate steps. A successful save does not prove fresh measurements or safe hardware control.
