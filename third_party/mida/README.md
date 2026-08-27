# Mida

Run A/B tests and personalizations on your own website, from Cursor.

[Mida](https://www.mida.so) is an A/B testing and experimentation platform. A
JavaScript tag on your site assigns visitors to variants and reports
conversions. This plugin connects Cursor to your Mida account so you can build a
test, launch it, read the result, conclude it, and roll the winner out — while
you're in the code that the test is changing.

```
"What's running on the pricing page right now?"
"Create a test for a shorter signup form and preview variant B"
"Has the homepage hero test reached significance yet?"
"Conclude experiment #208 — variant B won, we're shipping it"
```

## Setup

On first use, Cursor opens a browser to sign in to Mida with OAuth. There is no
API key to paste and nothing is written to your machine.

You need a Mida account and the Mida tag installed on the site you want to test.
Sign up at [mida.so](https://www.mida.so); ask for the install snippet once
you're connected.

## What's included

**MCP server** — the hosted Mida MCP server, covering experiments (create,
launch, update, conclude, reopen), results and statistics, goals and custom
events, hypotheses, exclusion groups, personalization campaigns, project
configuration, and team access.

**Skills**

| Skill | Covers |
|---|---|
| `mida` | Entry point: project selection, reading Bayesian vs. frequentist results, the order of operations for concluding a test and serving a winner |
| `mida-experiments` | The workflow: hypothesis → variants → goal → preview → launch → call it |

The skills exist because several Mida behaviours are easy to get wrong from the
tool schemas alone — an experiment's display number is not its API id, a
concluded test stops serving even while its status reads active, and setting a
test's status clears a conclusion written before it. Each is documented with the
correct sequence.

## Network and credentials

| | |
|---|---|
| **Endpoints called** | `https://mcp.mida.so/mcp` — the hosted Mida MCP server, and the only host this plugin contacts. It talks to Mida's API server-side. |
| **Credentials** | OAuth to your Mida account, handled by the MCP client. No API keys, no environment variables, no local credential files. |
| **Scope** | Your own Mida organizations and projects. The plugin reads and writes experiment configuration and reads result data for those projects. |
| **Local execution** | None. No hooks, no commands, no scripts — one remote MCP server plus Markdown skills. |

## Links

- Product: [mida.so](https://www.mida.so)
- Dashboard: [app.mida.so](https://app.mida.so)
- API docs: [github.com/mida-so/api-docs](https://github.com/mida-so/api-docs)
- Plugin source: [github.com/mida-so/mida-grok-plugin](https://github.com/mida-so/mida-grok-plugin)

## License

MIT — see [LICENSE](LICENSE).
