# MongoDB Plugin

Cursor plugin for MongoDB — schema design, queries, aggregation, indexes, and Mongoose ODM.

## Installation

```bash
agent install mongodb
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `setup-mongodb` | Connect Node.js/TypeScript to MongoDB with native driver and Mongoose, including Docker Compose setup |
| `design-schema` | Document schema design, embedding vs referencing, index strategies, and aggregation pipelines |

### MCP Server

Provides MongoDB access via `mongodb-mcp-server`.

Requires `MONGODB_URI` environment variable.

## License

MIT
