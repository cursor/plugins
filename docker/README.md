# Docker Plugin

Cursor plugin for Docker — Dockerfiles, Compose, multi-stage builds, and container best practices.

## Installation

```bash
agent install docker
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `containerize-app` | Language-specific Dockerfiles for Node.js, Python, Go, Java, and Rust with multi-stage builds |
| `setup-docker-compose` | Multi-service development environments with databases, caches, and queues |

### MCP Server

Provides Docker management via `mcp/docker` container image.

Requires Docker socket access.

## License

MIT
