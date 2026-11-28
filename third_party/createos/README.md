# CreateOS

Cursor plugin that connects agents to [CreateOS](https://nodeops.network/createos), the NodeOps deployment platform, through NodeOps' official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create projects from GitHub repositories, Docker images, or uploaded files; deploy them; manage environments, variables, resources, and custom domains; read build and runtime logs; schedule cron jobs; run security scans; publish and buy project templates; and create and run commands in CreateOS sandboxes, all in the CreateOS account that owns the API key.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **CreateOS**.
3. Click **Install**, then set your CreateOS API key (below).

Or run `/add-plugin createos` in chat.

## MCP

```json
{
  "mcpServers": {
    "createos": {
      "type": "http",
      "url": "https://api-createos.nodeops.network/mcp",
      "headers": {
        "X-Api-Key": "${CREATEOS_API_KEY}"
      }
    }
  }
}
```

Auth is a CreateOS **API key** sent in an `X-Api-Key` header, the path NodeOps documents for Cursor. Sign in to [CreateOS](https://createos.nodeops.network), open **Profile Settings**, and copy or create a key in the **API Key** section ([video walkthrough](https://ik.imagekit.io/nodeops/No%20Sound/API%20Key%20Retrieval.mp4)). Set it in **Dashboard → Plugins → Configure**. Do not commit the key.

## What agents can do

| Area | Tools |
| --- | --- |
| Account | `GetCurrentUser`, `GetQuotas`, `GetSupportedProjectTypes` |
| Projects | `CreateProject`, `GetProject`, `ListProjects`, `UpdateProject`, `DeleteProject`, `UpdateProjectSettings`, `CheckProjectUniqueName` |
| Deployments | `CreateDeployment`, `GetDeployment`, `ListDeployments`, `CancelDeployment`, `DeleteDeployment`, `RetriggerDeployment`, `TriggerLatestDeployment`, `AssignDeploymentToProjectEnvironment`, `WakeupDeployment` |
| File uploads | `UploadDeploymentFiles`, `UploadDeploymentBase64Files`, `UploadDeploymentZip`, `DownloadDeployment` |
| Environments | `CreateProjectEnvironment`, `ListProjectEnvironments`, `UpdateProjectEnvironment`, `DeleteProjectEnvironment`, `UpdateProjectEnvironmentEnvironmentVariables`, `UpdateProjectEnvironmentResources`, `CheckProjectEnvironmentUniqueName` |
| Domains | `CreateDomain`, `ListDomains`, `DeleteDomain`, `RefreshDomain`, `UpdateDomainEnvironment` |
| Apps | `CreateApp`, `ListApps`, `UpdateApp`, `DeleteApp`, `AddProjectsToApp`, `RemoveProjectsFromApp`, `AddServicesToApp`, `RemoveServicesFromApp`, `ListProjectsByApp`, `ListServicesByApp` |
| Logs | `GetBuildLogs`, `GetDeploymentLogs`, `GetProjectEnvironmentLogs` |
| Security | `TriggerSecurityScan`, `RetriggerSecurityScan`, `GetSecurityScan`, `GetSecurityScanDownloadUri` |
| GitHub | `InstallGithubApp`, `ListConnectedGithubAccounts`, `ListGithubRepositories`, `ListGithubRepositoryBranches`, `GetGithubRepositoryContent` |
| Cron jobs | `CreateCronjob`, `GetCronjob`, `ListCronjobs`, `UpdateCronjob`, `SuspendCronjob`, `UnsuspendCronjob`, `DeleteCronjob`, `ListCronjobActivities` |
| Templates | `CreateProjectTemplate`, `GetProjectTemplate`, `ListPublishedProjectTemplates`, `ListMyProjectTemplates`, `BuyProjectTemplate`, `DeployProjectTemplateViaGithub`, `UpdateProjectTemplate`, `UpdateProjectTemplateStatus`, `DeleteProjectTemplate`, `DownloadProjectTemplate`, `ListProjectTemplateCounts`, `ListProjectTemplatePurchases`, `ListProjectTemplateRejections` |
| Transfers | `GetProjectTransferUri`, `TransferProject`, `ListProjectTransferHistory` |
| API keys | `CreateAPIKey`, `ListAPIKeys`, `UpdateAPIKey`, `RevokeAPIKey`, `CheckAPIKeyUniqueName` |
| Sandboxes | `CreateSandbox`, `ListSandboxes`, `GetSandbox`, `UpdateSandbox`, `ExecSandbox`, `DeleteSandbox` |
| Sandbox disks & networks | `CreateDisk`, `ListDisks`, `GetDisk`, `DeleteDisk`, `AttachSandboxDisk`, `DetachSandboxDisk`, `ListSandboxDisks`, `CreateNetwork`, `ListNetworks`, `GetNetwork`, `DeleteNetwork`, `AttachSandboxNetwork`, `DetachSandboxNetwork` |

The server listed 105 tools at the time of writing and is the source of truth for tool names and schemas. NodeOps publishes the tool reference at https://createos.sh/docs/API-MCP/MCP-Operations and the server source at https://github.com/NodeOps-app/createos-mcp.

## Notes

- You need a CreateOS account. Sign up at https://createos.nodeops.network. Tool calls run as the user who owns the API key and are subject to that account's plan quotas (`GetQuotas` reports them).
- The server also advertises OAuth 2.0 with dynamic client registration, but NodeOps' registration backend rejects Cursor's `cursor://anysphere.cursor-mcp/oauth/callback` redirect URI, so OAuth sign-in from Cursor fails with `Failed to create DCR client registration`. This plugin uses the API key path until NodeOps accepts that callback.
- The server can change and delete real resources: deleting a project removes it and everything under it, `UpdateProjectEnvironmentEnvironmentVariables` changes runtime configuration, and `ExecSandbox` runs commands inside a sandbox VM. Approve these deliberately.
- `BuyProjectTemplate` purchases from the Build-to-Earn marketplace and can spend money.
- `GetProjectTransferUri` mints a transfer token valid for 6 hours; anyone who redeems it with `TransferProject` takes ownership of the project. Treat the token as a secret.
- Deployment and environment tools return once CreateOS accepts the request; the agent then checks progress with `GetDeployment`, `GetBuildLogs`, or `GetDeploymentLogs`.
- Revoke access by revoking the API key in CreateOS (or with `RevokeAPIKey`), or by disconnecting the plugin in Cursor.

## Docs

- CreateOS MCP tool reference: https://createos.sh/docs/API-MCP/MCP-Operations
- CreateOS Cursor setup guide: https://github.com/NodeOps-app/createos-mcp/blob/main/Integrations/Integration-Cursor.md
- CreateOS integrations: https://createos.sh/docs/Integrations
- Server source: https://github.com/NodeOps-app/createos-mcp
- MCP server card: https://nodeops.network/.well-known/mcp/server-card.json
- Server URL: https://api-createos.nodeops.network/mcp

Logo is the NodeOps mark, the 512×512 app icon published on nodeops.network.

## License

MIT
