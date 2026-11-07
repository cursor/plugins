---
title: Runtime prerequisites
description: Required core runtimes and optional helper platform limitations.
---

## Core tooling

Configuration, generation, and validation require Node 22.18+ and npm.
They use filesystem APIs and work on macOS, Linux, and Windows; configuration
uses the documented `XDG_CONFIG_HOME` or `PSTACK_CONFIG` override on all platforms.
No API keys, provider client, or paid model call is required by the helper.
Host clients require their own installation, sign-in, entitlements, and policy approval.

## Retained helper tools

| Helper                         | Prerequisites and limits                             |
|--------------------------------|------------------------------------------------------|
| PR watcher                     | Bun, bundled locked dependencies, authenticated `gh` |
| Formal verification/statechart | Node 22.18+, Java 11+, `tla2tools.jar`; `TLA2TOOLS` and `JAVA` may point to existing tools |
| Optional TLC bootstrap         | `mise` with network access; installing tools is not automatic authorization |
| Worktree audit/log shell tools | POSIX shell and git; macOS/Linux, or Windows WSL      |
| Media/catch-up video workflows | Project-provided media tooling such as ffmpeg; optional |
| Simulator/UI workflows         | Project-provided driver, and platform-specific simulator if required |
| Cursor Automations/bot UI      | Cursor-specific service, credentials and separate authorization; optional |

The statechart test suite uses checked-in TLC recordings unless an explicit
live verifier/tool environment is configured. Recorded output tests are not
fresh formal proofs. PR watcher tests use fakes, not external PR writes.

For Bun tools run `bun install --frozen-lockfile` in
`skills/poteto-mode/scripts`, then `bun run typecheck` and the existing tests.
Dependencies and lockfile remain bundled; the watcher launcher bootstraps them
as before. When installed content is immutable, copy the watcher tools into an
explicit writable user/project tools directory before installing dependencies
or launching it. Its existing bootstrap writes node_modules and an install key;
never run that bootstrap against the plugin cache. Do not rewrite these runtimes
solely to package the plugin.

The retained plan checker validates the optional detailed personal-profile
multi-PR recipe, including its ten-lane template. It is not a requirement for
general-purpose work. The shared policy caps execution regardless of a template's
lane count; a large approved recipe runs lanes in bounded batches.

For real verification use existing project commands and drive the actual changed
surface. If a required runtime is missing, report BLOCKED with its installation
requirement. Specialized control plugins are not prerequisites for core workflows.
