#!/usr/bin/env bun
/**
 * Runnable device-authorize entrypoint, spawned DETACHED by maybeAutoconnect()
 * on first run (and usable directly: `bun run hooks/connect.ts`). Opens the
 * browser, polls until approved, writes the shared ~/.atlaso/auth.json, then
 * releases the connect lock.
 */
import { runConnect } from "../lib/connect";

runConnect()
  .then((rc) => process.exit(rc))
  .catch(() => process.exit(1));
