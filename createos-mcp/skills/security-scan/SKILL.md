---
name: security-scan
description: Run and review security scans on deployed applications
---

# Security Scan

## Trigger

User wants to check security, run a vulnerability scan, or review security results for a deployment.

## Workflow

1. Identify the target deployment: `ListDeployments` for the project.
2. Trigger a scan: `TriggerSecurityScan` on the deployment.
3. Wait and check results: `GetSecurityScan` to retrieve findings.
4. Download the full report if needed: `GetSecurityScanDownloadUri`.
5. If issues found, summarize findings and suggest fixes.

## Guardrails

- Always run scans after new deployments to production.
- Present findings clearly with severity levels.
- Do not auto-fix security issues — present recommendations and let the user decide.

## Output

- Scan status and summary of findings
- Severity breakdown (critical, high, medium, low)
- Recommended next steps
