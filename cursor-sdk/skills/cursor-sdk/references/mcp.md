# MCP Servers

MCP (Model Context Protocol) servers give the agent extra tools. The SDK supports them on both local and cloud runtimes, but the transport semantics and credential-handling rules differ, and getting them wrong is usually silent ("why doesn't the agent have my Linear tools?").

## Two transports, three deployment shapes

```typescript
type McpServerConfig =
  | { type?: "stdio"; command: string; args?: string[]; env?: Record<string,string>; cwd?: string }
  | { type?: "http" | "sse"; url: string; headers?: Record<string,string>; auth?: { CLIENT_ID: string; CLIENT_SECRET?: string; scopes?: string[] } };
```

Three patterns you'll actually use:

1. **Local stdio** — spawn a subprocess on the caller's machine. Default for most `@modelcontextprotocol/server-*` packages.
2. **Local HTTP / remote HTTP** — a URL the SDK (local) or the backend (cloud) calls on behalf of the agent.
3. **Cloud stdio** — subprocess spawned **inside the cloud VM**, not on the caller's machine.

The shape looks similar in both runtimes; what changes is the execution location. One concrete delta worth knowing: cloud stdio servers reject `cwd` — the VM controls the working directory, and `cloud-mcp-utils.ts` throws `ConfigurationError("Cloud MCP server cannot include cwd.")` if you try to set it. Omit `cwd` for cloud stdio.

## Local Runtime — MCP Config

```typescript
const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
  mcpServers: {
    filesystem: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()],
      cwd: process.cwd(),
      env: { NODE_OPTIONS: "--max-old-space-size=4096" },
    },
    docs: {
      type: "http",
      url: "https://example.com/mcp",
      headers: { Authorization: `Bearer ${process.env.DOCS_TOKEN!}` },
    },
  },
});
```

- Stdio servers run as child processes of your Node process. Make sure `command` is on PATH or use an absolute path. Dispose the agent cleanly to reap these.
- HTTP servers are called directly from the local SDK. `headers` go on every request.
- `auth: { CLIENT_ID, CLIENT_SECRET?, scopes? }` triggers OAuth flow — for first-party integrations that issue proper OAuth tokens. Most self-managed MCP servers just need `headers`.

## Cloud Runtime — MCP Config

```typescript
const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  cloud: {
    repos: [{ url: "https://github.com/your-org/your-repo", startingRef: "main" }],
  },
  mcpServers: {
    linear: {
      type: "http",
      url: "https://mcp.linear.app/sse",
      headers: { Authorization: `Bearer ${process.env.LINEAR_API_KEY!}` },
    },
    github: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN! },
    },
  },
});
```

Critical differences from local:

- **HTTP `headers` and `auth` are proxied by the Cursor backend.** Sensitive header values are redacted server-side and do not reach the cloud VM. Safe place for OAuth tokens, API keys, etc.
- **Stdio `env` values are injected into the cloud VM.** Treat them like any production secret — they will be visible to processes running inside the VM. Don't ship end-user credentials this way.
- **`command`/`args` must resolve inside the cloud VM**, which has a standard Linux image. `npx`, `node`, and common binaries work; expect other tools to require a `command` that resolves in the VM or a container-provided binary.

Dashboard-configured MCP servers are also respected on cloud. Users configure them once at [https://cursor.com/agents](https://cursor.com/agents); inline config on `Agent.create` stacks on top.

## Persistence Across `Agent.resume(...)`

**Inline `mcpServers` are not persisted.** If you resume an agent and expect the same MCP tool access, pass the config again:

```typescript
const baseMcp = { /* ... */ };
const agent = Agent.resume(agentId, {
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
  mcpServers: baseMcp,
});
```

Dashboard-configured servers do persist (they're keyed to the user, not the agent), so the common mistake is ceding convenience to inline config and then wondering why resume loses it.

## Settings-sourced MCP servers

By default, local SDK agents do **not** load ambient user/team/project MCP config. Opt in via `settingSources`:

```typescript
const agent = Agent.create({
  apiKey,
  model: { id: "composer-2" },
  local: {
    cwd: process.cwd(),
    settingSources: ["project", "user"], // or "all"
  },
});
```

`settingSources` lives **inside `local`** — putting it at the top level will fail TypeScript and silently no-op in JavaScript. It has no effect on cloud agents; cloud always honors `project` / `team` / `plugins`.

Valid sources: `"project"`, `"user"`, `"team"`, `"mdm"`, `"plugins"`, or `"all"` to include everything. Use the narrowest set that gives you what you need; `"all"` can pull in team policies and plugins that surprise production code.

Inline `mcpServers` always win: they're explicit input, not ambient configuration. You can combine.

## Choosing Between HTTP and stdio

For a remote service (Linear, GitHub, Jira, Figma, your own internal tool):

- **Prefer HTTP** when the service has a stable MCP endpoint. Cursor's backend handles auth proxying on cloud; you don't have to ship secrets into the VM.
- **Use stdio** when your integration is a local-first helper (filesystem, a CLI, a development tool) or when you need process-level isolation. On cloud, stdio servers run inside the Cursor VM — fine for stateless helpers, dangerous for anything that holds long-lived credentials.

For first-party MCP servers that support OAuth, use `auth: { CLIENT_ID, CLIENT_SECRET?, scopes? }` instead of hardcoding `Authorization` headers.

## Reloading MCP after file changes

If you change `.cursor/mcp.json` or other setting sources on local disk while an agent is running and want the agent to pick it up without recreating:

```typescript
await agent.reload();
```

This only affects future `send()` calls; in-flight runs use the config they started with.

## Debugging MCP failures

MCP setup problems tend to show up as "the agent doesn't have the tool" rather than a thrown error. Checklist:

1. **Did the server actually register?** Watch the `system` event at stream start — it sometimes includes the tool catalog. If not, the server isn't wired up.
2. **Stdio on cloud** — is the `command` available in the cloud VM image? `npx` is. Your custom `/usr/local/bin/…` isn't.
3. **HTTP headers missing?** On cloud, sensitive headers are redacted but still forwarded; missing headers mean the SDK config didn't include them. Double-check the spelling (`Authorization`, not `authorization` in some servers).
4. **Resume without re-passing MCP?** You lost the inline servers. Re-pass them on the resume options.
5. **`settingSources` not set?** The agent isn't loading your project's `.cursor/mcp.json`. Add `"project"`.

## Copy-paste starters

### Local filesystem helper

```typescript
mcpServers: {
  filesystem: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()],
  },
},
```

### Cloud + Linear (HTTP, cloud-proxied auth)

```typescript
mcpServers: {
  linear: {
    type: "http",
    url: "https://mcp.linear.app/sse",
    headers: { Authorization: `Bearer ${process.env.LINEAR_API_KEY!}` },
  },
},
```

### Cloud + GitHub (stdio, secret injected into the VM)

```typescript
mcpServers: {
  github: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN! },
  },
},
```

### Cursor dashboard-configured server (no inline config needed)

Users with a dashboard-configured server get it for free as long as the cloud agent is allowed to use team MCP. No inline config required; stack it only if you also want an additional server.