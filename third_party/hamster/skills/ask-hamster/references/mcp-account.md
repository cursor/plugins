# Hamster MCP Account

Every Hamster MCP tool acts on the user's active MCP team, not on this repository's team. A user in more than one team who never picked one gets an arbitrary team, and tools like `get_task` or `ask_hamster` then report work that exists as not found.

Don't check the active team before switching: `list_accounts` doesn't say which team is active, and switching to the active team is harmless.

`.hamster/.state.json` names the user's Hamster CLI team as of the last `hamster sync` here. The switch has to return its `account_id` because a renamed team's old slug can now belong to another team. `hamster chat` is no fallback when it doesn't: it takes its team from the CLI's own settings, not this repository, so it can hit a different team.

The selection is saved per user, not per session or client, so switching here also changes the team the user's other Hamster MCP clients use until they switch again.
