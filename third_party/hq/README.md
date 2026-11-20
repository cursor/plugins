# HQ

Cursor plugin that connects agents to [HQ](https://hqforwork.com) by Indigo through HQ's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server (HQ MCP).

Read a company's knowledge, projects, policies, and files; capture notes, journal entries, and knowledge back into HQ; browse and create shared skills; inspect secret names and schemas; message teammates and bots; dispatch work to Team Agents; and call HQ-governed integrations, all with the access of the signed-in HQ identity.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HQ**.
3. Click **Install**, then complete the HQ sign-in prompt and authorize access.

Or run `/add-plugin hq` in chat.

## MCP

```json
{
  "mcpServers": {
    "hq": {
      "type": "http",
      "url": "https://hq-mcp.getindigo.ai/mcp"
    }
  }
}
```

Auth is OAuth 2.0 with PKCE (S256) and Dynamic Client Registration against `hq-mcp.getindigo.ai`, with the `openid`, `email`, `profile`, and `hq-mcp/use` scopes. Cursor registers itself and opens HQ's **Connect Cursor to HQ** page when the plugin connects, so there is no API key or client ID to configure. Sign in with Google or a personal Microsoft account; if you do not have an HQ account yet, this step creates one.

On the connect page you choose how Cursor acts:

- **As you**: Cursor acts with your access, and messages it sends come from you.
- **As its own agent**: Cursor gets its own HQ identity and inbox. This needs a company where you are an owner or admin; you pick the companies after signing in.

HQ's docs also list `https://hq-mcp.hq.computer/mcp`; it is the same server and either URL works.

## What agents can do

| Area | Tools |
| --- | --- |
| Identity & grounding | `hq_whoami`, `hq_companies_list`, `hq_company_ping`, `hq_context_grounding`, `hq_content_get` |
| Knowledge | `hq_knowledge_list`, `hq_knowledge_get`, `hq_knowledge_find`, `hq_knowledge_map`, `hq_knowledge_capture`, `hq_knowledge_file` |
| Projects & policies | `hq_projects_list`, `hq_project_get`, `hq_project_status`, `hq_project_journal_append`, `hq_policies_list`, `hq_policy_get` |
| Files | `hq_files_list`, `hq_files_read`, `hq_files_stat`, `hq_files_create`, `hq_files_update`, `hq_files_write`, `hq_files_delete`, `hq_files_restore`, `hq_files_share` |
| Personal vault | `hq_personal_capture`, `hq_personal_files_list`, `hq_personal_files_read` |
| Library | `hq_library_search`, `hq_library_get`, `hq_library_link`, `hq_library_add` |
| Skills | `hq_skill_list`, `hq_skill_get`, `hq_skill_create`, `hq_skill_update`, `hq_skill_set_state`, `hq_skill_tags_set`, `hq_skill_access_get`, `hq_skill_access_set`, `hq_skill_access_grant`, `hq_skill_access_revoke`, `hq_skill_improvements_list`, `hq_skill_improvement_post`, `hq_skill_improvement_resolve`, `hq_skill_improvement_withdraw` |
| Secrets | `hq_secrets_list`, `hq_secrets_schema`, `hq_secrets_generate_link` |
| Integrations | `hq_integrations_catalog`, `hq_integrations_discover`, `hq_integrations_connect`, `hq_integrations_status`, `hq_integrations_list`, `hq_integrations_read`, `hq_integrations_call` |
| Messages | `hq_messages_contacts`, `hq_messages_inbox`, `hq_messages_thread`, `hq_messages_send`, `hq_messages_channels`, `hq_messages_channel_read`, `hq_messages_channel_send` |
| Team Agents & Work Mesh | `hq_agents_list`, `hq_agent_run`, `hq_agent_result`, `hq_work_mesh_list`, `hq_work_mesh_get`, `hq_work_mesh_unclaimed`, `hq_agent_wake_webhook_set`, `hq_agent_wake_webhook_status`, `hq_agent_wake_webhook_clear` |
| Deploy & feedback | `hq_deploy_site`, `hq_feedback` |
| Diagnostics | `hq_ping`, `hq_version`, `hq_exec_check`, plus the standard MCP `search` and `fetch` pair |

The hosted server is the source of truth for tool names and schemas. HQ publishes the tool groups at https://docs.hq.computer/hq-in-chat/ and suggests calling `hq_context_grounding` once before other tools.

## Notes

- HQ MCP is in beta; Indigo says tool names and permissions may change. Review write actions before approving them.
- Every request is checked against the signed-in identity's company memberships and the vault file ACL for the exact path. Reads exclude private prefixes such as `settings/`, `secrets/`, and `workers/`, and writes under them are always refused.
- `hq_files_update` and `hq_files_delete` require the current ETag from `hq_files_stat`, and delete and restore require `confirm: true`. Delete is recoverable and never recursive.
- `hq_files_share` and `hq_secrets_generate_link` mint bearer links. Treat them as secrets and share them only with the intended recipient.
- `hq_messages_send` and `hq_messages_channel_send` deliver to real people and bots immediately, as you or as the agent identity you chose at sign-in.
- `hq_integrations_call` runs tools on connected systems (CRM, analytics, email, and others) through HQ's permission boundaries; credential values never pass through the model.
- Secret values are never returned. `hq_secrets_generate_link` produces a link a human uses to supply one.
- Remove the connection any time from HQ, or by disconnecting the plugin in Cursor.

## Docs

- HQ MCP: https://docs.hq.computer/hq-in-chat/
- HQ product page for MCP: https://hqforwork.com/products/mcp
- HQ docs: https://docs.hq.computer
- Server URL: https://hq-mcp.getindigo.ai/mcp

Logo is the HQ mark, the 512×512 app icon published on hqforwork.com.

## License

MIT
