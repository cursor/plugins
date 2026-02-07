# Skill: Deploy to Vercel

## Description

Step-by-step guide for deploying a project to Vercel, from initial setup through production deployment with custom domains and environment variables.

## Prerequisites

- Node.js 18+ installed
- A Vercel account (https://vercel.com/signup)
- A project ready to deploy (Next.js, React, Nuxt, SvelteKit, Astro, or any framework)

## Steps

### Step 1: Install the Vercel CLI

Install the Vercel CLI globally:

```bash
npm install -g vercel
```

Verify the installation:

```bash
vercel --version
```

### Step 2: Authenticate

Log in to your Vercel account:

```bash
vercel login
```

This opens a browser window for authentication. For CI/CD, use a token:

```bash
vercel login --token <your-token>
```

### Step 3: Link Your Project

Navigate to your project directory and link it to Vercel:

```bash
cd /path/to/your/project
vercel link
```

Follow the prompts to:
- Select your Vercel team/account
- Link to an existing project or create a new one
- Confirm framework detection and build settings

This creates a `.vercel` directory with project metadata. Add `.vercel` to `.gitignore`.

### Step 4: Configure Environment Variables

Add environment variables for each environment (Production, Preview, Development):

```bash
# Add interactively
vercel env add DATABASE_URL

# Add with specific environments
vercel env add API_KEY production
vercel env add API_KEY preview
vercel env add API_KEY development

# Pull variables to a local .env file for development
vercel env pull .env.local
```

Best practices:
- Use separate database URLs for production and preview
- Prefix client-side variables with `NEXT_PUBLIC_` (Next.js)
- Never commit `.env.local` — add it to `.gitignore`
- Use Vercel's encrypted storage for sensitive values

### Step 5: Configure vercel.json (Optional)

Create or update `vercel.json` for custom settings:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Step 6: Deploy to Preview

Deploy a preview version to validate everything works:

```bash
vercel
```

This creates a unique preview URL (e.g., `https://my-app-abc123.vercel.app`). Open it in your browser to verify:

- Pages render correctly
- API routes respond
- Environment variables are loaded
- Images and assets load

### Step 7: Deploy to Production

Once preview looks good, promote to production:

```bash
vercel --prod
```

Or promote an existing preview deployment:

```bash
vercel promote <deployment-url>
```

### Step 8: Configure Custom Domains

Add your custom domain:

```bash
vercel domains add yourdomain.com
```

Configure DNS at your registrar:
- **A Record**: Point `@` to `76.76.21.21`
- **CNAME Record**: Point `www` to `cname.vercel-dns.com`

Or transfer nameservers to Vercel for automatic DNS management:

```bash
vercel dns ls yourdomain.com
```

Set up redirects (e.g., www → apex):

```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "https://yourdomain.com",
      "permanent": true,
      "has": [{ "type": "host", "value": "www.yourdomain.com" }]
    }
  ]
}
```

### Step 9: Set Up Git Integration

For automatic deployments on every push:

1. Go to https://vercel.com/dashboard → Import Project
2. Connect your GitHub, GitLab, or Bitbucket repository
3. Configure:
   - **Production Branch**: `main` (deployed to production)
   - **Preview Branches**: All other branches (deployed as previews)
   - **Auto-deploy**: Enabled by default

### Step 10: Verify Production Deployment

After deploying to production:

```bash
# Check deployment status
vercel inspect <production-url>

# View function logs
vercel logs <production-url>

# List all deployments
vercel ls
```

Verify in browser:
- [ ] Homepage loads correctly
- [ ] API routes respond with correct data
- [ ] Authentication flows work
- [ ] Images are optimized and loading
- [ ] SSL certificate is valid
- [ ] Custom domain resolves correctly

## Troubleshooting

### Build Fails

```bash
# Build locally to reproduce
vercel build

# Check build logs
vercel logs <deployment-url> --follow
```

Common causes:
- Missing environment variables
- Incompatible Node.js version (set `engines.node` in `package.json`)
- TypeScript errors (Vercel runs `tsc` by default in Next.js)

### Function Errors

```bash
# Stream logs in real time
vercel logs <deployment-url> --follow

# Inspect deployment details
vercel inspect <deployment-url>
```

### Slow Deployments

- Use `--prebuilt` with a CI pipeline to separate build and deploy steps
- Add `ignoreCommand` for monorepos to skip unnecessary builds
- Cache dependencies by committing lockfiles

## CI/CD Integration

For GitHub Actions:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```
