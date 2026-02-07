# Skill: Set Up a CI/CD Pipeline with GitHub Actions

## When to Use

Use this skill when the user wants to:

- Set up continuous integration (CI) for a new or existing project
- Add continuous deployment (CD) to staging or production environments
- Create a complete CI/CD pipeline from scratch
- Migrate from another CI/CD platform (Jenkins, CircleCI, Travis CI, GitLab CI) to GitHub Actions

## Prerequisites

- A GitHub repository with source code
- Understanding of the project's build and test commands
- For deployment: target environment credentials stored as GitHub secrets

## Step 1 — Detect the Project Stack

Examine the repository root for configuration files to determine the stack:

| File | Stack | Build Tool |
|------|-------|------------|
| `package.json` | Node.js | npm / yarn / pnpm |
| `package-lock.json` | Node.js (npm) | npm |
| `yarn.lock` | Node.js (yarn) | yarn |
| `pnpm-lock.yaml` | Node.js (pnpm) | pnpm |
| `pyproject.toml` | Python | pip / poetry / hatch |
| `requirements.txt` | Python | pip |
| `Pipfile` | Python | pipenv |
| `go.mod` | Go | go |
| `Cargo.toml` | Rust | cargo |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin | Gradle |
| `pom.xml` | Java | Maven |
| `Gemfile` | Ruby | bundler |
| `Dockerfile` | Docker | docker |
| `docker-compose.yml` | Docker Compose | docker compose |

## Step 2 — Choose a Pipeline Pattern

### Pattern A: Node.js CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint

  test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
        if: matrix.node-version == 20
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [lint, test]
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
        with:
          name: build-output
          path: dist/
          retention-days: 7
```

### Pattern B: Python CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: actions/setup-python@82c7e631bb3cdc910f68e0081d67478d79c6982d # v5.1.0
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install ruff mypy
      - run: ruff check .
      - run: ruff format --check .
      - run: mypy src/

  test:
    name: Test (Python ${{ matrix.python-version }})
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        python-version: ["3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: actions/setup-python@82c7e631bb3cdc910f68e0081d67478d79c6982d # v5.1.0
        with:
          python-version: ${{ matrix.python-version }}
          cache: pip
      - run: pip install -e ".[test]"
      - run: pytest --cov=src --cov-report=xml
      - uses: actions/upload-artifact@5d5d22a31266ced268874388b861e4b58bb5c2f3 # v4.3.1
        if: matrix.python-version == '3.12'
        with:
          name: coverage-report
          path: coverage.xml
          retention-days: 7
```

### Pattern C: Docker Build and Push

```yaml
# .github/workflows/docker.yml
name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

permissions:
  contents: read
  packages: write

concurrency:
  group: docker-${{ github.ref }}
  cancel-in-progress: true

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    name: Build & Push
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - uses: docker/setup-buildx-action@f95db51fddba0c2d1ec667646a06c2ce06100226 # v3.0.0

      - uses: docker/login-action@343f7c4344506bcbf9b4de18042ae17996df046d # v3.0.0
        if: github.event_name != 'pull_request'
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@8e5442c4ef9f78752691e2d8f8d19755c6f78e81 # v5.5.1
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - uses: docker/build-push-action@4a13e500e55cf31b7a5d59a38ab2040ab0f42f56 # v5.1.0
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Pattern D: Deploy to Cloud

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - staging
          - production
        default: staging

permissions:
  contents: read
  id-token: write  # Required for OIDC

concurrency:
  group: deploy-${{ github.event.inputs.environment || 'staging' }}
  cancel-in-progress: false

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment:
      name: staging
      url: https://staging.example.com
    if: github.event_name == 'push' || github.event.inputs.environment == 'staging'
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502 # v4.0.2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy
        run: |
          echo "Deploying to staging..."
          # aws s3 sync dist/ s3://my-staging-bucket/
          # aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: deploy-staging
    environment:
      name: production
      url: https://example.com
    if: github.event.inputs.environment == 'production'
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502 # v4.0.2
        with:
          role-to-assume: ${{ secrets.AWS_PROD_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy
        run: |
          echo "Deploying to production..."
          # Your deployment commands here
```

## Step 3 — Configure Required Secrets

Guide the user to add secrets in **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Required For |
|-------------|-------------|-------------|
| `AWS_ROLE_ARN` | IAM role ARN for OIDC auth | AWS deployments |
| `DOCKER_USERNAME` | Docker Hub username | Docker Hub pushes |
| `DOCKER_PASSWORD` | Docker Hub access token | Docker Hub pushes |
| `NPM_TOKEN` | npm publish token | Package publishing |
| `DEPLOY_KEY` | SSH deploy key | Server deployments |
| `SONAR_TOKEN` | SonarQube/SonarCloud token | Code quality analysis |

## Step 4 — Set Up Branch Protection

Recommend the following branch protection rules for `main`:

1. **Require status checks to pass** — Select the CI jobs as required checks.
2. **Require branches to be up to date** — Ensures PRs are tested against the latest `main`.
3. **Require pull request reviews** — At least one approval before merge.
4. **Require linear history** — Enforces squash or rebase merges for a clean history.
5. **Do not allow bypassing** — Even admins must follow the rules.

## Step 5 — Add Dependabot for Automated Updates

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      actions:
        patterns: ["*"]
  - package-ecosystem: "npm"  # or pip, cargo, gomod, etc.
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      dependencies:
        patterns: ["*"]
        exclude-patterns: ["@types/*"]
      types:
        patterns: ["@types/*"]
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_VERSION` | `20` | Node.js version for Node.js pipelines |
| `PYTHON_VERSION` | `3.12` | Python version for Python pipelines |
| `REGISTRY` | `ghcr.io` | Container registry for Docker pipelines |
| `DEPLOY_ENVIRONMENT` | `staging` | Default deployment target |

### Workflow Dispatch Inputs

Add `workflow_dispatch` with inputs to allow manual triggering with parameters:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
      skip-tests:
        type: boolean
        default: false
      version:
        type: string
        description: "Version to deploy (e.g., v1.2.3)"
```

## Common Extensions

After setting up the base pipeline, consider adding:

- **Code coverage** reporting with Codecov or Coveralls
- **Security scanning** with CodeQL (`github/codeql-action`) or Snyk
- **Release automation** with `release-please` or `semantic-release`
- **Deployment previews** for PRs (Vercel, Netlify, Cloudflare Pages)
- **Slack/Discord notifications** on deployment success or failure
- **Performance benchmarks** with `github/codeql-action` or custom scripts
- **Changelog generation** with `conventional-changelog` or `release-please`
