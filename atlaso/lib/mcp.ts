/** Atlaso memory MCP server for Cursor — inline, zero-dep, bun-native.
 *
 * Speaks JSON-RPC 2.0 over newline-delimited stdio (the MCP stdio transport) and
 * exposes the 5 memory tools — recall / remember / forget / recent / status — that
 * the OTHER Atlaso connectors ship. Cursor launches it from mcp.json as
 * `bun run ${CURSOR_PLUGIN_ROOT}/lib/mcp.ts`.
 *
 * WHY inline stdio (not remote): the plugin's hooks already mint this device's OWN
 * per-tool credential at ~/.atlaso/tools/cursor.json, and this server reuses it via
 * resolveCredential("cursor"). So capture (hooks) AND recall (MCP) authorize with the
 * SAME token — one credential, one unlink, no second OAuth consent. It stays inside
 * the plugin (ships in the Marketplace bundle), works offline-first, and never leaks
 * the engine (thin client — it only knows the brain's URLs).
 *
 * STDOUT IS THE PROTOCOL — nothing but JSON-RPC frames may be written there. All
 * diagnostics go to the debug file (lib/log). One complete JSON object per line.
 */
import { forget, health, loadAuth, recall, recent, remember } from "./atlaso";
import { classifyScope } from "./capture";
import { resolveCredential } from "./credential";
import { cloudMode, online } from "./entitlement";
import { REVOKED } from "./state";
import { log } from "./log";
import { currentProjectKey, visibleInProject } from "./project";

const NAME = "Atlaso";
const VERSION = "0.1.0";
const PROTOCOL = "2024-11-05";
const TOOL = "cursor";

// The 5-tool surface. Descriptions are the model's only cue for WHEN to call each —
// keep them action-first and lean (the ~40-tool budget rewards brevity).
export const TOOLS = [
  {
    name: "recall",
    description:
      "Search the user's Atlaso long-term memory for notes relevant to `query` — past decisions, preferences, conventions, project facts, gotchas. Call it before answering when prior context would help. Read-only.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "integer", default: 5 } },
      required: ["query"],
    },
  },
  {
    name: "remember",
    description:
      "Save a durable fact, decision, preference, or gotcha to Atlaso memory. Project facts stay in the current project; personal preferences remain available across projects. Use for things worth keeping, not transient chatter.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        scope: {
          type: "string",
          enum: ["personal", "project"],
          description: "Optional override. Omit to infer personal vs project from the text.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "forget",
    description:
      "Permanently delete a memory by its id (ids come from recall/recent). Destructive and not undoable — only when the user asks to forget something.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "recent",
    description: "List the user's most recent memories (newest first). Read-only.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", default: 10 } },
    },
  },
  {
    name: "status",
    description:
      "Atlaso memory health: connected?, how many memories are stored, and the memory health score (FMI). Read-only.",
    inputSchema: { type: "object", properties: {} },
  },
] as const;

const NOT_LINKED =
  "Atlaso memory isn't linked on this device yet. Start a Cursor chat (the plugin links automatically) or run `atlaso connect`.";

function resultVisibleHere(r: { scope?: string; tags?: string[] }, project: string | null): boolean {
  const tags = Array.isArray(r.tags) ? [...r.tags] : [];
  // Some server versions expose the normalized scope separately. Preserve the
  // fail-closed project rule even if such a row arrives without scope:* in tags.
  if (r.scope === "project" && !tags.includes("scope:project")) tags.push("scope:project");
  return visibleInProject(tags, project);
}

/** Run one tool. Gates on the SAME entitlement/tombstone check the hooks use
 *  (`online()`) BEFORE resolving a credential — otherwise a revoked or free-plan-
 *  gated tool could resurrect on the shared bearer through an MCP call (the hooks
 *  never can, because they gate first). Then resolves THIS device's per-tool
 *  credential so every call authorizes as the cursor tool. */
