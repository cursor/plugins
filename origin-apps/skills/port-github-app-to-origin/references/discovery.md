# Discovering what the GitHub App uses, from its codebase

Everything the brief needs about the app is in the repository. Search for it.
Do not ask for it. Record `file:line` for every fact and list every place you
looked that turned up nothing. Note the language and libraries as an
observation. They inform sizes and nothing else.

Seven facets. For each, what to record:

1. **Declared permissions and events.** The manifest or registration snapshot
   if it is checked in (`app.yml`, a manifest JSON, IaC that seeds the app;
   Probot keeps `default_events` and `default_permissions` in `app.yml`). If
   there is none, say so and derive permissions from facet 4. The union of
   what the code calls is what the port needs anyway.
2. **Webhook events handled.** Each GitHub event and action pair the code
   dispatches on (`app.on("pull_request.opened")`, a switch on
   `x-github-event` plus `payload.action`, SDK parsers), with the handler
   location.
3. **Payload fields read.** Every property path each handler and its helpers
   dereference from the payload. Include fields used only for logging or
   metrics. Those break dashboards after the port.
4. **REST and GraphQL calls.** Each distinct call family once (method and path,
   or SDK method) with the parameters and filters the code passes, the
   response fields it reads, whether it runs per webhook or in a loop (this
   decides the fan-out tradeoff), and the pagination style in use. Pagination
   always changes. GraphQL documents count as calls. Mapping decomposes them.
5. **Authentication and token minting.** The app JWT algorithm. How the code
   identifies the installation after install (callback query, webhook, DB).
   Token lifetime handling. Whether user OAuth exists and what it is for
   (identity, repository discovery, acting for a user). Whether the app clones
   or pushes git as itself.
6. **Webhook receiver and verification.** The signature scheme. Whether the
   raw body is available at verification time (a framework that parses JSON
   first cannot verify). How the code deduplicates deliveries, if it does.
   Where the public URL is configured.
7. **Calls the framework makes on the app's behalf.** They are not in the
   app's source, but the port has to make them. List them as rows marked
   "from `<dependency>` (documented behavior)" and read the dependency's docs
   or source, not the app. Common cases:
   - Probot: the built-in receiver and HMAC verification, per-installation
     token minting and caching, `context.repo()` and `context.issue()`,
     `context.isBot`. Companions: `probot-config` reads `.github/<file>.yml`
     and falls back to the owner's `.github` repository; `probot-scheduler`
     lists installations and repositories with the app credential and emits
     `schedule.repository`; `probot-metadata` stores state in issue bodies.
   - Octokit `App`: `webhooks.verifyAndReceive`, `eachInstallation` and
     `eachRepository`, token minting behind `getInstallationOctokit`.
   - `ghinstallation`, `githubkit`, `gidgethub`, `octokit.rb` app auth: JWT
     minting and installation-token exchange.

When something is missing, say so in the inventory ("no manifest found
(searched: …)", "no signature verification found in the receiver at …").
Each missing item becomes an up-front question. Do not
fill it in with what an app of this kind usually does.
