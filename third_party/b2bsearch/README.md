# b2bsearch

<img src="assets/logo.png" width="64" height="64" alt="b2bsearch logo">

B2B people and company data as agent tools, backed by the [b2bsearch Actors on Apify](https://apify.com/b2bsearch). Count a segment for free, then pull people with live emails, decision makers by website domain, company lists with funding, work emails by name and domain, and job postings as hiring signals.

Source: [ilyaviache/b2bsearch-plugin](https://github.com/ilyaviache/b2bsearch-plugin).

## Tools

| Tool | What it does |
|---|---|
| `people-database-search` | People by title, seniority, employer, size, industry, past employer, tenure; free counts and market breakdowns |
| `b2b-leads-finder` | People with a live email on every row |
| `company-database-search` | Companies by country, industry, HQ, founding year, headcount, last funding round |
| `domain-to-decision-makers` | Founders, C-level, VPs, and directors at a domain, with their emails |
| `work-email-finder` | A work address from a name and a domain, with deliverability evidence |
| `linkedin-job-search-api` | Job postings as hiring signals; free preview with breakdowns |
| `call-actor` | Other b2bsearch Actors by id |

## Skills

- `prospecting-playbook`
- `people-search`
- `leads-with-emails`
- `decision-makers-and-emails`
- `company-lists`
- `jobs-and-hiring-signals`

## Install

1. Install the **b2bsearch** plugin from the Cursor marketplace, or copy this folder to `~/.cursor/plugins/local/b2bsearch` and reload the window.
2. Connect the `b2bsearch` MCP server when Cursor asks. The Apify OAuth sign-in opens in the browser; a free Apify account is enough.

The plugin registers this MCP server:

```json
{
  "mcpServers": {
    "b2bsearch": {
      "type": "http",
      "url": "https://mcp.apify.com/?tools=call-actor,fetch-actor-details,b2bsearch/people-database-search,b2bsearch/b2b-leads-finder,b2bsearch/company-database-search,b2bsearch/domain-to-decision-makers,b2bsearch/work-email-finder,b2bsearch/linkedin-job-search-api&client=b2bsearch-plugin"
    }
  }
}
```

## Pricing

Pay per row delivered through your Apify account. Counts and previews are free, and the free Apify plan includes 500 rows a month.

## Try it

- "How many heads of sales work at Dutch companies with 50 to 500 employees?" (free count)
- "Who runs marketing at linear.app?"
- "How many US SDR postings were there this week?" (free preview)

## Terms

Apify [general terms](https://docs.apify.com/legal/general-terms-and-conditions) and [privacy policy](https://docs.apify.com/legal/privacy-policy) apply to the account you connect.

## License

MIT
