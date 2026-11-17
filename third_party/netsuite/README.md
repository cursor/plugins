# NetSuite

Cursor plugin that connects agents to an [Oracle NetSuite](https://www.netsuite.com) account through the [NetSuite AI Connector Service](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_3200541651.html), NetSuite's own [Model Context Protocol](https://modelcontextprotocol.io/) server.

Agents query data with SuiteQL, run reports and saved searches, and create, update, transform, and act on records. Every call runs as the NetSuite user who signed in, under that user's role and permissions.

## Install

1. An administrator enables the required features and permissions and installs a tools SuiteApp (see [Account setup](#account-setup)).
2. A Cursor team admin opens **Cursor Settings → Plugins**, searches for **NetSuite**, installs it, and enters the account-specific server URL.
3. Each member signs in to NetSuite when Cursor prompts them, choosing a non-administrator role.

Or run `/add-plugin netsuite` in chat.

## MCP

```json
{
  "mcpServers": {
    "netsuite": {
      "type": "http",
      "url": "${NETSUITE_MCP_URL}"
    }
  }
}
```

The URL is unique to the account, so there is no default. NetSuite documents two forms:

| Form | Returns |
| --- | --- |
| `https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/all` | Every tool installed in the account, from SuiteApps and account customization projects |
| `https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/<applicationid>` | Only the tools one SuiteApp exposes. The MCP Standard Tools SuiteApp is `com.netsuite.mcpstandardtools` |

`<accountid>` is the account ID from **Setup → Company → Company Information**, in domain form: lowercase, with underscores replaced by hyphens, so `1234567_SB1` becomes `1234567-sb1`. Without the `/all` or `/suiteapp/<applicationid>` suffix the connection shows as disconnected.

Auth is OAuth 2.0 authorization code with PKCE and the `mcp` scope, which NetSuite only accepts on its own. There is no client ID or secret to enter: NetSuite supports dynamic client registration for this service, so Cursor registers itself when a member connects.

## Account setup

An administrator does this once per account.

### 1. Enable the features

Under **Setup → Company → Enable Features → SuiteCloud**, enable **Server SuiteScript** and **OAUTH 2.0**. The MCP Standard Tools SuiteApp also needs **REST Web Services**.

### 2. Install a tools SuiteApp

The service only exposes tools that exist in the account. For the standard set, open the **SuiteApps** tab, search for **MCP Standard Tools**, and install it. Otherwise, build custom tools.

### 3. Create a scoped role

Administrator roles and roles with full permissions are blocked from the service, so members need a dedicated role. Under **Setup → Users/Roles → Manage Roles**, add these on the **Permissions → Setup** subtab:

| Permission | Why |
| --- | --- |
| MCP Server Connection | Required to reach the service. Not **Log in using Access Tokens** |
| Log in using OAuth 2.0 Access Tokens | Required for the OAuth flow |
| REST Web Services | Needed by the record tools in MCP Standard Tools |

Grant only the record and task permissions the account wants reachable from an agent, then assign the role to each member under **Lists → Employees → Employees → Access → Roles**. The role also needs access to the SuiteApp's File Cabinet folder.

### 4. Check the integration record

Under **Setup → Integration → Manage Integrations**, confirm an integration record exists with **Public Client**, **Authorization Code Grant**, and the **NetSuite AI Connector Service** scope. A record created by a SuiteApp install starts pending and an administrator has to enable it; a record without that scope has to be recreated. If no record exists, create one.

For dynamic client registration, check **Dynamic Client Registration**, set **Client Name for Dynamic Client Registration** to `Cursor`, and add the callback URLs Cursor uses:

| Surface | Callback URL |
|:--------|:-------------|
| Desktop | `http://localhost:8787/callback` |
| Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |
| Older desktop builds | `cursor://anysphere.cursor-mcp/oauth/callback` |

Leave the token-based authentication, client credentials, and other OAuth 2.0 scope boxes cleared. The record's **AI Connector Service (MCP)** execution log lists every call, for 21 days in production and seven in sandbox.

## What agents can do

With the MCP Standard Tools SuiteApp installed:

| Category | Tools |
| --- | --- |
| SuiteQL | `ns_runCustomSuiteQL` (read-only), `ns_getSuiteQLMetadata` |
| Records | `ns_createRecord`, `ns_getRecord`, `ns_updateRecord`, `ns_transformRecord`, `ns_getRecordTypeMetadata`, `ns_getRecordTransformMetadata` |
| Record actions | `ns_getRecordActionMetadata`, `ns_executeRecordAction` |
| Reports | `ns_listAllReports`, `ns_runReport`, `ns_getAccountingBooks`, `ns_getAccountingContexts`, `ns_getSubsidiaries`, `ns_getNexusIds` |
| Saved searches | `ns_listSavedSearches`, `ns_runSavedSearch` |
| File Cabinet | `ns_searchFiles`, `ns_getFolderByPath`, `ns_getIdFromPath`, `ns_getPathFromId`, `ns_attachFile`, `ns_detachFile` |
| Runtime | `ns_getSessionInfo` |

It is a managed SuiteApp, so Oracle changes the tool set over time and the live server is the source of truth. A tool only appears when the signed-in role holds every permission that tool requires, and accounts with custom tools see those instead or as well.

## Notes

- The record tools write through REST Web Services. Any role carrying **MCP Server Connection** can create and update whatever its permissions already allow, so scope the role rather than relying on the tool list.
- Reads and writes obey NetSuite roles and permissions exactly as the UI does; the tools add no access of their own.
- Oracle has not assessed this service for HIPAA, so do not route ePHI through it.
- Administrators can disable the integration record or cap its share of the account's concurrency limit.
- Review Oracle's [associated risks, controls, and mitigation strategies](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_3200541651.html) before connecting an account.

## Troubleshooting

| Symptom | What to check |
|:--------|:--------------|
| Connection shows as disconnected | The URL is missing `/all` or `/suiteapp/<applicationid>`, or the account ID is not in domain form |
| Sign-in succeeds and no tools appear | No tools SuiteApp is installed, the role lacks the permissions those tools require, or the role cannot reach the SuiteApp's File Cabinet folder |
| Sign-in is refused | The chosen role is Administrator or has full permissions, or it is missing **MCP Server Connection** or **Log in using OAuth 2.0 Access Tokens** |
| Redirect URI error during sign-in | The integration record has no matching callback URL, or its DCR client name is not `Cursor` |
| Tools are visible and calls fail | The signed-in role lacks the record or action permission, or **REST Web Services** is off |

## Docs

- Get started: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_3200541651.html
- Required features and permissions: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0714080625.html
- Connect to the service and server URL formats: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0714082142.html
- MCP Standard Tools SuiteApp: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_143403258.html
- Available tools: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_0902023508.html

Logo is NetSuite's official mark, from the NetSuite iOS app icon published by Oracle America.

## License

MIT
