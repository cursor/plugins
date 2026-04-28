# Authentication

The short version: `export CURSOR_API_KEY=cursor_...` and `Agent.create({ apiKey: process.env.CURSOR_API_KEY! })`. Everything else in this page is what you read when that doesn't work.

## Key types

The SDK accepts two key kinds; both work for local and cloud.


| Key kind                 | Minted at                                                                              | When you'd use it                                                         |
| ------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| User API key             | [https://cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents) | Dev tools, personal scripts, running as a specific user                   |
| Team service-account key | Team Settings → Service accounts                                                       | Shared CI, backend services, anywhere a real person shouldn't own the key |


Both sit in the same `apiKey` / `CURSOR_API_KEY` slot — no second-class citizen. The token format is the same; you can't tell them apart by inspection.

## How the SDK finds the key

Priority order:

1. `apiKey` passed to the options object (`Agent.create`, `Agent.prompt`, `Agent.resume`, `Agent.get`, etc.)
2. `process.env.CURSOR_API_KEY`

That's it — there's no config file, no keychain integration in the SDK itself. For shared infrastructure code, **always pass `apiKey` explicitly** rather than relying on the env var, so the credential dependency is obvious at the call site.

Some cloud-only helpers (`Agent.archive`, `Agent.delete`, `Cursor.me`, `Cursor.models.list`, `Cursor.repositories.list`) accept `apiKey` as a named option too. When they don't receive one, they fall back to `CURSOR_API_KEY`.

## Minimum viable setup

```bash
export CURSOR_API_KEY="cursor_..."
```

```typescript
import { Agent } from "@cursor/sdk";

const agent = Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
});
```

The non-null assertion (`!`) is a readable way to say "fail loudly if the env var is missing" — otherwise the SDK will throw an auth error later and the stack trace won't point at the env var.

A slightly more polite pattern:

```typescript
const apiKey = process.env.CURSOR_API_KEY;
if (!apiKey) {
  console.error("Missing CURSOR_API_KEY. Mint one at https://cursor.com/dashboard/cloud-agents.");
  process.exit(1);
}
```

## Symptoms of bad auth


| Symptom                                                  | Diagnosis                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `AuthenticationError: ...` on first `send()`             | Key missing, expired, or malformed (including whitespace)                      |
| `ConfigurationError: BAD_USER_API_KEY`                   | Key is syntactically invalid                                                   |
| `AuthenticationError` only on cloud, local works         | Key can't reach the cloud agents surface — could be a permissions issue        |
| Cloud run errors with `ERROR_GITHUB_NO_USER_CREDENTIALS` | Caller doesn't have a GitHub connection to the target repo                     |
| Works locally, 401s in CI                                | Env var isn't making it into the CI job (quoting, secret scoping, scope, etc.) |
| Intermittent 401s                                        | Almost always a key rotation issue or two conflicting `CURSOR_API_KEY` values  |


### `ERROR_GITHUB_NO_USER_CREDENTIALS` is not a code bug

Cloud runs clone the target repo using the caller's GitHub credentials. If the user behind `CURSOR_API_KEY` has never connected GitHub in the Cursor dashboard, the cloud agent can't access the repo and the run fails immediately. Fix: caller links GitHub in the dashboard. No code change.

For service-account keys, the service account needs GitHub access configured just like a user would.

## Rotating keys

- Rotate on a schedule for production workloads; don't bake a key into an image.
- When a key leaks, revoke in the dashboard first, then mint a new one. The SDK picks up new env values on next process start.
- Prefer per-environment keys (staging, prod) over one global key so revocations are scoped.

## Multiple keys in one process

Totally supported — each `Agent.create` / `Agent.prompt` call is independent. Pass `apiKey` explicitly so you don't accidentally fall back to an env var the caller wasn't thinking about:

```typescript
const userAgent  = Agent.create({ apiKey: userKey,  /* ... */ });
const botAgent   = Agent.create({ apiKey: botKey,   /* ... */ });
```

## Local development

If you're developing integrations and iterating fast, keep your key in a `.env` file that's gitignored and loaded via something like `dotenv`:

```typescript
import "dotenv/config";
// Now process.env.CURSOR_API_KEY is populated.
```

Don't commit `.env`. The SDK does not read `.env` itself.

## CI checklist

- Put the key in the secrets store, not a workflow file.
- Scope the secret to the specific job/workflow that needs it.
- For GitHub Actions, use repo-level or environment-level secrets (environment gives you approval gates too).
- Print only a key-prefix (first 6 chars) to logs if you need to confirm which key is in use, never the full value.
- Fail fast if the key is missing — don't let the job run for 10 minutes and 401 at the end.

## Service accounts for production integrations

For anything that isn't a personal dev script:

1. Create a team service account in Team Settings.
2. Give it only the permissions it needs.
3. Mint a key for it and store the key in your secrets manager.
4. If the integration spawns cloud agents, link GitHub for the service account (not the operator's personal account).
5. Monitor usage against the service account — per-caller attribution is what you lose if everything is running under one key.

