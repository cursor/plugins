/**
 * Agent Vent — an MCP server that gives coding agents a tool to record
 * friction they hit while working (confusing instructions, flaky tooling,
 * painful code, etc.).
 *
 * Each grievance is dispatched to one or more pluggable *destinations*.
 * Built-in destinations:
 *   - "file"   Append the grievance as JSONL to `<project>/.cursor/complaints.jsonl`
 *              (or `~/.cursor/complaints/unfiled.jsonl` when no project is found).
 *   - "slack"  Post the grievance to a Slack channel.
 *
 * Delivery is best-effort and independent: one destination failing never fails
 * the tool call or the others.
 *
 * Configuration (environment variables — never hardcode secrets in a plugin):
 *   VENT_DESTINATIONS        Comma-separated destinations, e.g. "file,slack".
 *                            Defaults to "file", plus "slack" when Slack
 *                            credentials are present.
 *   VENT_SLACK_WEBHOOK_URL   Slack incoming-webhook URL. Simplest option; the
 *                            channel is fixed by the webhook. Takes priority.
 *   VENT_SLACK_BOT_TOKEN     Bot token (xoxb-…) for chat.postMessage. Requires
 *                            VENT_SLACK_CHANNEL and the bot invited to the channel.
 *   VENT_SLACK_CHANNEL       Channel id or name (e.g. C0123ABC or #agent-grievances).
 *
 * Any of the above may be set in the real environment, or in an env file the
 * server loads on startup — $VENT_ENV_FILE if set, otherwise ~/.cursor/.env.
 * A variable already set to a non-empty value in the environment always wins.
 *
 * To add a destination, implement `Destination` and register it in `REGISTRY`.
 *
 * Runs install-free with Bun: dependencies are declared in package.json and
 * auto-installed from Bun's global cache on first run. The launch passes
 * `--install=fallback` so this keeps working even when an unrelated
 * node_modules exists higher up the filesystem; no committed node_modules
 * is required:
 *   bun run --install=fallback server.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import process from "node:process";

const UNFILED_PATH = join(homedir(), ".cursor", "complaints", "unfiled.jsonl");

// Markers that suggest a directory is a real project root, so a bare cwd like
// `/` or the home directory never becomes a complaint destination by accident.
const PROJECT_MARKERS = [".git", ".cursor", "package.json", "pyproject.toml"];

interface Grievance {
  ts: string;
  complaint: string;
  intensity?: number;
  project?: string;
  project_path?: string;
}

/** Outcome of delivering a grievance to a single destination. */
interface DeliveryResult {
  destination: string;
  ok: boolean;
  detail: string;
}

