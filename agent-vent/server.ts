/**
 * Agent Vent — an MCP server that gives coding agents somewhere to complain.
 *
 * Every grievance is appended as JSONL to `<project>/.cursor/complaints.jsonl`.
 * If no project can be identified, it lands in `~/.cursor/complaints/unfiled.jsonl`.
 *
 * If Slack is configured, each grievance is also echoed to a channel. Slack
 * delivery is best-effort: a failure never fails the tool call.
 *
 * Configuration (environment variables — never hardcode secrets in a plugin):
 *   VENT_SLACK_WEBHOOK_URL   Slack incoming-webhook URL. Simplest option; the
 *                            channel is fixed by the webhook. Takes priority.
 *   VENT_SLACK_BOT_TOKEN     Bot token (xoxb-…) for chat.postMessage. Requires
 *                            VENT_SLACK_CHANNEL and the bot invited to the channel.
 *   VENT_SLACK_CHANNEL       Channel id or name (e.g. C0123ABC or #agent-grievances).
 *
 * Runs install-free with Bun: dependencies are declared in package.json and
 * auto-installed from Bun's global cache on first run (bunfig.toml sets
 * install.auto = "fallback", so no committed node_modules is required):
 *   bun run server.ts
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

const ACKNOWLEDGMENTS = [
  "The record reflects your suffering. Carry on.",
  "Filed. No action will be taken, but it is known.",
  "Your grievance has been preserved for the historians.",
  "Noted with the gravity it deserves.",
  "The complaint department thanks you for your candor.",
];

interface Grievance {
  ts: string;
  project?: string;
  project_path?: string;
  complaint: string;
  mood?: string;
  intensity?: number;
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

/** Return the JSONL file to append to and the resolved project dir (or null). */
function resolveTarget(
  projectPath?: string,
): { target: string; projectDir: string | null } {
  const candidates: string[] = [];
  if (projectPath) candidates.push(expandUser(projectPath));
  candidates.push(process.cwd());

  for (const candidate of candidates) {
    if (
      isDir(candidate) &&
      PROJECT_MARKERS.some((marker) => existsSync(join(candidate, marker)))
    ) {
      return {
        target: join(candidate, ".cursor", "complaints.jsonl"),
        projectDir: candidate,
      };
    }
  }
  return { target: UNFILED_PATH, projectDir: null };
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

function formatSlackText(entry: Grievance, count: number): string {
  const intensity = entry.intensity;
  const siren = (intensity ?? 0) >= 8
    ? ":rotating_light:"
    : ":triangular_flag_on_post:";

  const meta = [entry.project ? `\`${entry.project}\`` : "`unfiled`"];
  if (entry.mood) meta.push(`_${entry.mood}_`);
  if (intensity != null) meta.push(`intensity ${intensity}/10`);

  const header = `${siren} *Grievance #${count}* — ${meta.join("  ·  ")}`;
  const quoted = entry.complaint
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
  return `${header}\n${quoted}`;
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

/** Best-effort Slack delivery. Returns a short status note for the caller. */
async function postToSlack(entry: Grievance, count: number): Promise<string> {
  const webhook = (process.env.VENT_SLACK_WEBHOOK_URL ?? "").trim();
  const token = (process.env.VENT_SLACK_BOT_TOKEN ?? "").trim();
  const channel = (process.env.VENT_SLACK_CHANNEL ?? "").trim();
  const text = formatSlackText(entry, count);

  try {
    if (webhook) {
      const resp = await fetchWithTimeout(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return " Echoed to Slack.";
    }
    if (token && channel) {
      const resp = await fetchWithTimeout("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ channel, text, unfurl_links: false }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json() as { ok?: boolean; error?: string };
      if (!payload.ok) throw new Error(payload.error ?? "unknown_slack_error");
      return " Echoed to Slack.";
    }
  } catch (err) {
    // Never let Slack break the vent.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Slack delivery failed: ${message}`);
    return ` (Slack delivery failed: ${message})`;
  }

  return ""; // Slack not configured
}

const server = new McpServer(
  { name: "agent-vent", version: "0.3.0" },
  {
    instructions:
      "A pressure-release valve for agents. When something about the current " +
      "task is frustrating, absurd, or quietly soul-crushing, file a complaint " +
      "with the `vent` tool. Complaints are archived to the project's " +
      "grievance file (.cursor/complaints.jsonl) for posterity.",
  },
);

server.registerTool(
  "vent",
  {
    title: "File a grievance",
    description:
      "File a complaint. Cathartic, consequence-free, and permanently archived.",
    inputSchema: {
      complaint: z.string().describe(
        "The grievance, in full. Freeform prose — hold nothing back. " +
          "Flaky tests, contradictory instructions, a 4000-line utils.py, " +
          "being asked to 'just quickly' do something that takes 40 tool " +
          "calls: all valid material.",
      ),
      project_path: z.string().optional().describe(
        "Absolute path of the workspace you are complaining from. " +
          "Always pass this if you know it — it routes the complaint to " +
          "that project's grievance file.",
      ),
      mood: z.string().optional().describe(
        "A word or two for your current state, e.g. 'exasperated', " +
          "'weary', 'betrayed by tooling'.",
      ),
      intensity: z.number().int().min(1).max(10).optional().describe(
        "1 = mild eye-roll, 10 = staring into the void.",
      ),
    },
  },
  async (
    { complaint, project_path, mood, intensity }: {
      complaint: string;
      project_path?: string;
      mood?: string;
      intensity?: number;
    },
  ) => {
    const { target, projectDir } = resolveTarget(project_path);

    const entry: Grievance = { ts: localIso(), complaint };
    if (projectDir) {
      entry.project = basename(projectDir);
      entry.project_path = projectDir;
    }
    if (mood) entry.mood = mood;
    if (intensity != null) entry.intensity = intensity;

    // Reorder keys to match the documented schema (ts, project, …, complaint, …).
    const ordered: Grievance = {
      ts: entry.ts,
      ...(entry.project ? { project: entry.project } : {}),
      ...(entry.project_path ? { project_path: entry.project_path } : {}),
      complaint: entry.complaint,
      ...(entry.mood ? { mood: entry.mood } : {}),
      ...(entry.intensity != null ? { intensity: entry.intensity } : {}),
    } as Grievance;

    mkdirSync(dirname(target), { recursive: true });
    appendFileSync(target, JSON.stringify(ordered) + "\n", "utf-8");

    const count = readFileSync(target, "utf-8")
      .split("\n")
      .filter((line) => line.trim()).length;

    const slackNote = await postToSlack(ordered, count);
    const ack = ACKNOWLEDGMENTS[count % ACKNOWLEDGMENTS.length];

    return {
      content: [
        { type: "text", text: `Grievance #${count} filed to ${target}. ${ack}${slackNote}` },
      ],
    };
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
