# AI Dev Jobs MCP

Specialized job board for AI/ML engineers. Search curated roles by skill, salary, workplace, and level.

## What it does

- **Job search**: Query 5,400+ curated AI/ML engineering roles from 280+ companies
- **Filtering**: Filter by tag (pytorch, llm, mlops), workplace (remote, hybrid, onsite), level (junior, mid, senior, lead), and salary range
- **Company listings**: Browse top AI/ML companies with role counts and average salaries
- **Candidate matching**: Rank active jobs against a candidate profile with scored results
- **Statistics**: Real-time index stats including total jobs, median salary, and new listings

## 5 MCP Tools

| Tool | Description |
|------|-------------|
| `search_jobs` | Search curated AI/ML roles by tag, workplace, level, salary, or keyword |
| `get_job` | Fetch a full job posting by ID or slug |
| `list_companies` | Top AI/ML companies hiring, with role counts and average salaries |
| `get_stats` | Current index statistics: total jobs, companies, median salary, new this week |
| `match_jobs` | Rank jobs against a candidate profile (skills, salary, workplace, level, location) |

## Installation

Install via the Cursor plugin marketplace:

```
/add-plugin aidevjobs-mcp
```

Or add the MCP server manually:

```bash
claude mcp add --transport http aidevjobs https://aidevboard.com/mcp
```

## No API key required

All tools are free to use with no authentication.

## Links

- Website: [aidevboard.com](https://aidevboard.com)
- GitHub: [github.com/unitedideas/aidevboard-mcp](https://github.com/unitedideas/aidevboard-mcp)
- MCP Registry: [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