export async function dispatch(name: string, args: any): Promise<any> {
  const shared = loadAuth();
  if (!shared?.token) return { error: NOT_LINKED };
  const deviceId = shared.device_id ?? null;
  // The verified-verdict gate: revoked → stay down (sticky); free-plan non-active →
  // local-only. Never resurrect a removed tool via the shared bearer.
  if (!(await online(shared, TOOL, deviceId))) {
    const mode = cloudMode(shared, TOOL, deviceId);
    return {
      error:
        mode.reason === REVOKED
          ? "Atlaso memory was removed for Cursor on this device. Re-add the plugin (or run `atlaso connect`) to turn it back on."
          : "Atlaso memory is local-only for Cursor right now — on the free plan only one tool per device is active. Upgrade or switch the active tool at https://app.atlaso.ai.",
    };
  }
  const auth = await resolveCredential(TOOL);
  if (!auth) return { error: NOT_LINKED };
  const project = currentProjectKey();
  switch (name) {
    case "recall": {
      const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 5) || 5));
      const results = await recall(
        auth,
        String(args?.query ?? ""),
        limit,
        project ?? undefined,
      );
      return {
        results: results
          .filter((r) => resultVisibleHere(r, project))
          .slice(0, limit)
          .map((r) => ({ id: r.id, content: r.content })),
      };
    }
    case "recent": {
      const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 10) || 10));
      // `/v1/memories` is global/newest-first, so over-fetch before filtering or a
      // run of foreign-project rows could crowd every visible memory out of the page.
      const fetchLimit = Math.min(200, Math.max(limit * 4, 40));
      const memories = (await recent(auth, fetchLimit))
        .filter((r) => resultVisibleHere(r, project))
        .slice(0, limit)
        .map((r) => ({ id: r.id, content: r.content }));
      return { memories };
    }
    case "remember": {
      const text = String(args?.text ?? "");
      const requested = args?.scope === "personal" || args?.scope === "project"
        ? args.scope
        : null;
      const scope = requested ?? classifyScope(text);
      if (scope === "project" && !project) {
        return { saved: false, error: "could not identify the current project; retry with scope `personal` if this memory should be global" };
      }
      const tags = [`scope:${scope}`];
      if (scope === "project" && project) tags.push(`project:${project}`);
      const id = await remember(auth, { text, tags });
      return id ? { saved: true, id } : { saved: false, error: "empty text, or the server was unreachable" };
    }
    case "forget": {
      const id = String(args?.id ?? "");
      const ok = await forget(auth, id);
      return ok
        ? { forgotten: true, id }
        : { forgotten: false, id, note: "not forgotten — the server was unreachable. Try again when connected." };
    }
    case "status": {
      const h = await health(auth);
      if (!h) return { connected: false, error: "Atlaso memory is unreachable right now. Try again when connected." };
      return { connected: true, fmi: h?.fmi ?? null, total: h?.deposit_count ?? null };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

// ── JSON-RPC 2.0 plumbing ────────────────────────────────────────────────────────
const ok = (id: any, result: any) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id: any, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

/** A dispatch payload that represents a tool-level failure — so tools/call can set the
 *  MCP `isError` bit while STILL returning the readable JSON the model can act on. */
function isFailure(r: any): boolean {
  return !!(r && (r.error || r.saved === false || r.forgotten === false));
}

/** Handle one JSON-RPC message. Returns the response object, or null for a
 *  notification (no id) that needs no reply. Never throws. */
export async function handle(msg: any): Promise<any | null> {
  const { id, method, params } = msg ?? {};
  // JSON-RPC: a message with no id is a NOTIFICATION — NEVER reply to one. Replying
  // would put an id-less frame on stdout and corrupt the transport. (This also covers
  // notifications/initialized and any progress/cancelled notifications.)
  if (id === undefined || id === null) return null;

  switch (method) {
    case "initialize":
      return ok(id, {
        // Advertise the version we actually implement — do NOT echo the client's
        // requested version (that would claim support for a protocol we may not run).
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: NAME, version: VERSION },
      });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      try {
        const result = await dispatch(params?.name, params?.arguments ?? {});
        // Tool-level problems ride back as readable content so the model can act on
        // them, AND flag isError so a client keying off the bit doesn't read a failure
        // as success.
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(result) }],
          ...(isFailure(result) ? { isError: true } : {}),
        });
      } catch (e) {
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) }],
          isError: true,
        });
      }
    }
    default:
      return rpcErr(id, -32601, `method not found: ${method}`);
  }
}

// Handlers may finish concurrently, but stdout is one byte stream. Serialize complete
// frames (including backpressure) so large overlapping responses cannot interleave.
let writeQueue: Promise<void> = Promise.resolve();
function writeFrame(resp: any): Promise<void> {
  const frame = JSON.stringify(resp) + "\n";
  const write = () => new Promise<void>((resolve, reject) => {
    process.stdout.write(frame, (err) => err ? reject(err) : resolve());
  });
  const task = writeQueue.then(write, write);
  writeQueue = task.catch(() => {});
  return task;
}

/** Read newline-delimited JSON-RPC from stdin, write responses to stdout. Handlers
 *  run concurrently (no head-of-line blocking); frame writes are serialized. */
async function main(): Promise<void> {
  const decoder = new TextDecoder();
  let buf = "";
  const inflight = new Set<Promise<void>>(); // drained on EOF so no reply is lost
  log("mcp", "server up");
  for await (const chunk of Bun.stdin.stream()) {
    buf += decoder.decode(chunk as Uint8Array, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg: any;
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // a malformed line is not a protocol frame — drop it
      }
      // Handlers run concurrently (no head-of-line blocking), but we keep a handle
      // on each so EOF can drain them — otherwise the process could exit before the
      // last frame's reply is written.
      const p = handle(msg)
        .then(async (resp) => {
          if (resp) await writeFrame(resp);
        })
        .catch((e) => {
          if (msg?.id != null) return writeFrame(rpcErr(msg.id, -32603, String(e)));
        })
        .finally(() => inflight.delete(p));
      inflight.add(p);
    }
  }
  await Promise.allSettled(inflight); // stdin closed — let pending replies flush
}

if (import.meta.main) {
  main().catch((e) => {
    log("mcp", `fatal ${e}`);
    process.exit(1);
  });
}
