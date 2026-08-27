# Mida

**Test everything. Personalize everyone.**

Run A/B tests and personalizations on your own website, from Cursor.

[Mida](https://www.mida.so) is an A/B testing and personalization platform. A
small JavaScript tag on your site puts visitors into variants and reports
conversions. This plugin connects Cursor to your Mida account, so you can build
a test, launch it, read the result, conclude it, and roll the winner out while
you're still in the code the test is changing.

```
"What's running on the pricing page right now?"
"Create a test for a shorter signup form and preview variant B"
"Has the homepage hero test reached significance yet?"
"Conclude experiment #208, variant B won, we're shipping it"
```

## Setup

On first use, Cursor opens a browser to sign in to Mida with OAuth. There is no
API key to paste and nothing is written to your machine.

You need a [Mida account](https://www.mida.so) and the Mida tag installed on the
site you want to test. Ask for the install snippet once you're connected.

## What's included

**MCP server.** The hosted Mida MCP server, covering experiments (create,
launch, update, conclude, reopen), results and statistics, goals and custom
events, hypotheses, exclusion groups, personalization campaigns, project
configuration, and team access.

**Skills**

| Skill | Covers |
|---|---|
| `mida` | Entry point: picking the right project, reading Bayesian vs. frequentist results, and the order of operations for concluding a test and serving a winner |
| `mida-experiments` | The workflow: hypothesis, variants, goal, preview, launch, then calling the result |

The skills are here because a few Mida behaviours are easy to get wrong from the
tool schemas alone. An experiment's display number is not its API id. A
concluded test stops serving even while its status still reads active. Setting a
test's status clears a conclusion written before it. Each one is documented with
the correct sequence.

## Network and credentials

| | |
|---|---|
| **Endpoints called** | `https://mcp.mida.so/mcp`, the hosted Mida MCP server, and the only host this plugin contacts. It reaches Mida's API server-side. |
| **Credentials** | OAuth to your Mida account, handled by the MCP client. No API keys, no environment variables, no local credential files. |
| **Scope** | Your own Mida organizations and projects. The plugin reads and writes experiment configuration and reads result data for those projects. |
| **Local execution** | None. No hooks, no commands, no scripts. One remote MCP server plus Markdown skills. |

## About Mida

[Mida](https://www.mida.so) is A/B testing and personalization in one engine.
Testing answers which version works. Personalization answers who it works for.
Both run as real variants in a real test, so personalization is something you
can actually prove rather than take on faith.

- [Mida](https://www.mida.so), A/B testing on any site, with a tag that loads in about 20ms
- [Mida dashboard](https://app.mida.so) for results, goals, and rollouts
- [Public API docs](https://github.com/mida-so/api-docs)
- [Plugin source](https://github.com/mida-so/mida-plugin)

## License

MIT, see [LICENSE](LICENSE).
