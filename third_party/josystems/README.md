# Perps

Skills for running [Perps](https://github.com/BadmonLano/perps), an open-source Jupiter Perps (SOL-PERP, BTC-PERP, ETH-PERP) trading bot that an agent operates for a human owner. The bot writes one market packet per chain to `inbox/`. The agent reads them with these skills and answers with signal files. The bot checks its hard gates and executes or declines. It never opens a trade on its own.

Published by Bentayga Empire LLC.

> **Warning:** Paper mode (`PERPS_DRY_RUN=true`) is the default and simulates every fill. With `PERPS_DRY_RUN=false`, every signal becomes a real leveraged Jupiter Perps transaction. Leverage runs from 10x up to the owner's cap, `PERP_MAX_LEVERAGE` (20x by default, adjustable up to 250x). A small move against a position can liquidate its collateral. Not financial advice.

## Install

1. Install the **Perps** plugin from the Cursor marketplace.
2. Clone the bot and install its dependencies:

   ```bash
   git clone https://github.com/BadmonLano/perps.git
   cd perps
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cp bots/.env.example bots/.env
   ```

3. Leave `PERPS_DRY_RUN=true` in `bots/.env` for paper mode. No wallet or exchange keys are needed.
4. Open the `perps` folder in Cursor, follow the repository README quick start to run the self-check and start the bot, then ask the agent to "run Perps in paper mode".

## MCP

This plugin ships no `mcp.json`. The source repository publishes skills only, and the bot runs locally from the cloned repository.

## Skills

- `perps-boss`: core playbook for reading packets, sizing with the leverage ladder, writing signals, and managing open positions.
- `pnl-tracker`: realized and unrealized PnL, fees, and funding.
- `forensics`: autopsies of closed and missed trades. Proposes changes and never edits live params.
- `autoagent`, `code-monitor`, `learnings-summarizer`, `morning-brief`, `owner-ping`, `warden`: sub-skills for overseer reports, code drift, nightly learnings, the daily brief, owner notifications, and security alerts.

The skills expect the cloned repository's folders (`bots/`, `inbox/`, `json_relay/`, `bot_logs/`, `rules/`) in the workspace.

## Notes

- Use a burner hot wallet that holds only what you can afford to lose if you switch to live mode.
- Owner rules in `rules/rules.md` override skill defaults. The bot's hard gates still apply.

Logo is Perps' own mark, from the source repository's `assets/perps_logo.png`.

## License

MIT