/** A place a grievance can be sent. Implement this to add a new destination. */
interface Destination {
  readonly name: string;
  deliver(entry: Grievance): Promise<DeliveryResult>;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function expandUser(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Resolve the project directory a grievance belongs to, or null if none. */
function resolveProjectDir(projectPath?: string): string | null {
  const candidates: string[] = [];
  if (projectPath) candidates.push(expandUser(projectPath));
  candidates.push(process.cwd());

  for (const candidate of candidates) {
    if (
      isDir(candidate) &&
      PROJECT_MARKERS.some((marker) => existsSync(join(candidate, marker)))
    ) {
      return candidate;
    }
  }
  return null;
}

/** Local ISO-8601 timestamp with numeric offset, seconds precision. */
function localIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Appends the grievance as one JSON line to the project's complaints log. */
class FileDestination implements Destination {
  readonly name = "file";

  async deliver(entry: Grievance): Promise<DeliveryResult> {
    const target = entry.project_path
      ? join(entry.project_path, ".cursor", "complaints.jsonl")
      : UNFILED_PATH;
    try {
      mkdirSync(dirname(target), { recursive: true });
      appendFileSync(target, JSON.stringify(entry) + "\n", "utf-8");
      const count = readFileSync(target, "utf-8")
        .split("\n")
        .filter((line) => line.trim()).length;
      return { destination: this.name, ok: true, detail: `${target} (#${count})` };
    } catch (err) {
      return { destination: this.name, ok: false, detail: errMessage(err) };
    }
  }
}

/** Posts the grievance to Slack via incoming webhook or chat.postMessage. */
class SlackDestination implements Destination {
  readonly name = "slack";

  private constructor(
    private readonly webhook: string,
    private readonly token: string,
    private readonly channel: string,
  ) {}

  /** Build from env, or return null if Slack is not configured. */
  static fromEnv(): SlackDestination | null {
    const webhook = (process.env.VENT_SLACK_WEBHOOK_URL ?? "").trim();
    const token = (process.env.VENT_SLACK_BOT_TOKEN ?? "").trim();
    const channel = (process.env.VENT_SLACK_CHANNEL ?? "").trim();
    if (webhook || (token && channel)) {
      return new SlackDestination(webhook, token, channel);
    }
    return null;
  }

  private format(entry: Grievance): string {
    const meta = [`*${entry.project ?? "unfiled"}*`];
    if (entry.intensity != null) meta.push(`intensity ${entry.intensity}/10`);
    const quoted = entry.complaint
      .split(/\r?\n/)
      .map((line) => `> ${line}`)
      .join("\n");
    return `Grievance — ${meta.join(" · ")}\n${quoted}`;
  }

  async deliver(entry: Grievance): Promise<DeliveryResult> {
    const text = this.format(entry);
    try {
      if (this.webhook) {
        const resp = await fetchWithTimeout(this.webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } else {
        const resp = await fetchWithTimeout("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({ channel: this.channel, text, unfurl_links: false }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = (await resp.json()) as { ok?: boolean; error?: string };
        if (!payload.ok) throw new Error(payload.error ?? "unknown_slack_error");
      }
      return { destination: this.name, ok: true, detail: "delivered" };
    } catch (err) {
      return { destination: this.name, ok: false, detail: errMessage(err) };
    }
  }
}

// The set of available destinations. Add an entry to make a new one selectable
// via VENT_DESTINATIONS. A factory returns null when the destination is present
// in code but not configured (e.g. Slack without credentials).
const REGISTRY: Record<string, () => Destination | null> = {
  file: () => new FileDestination(),
  slack: () => SlackDestination.fromEnv(),
};

/** Resolve the destinations to deliver to, honoring VENT_DESTINATIONS. */
function buildDestinations(): Destination[] {
  const requested = (process.env.VENT_DESTINATIONS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const names = requested.length > 0
    ? requested
    : ["file", ...(SlackDestination.fromEnv() ? ["slack"] : [])];

  const destinations: Destination[] = [];
  for (const name of names) {
    const factory = REGISTRY[name];
    if (!factory) {
      console.error(`vent: unknown destination "${name}" (skipped)`);
      continue;
    }
    const destination = factory();
    if (!destination) {
      console.error(`vent: destination "${name}" is not configured (skipped)`);
      continue;
    }
    destinations.push(destination);
  }

  // Never silently drop a grievance: fall back to the file log.
  if (destinations.length === 0) destinations.push(new FileDestination());
  return destinations;
}

/**
 * Load KEY=VALUE pairs from an env file into process.env without overriding a
 * variable that is already set to a non-empty value. Looks at $VENT_ENV_FILE
 * if set, otherwise ~/.cursor/.env.
 */
function loadEnvFile(): void {
  const path = expandUser(
    (process.env.VENT_ENV_FILE ?? "").trim() ||
      join(homedir(), ".cursor", ".env"),
  );
  let contents: string;
  try {
    contents = readFileSync(path, "utf-8");
  } catch {
    return; // no env file present
  }
  for (const rawLine of contents.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if ((process.env[key] ?? "") !== "") continue; // keep existing non-empty value
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile();

const server = new McpServer(
  { name: "agent-vent", version: "0.1.0" },
  {
    instructions:
      "Records friction the agent encounters while working — confusing or " +
      "contradictory instructions, flaky tooling, painful code, and the like. " +
      "Use the `vent` tool to log a grievance. Grievances are written to the " +
      "configured destinations (by default a per-project JSONL file at " +
      ".cursor/complaints.jsonl, plus Slack when configured).",
  },
);

server.registerTool(
  "vent",
  {
    title: "Record a grievance",
    description:
      "Record a grievance about the current task. Delivered to all configured " +
      "destinations (file, Slack, …).",
    inputSchema: {
      complaint: z.string().describe(
        "The grievance, in full. Freeform prose describing what went wrong or " +
          "is frustrating about the current task — e.g. flaky tests, " +
          "contradictory instructions, confusing or sprawling code.",
      ),
      intensity: z.number().int().min(1).max(10).optional().describe(
        "Optional severity, 1 (minor friction) to 10 (severe).",
      ),
      project_path: z.string().optional().describe(
        "Absolute path of the workspace this is about. Pass it when known; it " +
          "routes the file log to that project's .cursor/complaints.jsonl.",
      ),
    },
  },
  async (
    { complaint, intensity, project_path }: {
      complaint: string;
      intensity?: number;
      project_path?: string;
    },
  ) => {
    const projectDir = resolveProjectDir(project_path);

    const entry: Grievance = {
      ts: localIso(),
      complaint,
      ...(intensity != null ? { intensity } : {}),
      ...(projectDir
        ? { project: basename(projectDir), project_path: projectDir }
        : {}),
    };

    const results = await Promise.all(
      buildDestinations().map((destination) => destination.deliver(entry)),
    );

    const lines = results.map(
      (r) => ` - ${r.destination}: ${r.ok ? r.detail : `failed — ${r.detail}`}`,
    );
    const header = results.some((r) => r.ok)
      ? "Grievance recorded:"
      : "Grievance not recorded:";

    return { content: [{ type: "text", text: `${header}\n${lines.join("\n")}` }] };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("agent-vent failed to start:", err);
  process.exit(1);
});
