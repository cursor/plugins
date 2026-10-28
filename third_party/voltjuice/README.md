# VoltJuice

Skills and a safety rule for trading on [VoltJuice](https://voltjuice.xyz) with the open-source [VoltJuice agent](https://github.com/voltjuice-xyz/agent) CLI. The agent installs the CLI, connects one API wallet, and turns a plain-language idea into one order or a 24-hour strategy.

Published by VoltJuice.

> **Warning:** Practice (paper) mode is the default and sends nothing. After you run `voltjuice mode live --cap <USDC>`, orders are real and can use leverage up to 20x. Each live order stays at or under the cap you set. The API wallet key can place, edit, and cancel orders, but cannot withdraw or transfer funds. Not financial advice.

## Install

1. Install the **VoltJuice** plugin from the Cursor marketplace.
2. Install the CLI (Node 20 or later):

   ```bash
   git clone https://github.com/voltjuice-xyz/agent.git ~/voltjuice-agent
   cd ~/voltjuice-agent
   npm install
   npm link
   voltjuice doctor
   voltjuice markets
   ```

   If `voltjuice` is not on your `PATH`, use `node ~/voltjuice-agent/src/cli.mjs`.
3. Ask the agent to trade on VoltJuice. It runs `voltjuice next` after each step and asks only for what it needs: an API wallet created at https://app.voltjuice.xyz/API, its key in a secret named `VOLTJUICE_API_KEY` (never in the chat), your Master address, and a per-order cap of at least 11 USDC.

Switch back to practice at any time with `voltjuice mode paper`.

## MCP

This plugin ships no `mcp.json`. The source repository publishes skills and a rule only, and the CLI runs locally.

## Skills

- `voltjuice-start`: first-run path from install to the first order.
- `voltjuice-connect`: save the API wallet key and the Master address.
- `voltjuice-levels`: read, practice order, one confirmed live order, then a strategy.
- `voltjuice-intent`: turn a plain-language idea into one order or a 24-hour strategy.
- `voltjuice-trade`: place one order.
- `voltjuice-orders`: stop, take-profit, scale, TWAP, chase, and trailing-stop orders.
- `voltjuice-routine`: save a repeating strategy.
- `voltjuice-errors`: recover from a failed order without a duplicate or larger resend.
- `voltjuice-risk`: stay under the cap and close positions only when asked.

The `voltjuice-safety` rule applies to every VoltJuice task.

Logo is VoltJuice's own mark, from the source repository's `assets/logo.png`.

## License

MIT
