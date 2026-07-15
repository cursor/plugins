#!/usr/bin/env bun
/**
 * recall hook (Cursor sessionStart) — deliver recalled memory via a rules file.
 *
 * sessionStart has no per-turn query, so we seed a broad recall (recent work /
 * preferences / decisions) plus the latest deposits, de-duplicated, and write
 * them into <workspace>/.cursor/rules/atlaso-recall.mdc (the WORKING injection
 * channel — see lib/render.ts). Also kicks the detached browser-authorize flow on
 * first run. Best-effort; never breaks the session (always exits 0).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadAuth, recall, recent, type Auth, type RecallResult } from "../lib/atlaso";
import { resolveCredential } from "../lib/credential";
import { maybeAutoconnect } from "../lib/connect";
import { cloudMode, online } from "../lib/entitlement";
import { log } from "../lib/log";
import { projectKey, scopeOf, visibleInProject, workspaceRoot } from "../lib/project";
import { noticeFor, render, rulesPath } from "../lib/render";
import { parsePayload, readStdin } from "../lib/stdin";

const TOOL = "cursor";

const SEED = "recent work decisions preferences conventions gotchas project setup";
const LIMIT = 8;

async function gather(auth: Auth, project: string | undefined): Promise<RecallResult[]> {
  const seen = new Set<string>();
  const out: RecallResult[] = [];
  const add = (r: RecallResult) => {
    const c = (r.content || "").trim();
    if (c && !seen.has(c)) {
      seen.add(c);
      out.push(r);
    }
  };
  // server-side project-scoped recall (already filtered by the brain)
  for (const r of await recall(auth, SEED, LIMIT, project)) add(r);
  // fallback: recent deposits are NOT server-filtered, so apply the SAME
  // per-project visibility rule client-side — project A's notes must never leak
  // into project B's rules file.
  if (out.length < LIMIT) {
    for (const r of await recent(auth, LIMIT)) {
      if (!visibleInProject(r.tags, project ?? null)) continue;
      if (r.scope === undefined) r.scope = scopeOf(r.tags)[0]; // for the [scope] suffix
      add(r);
      if (out.length >= LIMIT) break;
    }
  }
  return out;
}

async function main(): Promise<void> {
  if (process.env.ATLASO_EXTRACTING) return; // never recall inside our own enrichment
  maybeAutoconnect("cursor"); // detached browser-authorize on first run; no-op once linked
  const payload = parsePayload(await readStdin());
  const ws = workspaceRoot(payload);
  if (!ws) return;

  const auth = loadAuth();
  const deviceId = auth?.device_id ?? null;
  let results: RecallResult[] = [];
  // entitlement gate: only recall from the cloud when this tool is cloud-linked
  // (free plan = 1 active tool/device; the brain doesn't enforce it — we do).
  if (auth && (await online(auth, TOOL, deviceId))) {
    // Resolve THIS tool's own credential (mint on first run) and recall with it, so
    // the brain attributes the call to Cursor specifically. Null = must stay
    // local-only this run (tombstoned/not-entitled) → empty rules file + a notice.
    const cred = await resolveCredential(TOOL);
    if (cred) {
      try {
        results = await gather(cred, projectKey(ws) || undefined);
      } catch {
        /* fall through to an empty (placeholder) rules file */
      }
    }
  }
  // re-load auth: online() may have retired a revoked token mid-run. The notice
  // (local-only / upgrade / grace) reaches the user via the rules file.
  const notice = noticeFor(cloudMode(loadAuth(), TOOL, deviceId));
  try {
    const p = rulesPath(ws);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, render(results, notice), "utf-8");
    log("recall", `wrote=${p} n=${results.length} notice=${notice ? "y" : "n"}`);
  } catch (e) {
    log("recall", `error ${e}`);
  }
}

main().catch(() => {}).finally(() => process.exit(0));
