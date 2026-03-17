---
name: manage-environments
description: Create and configure staging, production, and custom environments with variables and resources
---

# Manage Environments

## Trigger

User wants to set up staging, production, or custom environments, configure environment variables, or adjust resource limits.

## Workflow

1. List current environments: `ListProjectEnvironments` for the target project.
2. Create a new environment if needed: `CreateProjectEnvironment` with name, branch, and resource allocation.
3. Configure environment variables: `UpdateProjectEnvironmentEnvironmentVariables` with key-value pairs.
4. Adjust resources: `UpdateProjectEnvironmentResources` (CPU: 200-500 millicores, Memory: 500-1024 MB, Replicas: 1-3).
5. Assign a deployment: `AssignDeploymentToProjectEnvironment` to route traffic.
6. Check logs: `GetProjectEnvironmentLogs` to verify the environment is healthy.

## Guardrails

- Keep production and staging environments separate with distinct variables.
- Never copy production secrets to staging without user confirmation.
- Resource limits: CPU min 200m / max 500m, Memory min 500MB / max 1024MB, Replicas min 1 / max 3.

## Output

- Environment ID and configuration summary
- Resource allocation details
- Environment variable list (names only, not values)
