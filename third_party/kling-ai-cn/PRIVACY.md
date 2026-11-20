# Privacy

The plugin sends prompts, reference media, task identifiers, account queries,
and generation requests to the Kling AI China remote MCP at
`https://klingai.com/mcp/plugin` only when Cursor invokes its tools.

Cursor manages OAuth for the remote MCP connection. The packages do not request,
store, or log API keys, OAuth tokens, cookies, authorization headers, or local
credential files. They do not include a local MCP server or localhost monitor.

Kling AI's privacy policy and terms apply to data processed by the service.
