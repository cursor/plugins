# SharePoint

Cursor plugin that connects agents to [Microsoft SharePoint](https://www.microsoft.com/microsoft-365/sharepoint/collaboration) through Microsoft's official [Agent 365 Work IQ SharePoint MCP server](https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/sharepoint) (`mcp_SharePointRemoteServer`, preview).

Find SharePoint sites, browse document libraries and folders, read and create files, share files and folders, and create, read, update, and delete lists, columns, and list items in the signed-in user's Microsoft 365 tenant.

> **Preview.** The Agent 365 MCP servers are a Microsoft preview feature. Tool names and behavior can change, and Microsoft does not recommend them for production workloads yet.

## SharePoint vs. OneDrive

The [OneDrive plugin](../onedrive/) reaches the signed-in user's **personal OneDrive** through Cursor's hosted `rest-mcp` proxy. It is the right choice for "my files": documents in the user's own drive, with sign-in handled entirely by Cursor and nothing to configure.

It cannot see the rest of the tenant. **SharePoint sites, team and communication site document libraries, and SharePoint lists** are not part of a user's OneDrive, so an agent using only the OneDrive plugin has no way to open a project site's Shared Documents library, search across sites, or read a list of tracked items.

This plugin fills that gap by pointing Cursor directly at Microsoft's tenant-scoped SharePoint server:

| | OneDrive plugin | SharePoint plugin |
|:--|:--|:--|
| Server | Cursor-hosted proxy (`api.cursor.com/rest-mcp/onedrive`) | Microsoft-hosted Agent 365 server (`agent365.svc.cloud.microsoft`) |
| Scope | The signed-in user's personal drive | Any site, library, or list the user can access in the tenant |
| Sites and subsites | No | Find, resolve by path, list subsites |
| Document libraries | Personal drive only | Every library on a site, including the default library |
| Files and folders | Browse, search, read | Browse, search, read, create, rename, move, copy, delete, share (files ≤ 5 MB) |
| SharePoint lists, columns, items | No | Full create, read, update, delete |
| Sharing and labels | No | Sharing invitations for files, folders, and lists; sensitivity labels |
| Setup | Install and sign in | Tenant admin registers an Entra app and grants the SharePoint MCP permission; requires Microsoft 365 Copilot licensing |

Install both if you want personal files and team sites covered. Use OneDrive alone if you only need the user's own drive and want zero admin setup.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **SharePoint**.
3. Click **Install**, then set the tenant ID and client ID (below) and complete the Microsoft sign-in prompt.

Or run `/add-plugin sharepoint` in chat.

## MCP

```json
{
  "mcpServers": {
    "sharepoint": {
      "type": "http",
      "url": "https://agent365.svc.cloud.microsoft/agents/tenants/${TENANT_ID}/servers/mcp_SharePointRemoteServer",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}"
      }
    }
  }
}
```

Auth is OAuth 2.0 against Microsoft Entra ID as a public client (PKCE, no client secret). Cursor prompts for Microsoft sign-in when the plugin connects, and every tool call runs on behalf of that user with their own SharePoint permissions.

## Setup

Microsoft's Agent 365 MCP servers are tenant-scoped and do not support dynamic client registration, so a Microsoft Entra administrator has to register Cursor as an application once. Follow Microsoft's [Set up Work IQ MCP servers for coding agents](https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview#set-up-work-iq-mcp-servers-for-coding-agents) guide, using the values below.

### Prerequisites

- A Microsoft 365 tenant with **Microsoft 365 Copilot** licensing. Work IQ MCP servers require it.
- A Microsoft Entra account that can register applications, or an admin who can do it for you.
- The SharePoint MCP server allowed in **Microsoft 365 admin center → Agents and Tools** (it is allowed unless an admin has blocked it).

### 1. Register a public-client app in Microsoft Entra

1. In the [Microsoft Entra admin center](https://entra.microsoft.com), open **App registrations → New registration** and create an app (any name, single-tenant is fine).
2. On **Overview**, copy the **Directory (tenant) ID** and **Application (client) ID**.
3. Under **Authentication → Add a platform → Mobile and desktop applications**, add Cursor's redirect URIs:

   | Surface | Redirect URI |
   |:--------|:-------------|
   | Desktop | `http://localhost:8787/callback` |
   | Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |
   | Older desktop builds | `cursor://anysphere.cursor-mcp/oauth/callback` |

4. Under **API permissions → Add a permission → APIs my organization uses**, search for the Work IQ / Agent 365 MCP servers and add the **SharePoint** MCP server delegated permission (Microsoft's guide shows the same step for `WorkIQ-MailServer`; pick the SharePoint equivalent). Grant admin consent if your tenant requires it.

Do not create a client secret. Cursor authenticates with PKCE as a public client, and the plugin never asks for one.

### 2. Configure the plugin

In **Dashboard → Plugins → Configure**, set **Microsoft Entra tenant ID** and **Microsoft Entra application (client) ID** to the two values from the Overview page, then complete the Microsoft sign-in when Cursor prompts.

On a team marketplace an admin sets both values once. Each member still signs in individually, so tools run with that member's own site, library, and list permissions.

## Tools

Microsoft groups the server's tools as follows. See the [reference page](https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/sharepoint) for parameters.

| Area | Tools |
|:-----|:------|
| Sites | `findSite`, `getSiteByPath`, `listSubsites` |
| Document libraries | `listDocumentLibrariesInSite`, `getDefaultDocumentLibraryInSite` |
| Files and folders | `getFolderChildren`, `findFileOrFolder`, `getFileOrFolderMetadata`, `getFileOrFolderMetadataByUrl`, `readSmallTextFile`, `readSmallBinaryFile`, `createSmallTextFile`, `createSmallBinaryFile`, `createFolder`, `renameFileOrFolder`, `moveFileOrFolder`, `copyFileOrFolder`, `deleteFileOrFolder`, `uploadFileFromUrl`, `checkOperationStatus` |
| Lists | `listLists`, `createList`, `deleteList` |
| Columns | `listColumns`, `createColumn`, `updateColumn`, `deleteColumn` |
| List items | `listListItems`, `getListItem`, `createListItem`, `updateListItem`, `deleteListItem` |
| Sharing and labels | `shareFileOrFolder`, `sendInviteForList`, `setSensitivityLabelOnFile` |

File read, create, and move operations are limited to files of 5 MB or less. Cross-library move and copy are asynchronous; poll `checkOperationStatus` for the result.

## Troubleshooting

| Symptom | Cause |
|:--------|:------|
| Sign-in fails with `AADSTS650052` or "Access Denied" | The Work IQ MCP server service principals are not provisioned in the tenant. An admin can create them and grant consent with Microsoft's [`Enable-WorkIQToolsForTenant.ps1`](https://github.com/microsoft/work-iq/blob/main/ADMIN-INSTRUCTIONS.md). |
| Sign-in fails with a redirect URI mismatch | The app registration is missing the Cursor redirect URI for the surface you are using (see step 1). |
| Auth succeeds but tool calls are denied | The app has not been granted the SharePoint MCP permission, admin consent is missing, or an admin has blocked the server in the Microsoft 365 admin center. |
| Server returns 401/404 for the whole session | `TENANT_ID` does not match the tenant you signed in to, or the tenant lacks Microsoft 365 Copilot licensing. |
| File tool fails on a large file | The server rejects files over 5 MB. |

## Docs

- SharePoint MCP server reference (Agent 365, preview): https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/sharepoint
- Work IQ MCP overview and coding-agent setup: https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview
- SharePoint sites API (Microsoft Graph): https://learn.microsoft.com/en-us/graph/api/resources/sharepoint

Logo is a SharePoint-style mark drawn in Microsoft's SharePoint brand colors, placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT
