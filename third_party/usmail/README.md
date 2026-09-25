# USMail.ai for Cursor

Cursor plugin that connects the agent to [USMail.ai](https://www.usmail.ai) print-to-mail. The agent prepares a letter or postcard: upload, recipients, print options, and a proof. A human registers and funds the prepaid meter. USMail.ai prints the piece and hands it to USPS.

You upload. You approve. We produce.

The human approves on the app, or explicitly grants capped postage and then sends Looks good after the proof. The agent does not fund the meter, run card deposits, or do EDDM.

## What is included

| Piece | Role |
|---|---|
| `usmail` MCP server | Production only: `https://app.usmail.ai/mcp`. OAuth. No API key in this repo. |
| `usmail-mcp` skill | How to prepare a job, stop at the proof, surface address quality, and hand approval to the human. |
| `assets/logo.svg` | Repo-hosted mark for the plugin listing. |

Live agent instructions (version ea2e4f3a): [https://www.usmail.ai/skills.md](https://www.usmail.ai/skills.md).

Account, privacy, and terms: [usmail.ai](https://www.usmail.ai), [privacy](https://www.usmail.ai/privacy), [terms](https://www.usmail.ai/terms). MCP docs: [https://www.usmail.ai/docs/mcp](https://www.usmail.ai/docs/mcp).

## Install from the Cursor Marketplace

After USMail.ai is listed (listing is a separate, human review — this repo does not submit itself):

1. Open **Customize** in the Cursor sidebar.
2. Find **USMail.ai**.
3. Choose **Install**, then a user or project scope.
4. Connect the `usmail` server when Cursor asks. That is OAuth (**Connect / Authorize**). **Added** is not authorization. This plugin does not use an API key.

## Install locally

Cursor loads a plugin copied into `~/.cursor/plugins/local` ([Test plugins locally](https://cursor.com/docs/plugins)):

1. Copy this repo into `~/.cursor/plugins/local/usmail`. The folder must contain `.cursor-plugin/plugin.json`.
2. Copy the files in. A symlink that points at a checkout outside `~/.cursor/plugins/local` is skipped.
3. Restart Cursor, or run **Developer: Reload Window**.
4. Open **Customize** and confirm **USMail.ai**, the `usmail` MCP server, and the `usmail-mcp` skill.
5. Connect `usmail` with OAuth.

On Enterprise, local plugin imports are off until an admin turns on **Allow Local Plugin Imports** (Dashboard → Settings → Security & Identity → Marketplace and Plugins). If a marketplace plugin named `usmail` is already installed, that install wins over the local copy.

## Install for a team

Teams and Enterprise can import a Git repo as a team marketplace ([Add a team marketplace](https://cursor.com/docs/plugins)):

1. Open **Dashboard → Plugins & MCPs**.
2. Under **Team Marketplaces**, choose **Add Marketplace**.
3. Choose **Import from Repo** and paste `https://github.com/Postalocity/usmail-cursor-plugin`.
4. Add **USMail.ai** to that marketplace and set who can install it.
5. Each person installs it from **Customize** (unless an admin set it Default On or Required), then connects `usmail` with OAuth.

This repository is one plugin. It does not ship a multi-plugin `marketplace.json`.

## What the skill covers

`usmail-mcp` follows [the app skills](https://www.usmail.ai/skills.md):

- Prepare a document or CSV recipient list, one print option at a time.
- Ask about a postage spend grant early. It stays off unless the human turns it on.
- Generate a proof before any production handoff. `generate_proof` is not approval.
- Show address-quality results to the human. They fix, ignore, or still-mail on the app. The agent does not auto-fix addresses.
- If the mill returns `mill_error`, show that text as-is.
- Open job is `https://app.usmail.ai/?job={id}` with the job id the tools return. The proof link is that turn’s `proofUrl`.

## Human approval

1. The human creates the USMail.ai account and funds the meter on the app.
2. The agent prepares the job and shows a proof.
3. The human reviews the proof and the address-quality flags.
4. With no spend grant (the default), the human uses **Pay & Approve** on the app. That approval starts production.
5. A spend grant is optional and off until the human asks for one. The agent turns a grant on only when the human explicitly asks, at the cap they choose. It never deposits funds, and submits only after the human reviews the proof and replies Looks good.

## License

MIT. See [LICENSE](LICENSE).
