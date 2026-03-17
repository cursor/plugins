---
name: deploy
description: Deploy applications to CreateOS from GitHub repos, Docker images, or file uploads
---

# Deploy

## Trigger

User wants to deploy, host, ship, launch, or put an application online.

## Workflow

1. Check existing projects: `ListProjects` to avoid duplicates.
2. Determine deployment type:
   - **GitHub repo** — use `ListConnectedGithubAccounts`, then `ListGithubRepositories` to find the repo. Create a VCS project with `CreateProject` (type: "vcs").
   - **Docker image** — create an image project with `CreateProject` (type: "image"), then `CreateDeployment` with the image reference.
   - **File upload** — create an upload project with `CreateProject` (type: "upload"), then use `UploadDeploymentFiles` or `UploadDeploymentBase64Files`.
3. Create an environment if none exists: `CreateProjectEnvironment` with resource limits (CPU: 200-500m, Memory: 500-1024MB, Replicas: 1-3).
4. Set environment variables: `UpdateProjectEnvironmentEnvironmentVariables` for secrets and config.
5. Deploy: `CreateDeployment` or `TriggerLatestDeployment`.
6. Monitor build: `GetBuildLogs` until status is "deployed" or "failed".
7. If failed, inspect logs and retry: `GetDeploymentLogs`, then `RetriggerDeployment`.
8. Add a custom domain if needed: `CreateDomain`, then `RefreshDomain` for TLS.

## Guardrails

- Always check for existing projects before creating new ones.
- Use environment variables for secrets — never hardcode credentials in source.
- Validate project names: 4-32 chars, alphanumeric with hyphens only.
- Confirm destructive operations (delete project/deployment) with the user first.

## Output

- Project ID and deployment URL
- Build status and any errors
- Environment configuration summary
