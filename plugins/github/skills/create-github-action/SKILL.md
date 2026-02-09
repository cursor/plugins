---
name: create-github-action
description: Step-by-step guide for creating composite and JavaScript GitHub Actions
---

# Skill: Create a Custom GitHub Action

## When to Use

Use this skill when the user wants to:

- Create a new custom GitHub Action (composite or JavaScript/TypeScript)
- Package reusable CI/CD logic as a shareable action
- Publish an action to the GitHub Marketplace
- Convert an existing script or workflow steps into a standalone action

## Prerequisites

- A GitHub repository to host the action
- Node.js 20+ (for JavaScript/TypeScript actions)
- Basic familiarity with GitHub Actions workflow syntax

## Decision: Composite vs. JavaScript Action

| Factor | Composite Action | JavaScript Action |
|--------|-----------------|-------------------|
| Complexity | Simple — shell scripts and existing actions | Complex — custom logic, API calls, rich output |
| Language | Any (runs shell commands) | JavaScript or TypeScript |
| Dependencies | None (uses runner tools) | Node.js runtime, `node_modules` bundled |
| Performance | Faster startup (no Node.js boot) | Slightly slower startup |
| Maintenance | Lower — no build step | Higher — requires bundling with ncc |
| Best for | Orchestrating existing actions/scripts | Custom logic, GitHub API integration, rich logging |

## Option A: Create a Composite Action

### Step 1 — Scaffold the action directory

Create the action at the repository root or in a subdirectory:

```
my-action/
├── action.yml        # Action metadata
├── scripts/
│   └── run.sh        # Implementation script(s)
└── README.md         # Usage documentation
```

### Step 2 — Define `action.yml`

```yaml
name: "My Custom Action"
description: "One-line description of what this action does"
author: "Your Name or Org"

branding:
  icon: "check-circle"
  color: "green"

inputs:
  target:
    description: "Deployment target environment"
    required: true
  version:
    description: "Version to deploy"
    required: false
    default: "latest"
  dry-run:
    description: "If true, simulate the deployment without making changes"
    required: false
    default: "false"

outputs:
  result:
    description: "The result of the action"
    value: ${{ steps.run.outputs.result }}
  duration:
    description: "Execution duration in seconds"
    value: ${{ steps.run.outputs.duration }}

runs:
  using: "composite"
  steps:
    - name: Validate inputs
      shell: bash
      run: |
        if [[ -z "${{ inputs.target }}" ]]; then
          echo "::error::Input 'target' is required"
          exit 1
        fi

    - name: Run action logic
      id: run
      shell: bash
      env:
        TARGET: ${{ inputs.target }}
        VERSION: ${{ inputs.version }}
        DRY_RUN: ${{ inputs.dry-run }}
      run: |
        start_time=$(date +%s)

        echo "Deploying version ${VERSION} to ${TARGET}..."
        if [[ "${DRY_RUN}" == "true" ]]; then
          echo "Dry run — no changes made."
          echo "result=dry-run-success" >> "$GITHUB_OUTPUT"
        else
          # Actual deployment logic here
          echo "result=success" >> "$GITHUB_OUTPUT"
        fi

        end_time=$(date +%s)
        echo "duration=$((end_time - start_time))" >> "$GITHUB_OUTPUT"
```

### Step 3 — Write the README

Document the action's purpose, all inputs/outputs, and provide a usage example:

```markdown
## Usage

\`\`\`yaml
- uses: your-org/my-action@v1
  with:
    target: production
    version: "2.1.0"
    dry-run: "true"
\`\`\`
```

### Step 4 — Test locally

Test the action in a workflow within the same repository:

```yaml
# .github/workflows/test-action.yml
name: Test My Action
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: ./my-action
        id: action
        with:
          target: staging
          dry-run: "true"
      - run: |
          echo "Result: ${{ steps.action.outputs.result }}"
          echo "Duration: ${{ steps.action.outputs.duration }}s"
```

## Option B: Create a JavaScript/TypeScript Action

### Step 1 — Scaffold the project

```bash
mkdir my-js-action && cd my-js-action
npm init -y
npm install @actions/core @actions/github @actions/exec @actions/io
npm install -D @vercel/ncc typescript @types/node
```

### Step 2 — Define `action.yml`

```yaml
name: "My JS Action"
description: "One-line description of what this action does"
author: "Your Name or Org"

branding:
  icon: "zap"
  color: "blue"

inputs:
  github-token:
    description: "GitHub token for API access"
    required: true
    default: ${{ github.token }}
  label:
    description: "Label to apply to the issue or PR"
    required: true

outputs:
  applied:
    description: "Whether the label was successfully applied"

runs:
  using: "node20"
  main: "dist/index.js"
```

### Step 3 — Write the action logic

```typescript
// src/index.ts
import * as core from "@actions/core";
import * as github from "@actions/github";

async function run(): Promise<void> {
  try {
    const token = core.getInput("github-token", { required: true });
    const label = core.getInput("label", { required: true });

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const issueNumber = github.context.issue.number;

    if (!issueNumber) {
      core.setFailed("This action must run in the context of an issue or pull request.");
      return;
    }

    core.info(`Adding label "${label}" to #${issueNumber}`);

    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: [label],
    });

    core.setOutput("applied", "true");
    core.info(`Label "${label}" applied successfully.`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
```

### Step 4 — Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### Step 5 — Build and bundle

Add scripts to `package.json`:

```json
{
  "scripts": {
    "build": "tsc && ncc build dist/index.js -o dist --minify",
    "test": "jest"
  }
}
```

Run the build:

```bash
npm run build
```

Commit the `dist/` directory — GitHub Actions requires the bundled output to be checked in.

### Step 6 — Test with a workflow

```yaml
# .github/workflows/test-js-action.yml
name: Test JS Action
on:
  issues:
    types: [opened]

permissions:
  issues: write

jobs:
  label:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: ./
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          label: "triage"
```

## Publishing to the Marketplace

1. Tag a release with semantic versioning:
   ```bash
   git tag -a v1.0.0 -m "Initial release"
   git push origin v1.0.0
   ```

2. Create a GitHub Release from the tag. Check **"Publish this action to the GitHub Marketplace"**.

3. Maintain a floating major tag for consumers:
   ```bash
   git tag -fa v1 -m "Update v1 tag"
   git push origin v1 --force
   ```

4. Set up Dependabot to keep action dependencies updated:
   ```yaml
   # .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: "github-actions"
       directory: "/"
       schedule:
         interval: "weekly"
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
   ```

## Available Tools

- `gh` CLI — Test actions locally with `act` or trigger workflow runs with `gh workflow run`.
- `actionlint` — Lint workflow files for syntax and semantic errors.
- `@vercel/ncc` — Bundle JavaScript actions into a single file.
- `act` — Run GitHub Actions locally for rapid iteration (https://github.com/nektos/act).

## Common Patterns

### Posting a PR comment from an action

```typescript
await octokit.rest.issues.createComment({
  owner,
  repo,
  issue_number: prNumber,
  body: `### Action Report\n\n${summary}`,
});
```

### Setting a commit status

```typescript
await octokit.rest.repos.createCommitStatus({
  owner,
  repo,
  sha: github.context.sha,
  state: "success",
  context: "my-action/check",
  description: "All checks passed",
  target_url: "https://example.com/report",
});
```

### Using problem matchers for inline annotations

```typescript
// Register a problem matcher for ESLint-style output
core.info("::add-matcher::.github/eslint-matcher.json");
```
