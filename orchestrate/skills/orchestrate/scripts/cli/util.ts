import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { userInfo } from "node:os";
import { join, resolve } from "node:path";

import { createSlackAdapter } from "../adapters/index.ts";
import type { CommentCriticality, SlackAdapter } from "../adapters/types.ts";
import { AgentManager, type RespawnSource } from "../core/agent-manager.ts";
import type { CommentDestinations } from "../core/comment-retry-queue.ts";
import { renderPromptTemplate } from "../core/prompts.ts";
import { PlanValidationError } from "../errors.ts";
import {
  type PlanTask,
  parsePlanJson,
  parseTreeStateJson,
  type TaskState,
  type TreeTask,
} from "../schemas.ts";

export interface CommentOptions {
  workspace?: string;
}

const OPERATOR_MODE_FLAG = ".orchestrate/operator-mode";

export interface SpawnOptions {
  file?: string;
  name?: string;
  type?: string;
  goal?: string;
  pathsAllowed?: string[];
  pathsForbidden?: string[];
  acceptance?: string[];
  startingRef?: string;
  dependsOn?: string[];
  model?: string;
  wait?: boolean;
}

const SLACK_CHANNEL_REQUIRED_MESSAGE =
  "set --slack-channel or SLACK_CHANNEL_ID, or unset SLACK_BOT_TOKEN to disable Slack";

export interface TreeVictim {
  taskName: string;
  agentId: string;
  runId: string;
  branch: string;
  parentAgentId: string | null;
}

export function crawlBranch(
  {
    repoPath,
    branch,
    slug,
  }: { repoPath: string; branch: string; slug: string },
  depth: number,
  out: string[],
  visited: Set<string>
): void {
  const key = `${branch}:${slug}`;
  if (visited.has(key)) {
    out.push(`${indent(depth)}(cycle detected: ${key})`);
    return;
  }
  visited.add(key);
  const path = `.orchestrate/${slug}/state.json`;
  let raw: string;
  try {
    raw = execFileSync(
      "git",
      ["-C", repoPath, "show", `origin/${branch}:${path}`],
      {
        stdio: ["ignore", "pipe", "pipe"],
      }
    ).toString();
  } catch {
    out.push(
      `${indent(depth)}${branch}:${path} (not found — planner hasn't committed state yet)`
    );
    return;
  }
  let state: TreeTask[] | null = null;
  let ownSlug = slug;
  try {
    const parsed = parseTreeStateJson(raw, `${branch}:${path}`);
    state = parsed.tasks;
    ownSlug = parsed.rootSlug ?? slug;
  } catch (err) {
    out.push(
      `${indent(depth)}${branch}:${path} (parse failed: ${errorMessage(err)})`
    );
    return;
  }
  out.push(
    `${indent(depth)}${ownSlug}/  (${state?.length ?? 0} tasks, on ${branch})`
  );
  for (const t of state ?? []) {
    const lineage = t.parentAgentId ? ` parent=${t.parentAgentId}` : "";
    out.push(
      `${indent(depth + 1)}${t.name.padEnd(28)} ${t.type.padEnd(11)} ${t.status.padEnd(11)} ${t.agentId ?? ""}${lineage}`
    );
    if (
      t.type === "subplanner" &&
      (t.status === "running" || t.status === "handed-off")
    ) {
      // `ownSlug` (from loaded state.json) is authoritative over the param.
      crawlBranch(
        { repoPath, branch: `orch/${ownSlug}/${t.name}`, slug: t.name },
        depth + 1,
        out,
        visited
      );
    }
  }
}

export function indent(depth: number): string {
  return "  ".repeat(depth);
}

/**
 * Walk the tree the same way `crawl` does and collect every `running` task's
 * (agentId, runId). Reads only the fields needed for containment so unrelated
 * child state errors do not hide deeper agents from `kill-tree`.
 */
export function collectRunningAgentsInTree(
  {
    repoPath,
    branch,
    slug,
  }: { repoPath: string; branch: string; slug: string },
  collected: TreeVictim[] = [],
  visited: Set<string> = new Set()
): TreeVictim[] {
  const key = `${branch}:${slug}`;
  if (visited.has(key)) return collected;
  visited.add(key);
  let raw: string;
  try {
    raw = execFileSync(
      "git",
      [
        "-C",
        repoPath,
        "show",
        `origin/${branch}:.orchestrate/${slug}/state.json`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    ).toString();
  } catch {
    return collected;
  }
  let parsed: ReturnType<typeof parseTreeStateJson>;
  try {
    parsed = parseTreeStateJson(
      raw,
      `origin/${branch}:.orchestrate/${slug}/state.json`
    );
  } catch {
    return collected;
  }
  const ownSlug = parsed.rootSlug ?? slug;
  for (const t of parsed.tasks) {
    if (t.status === "running" && t.agentId && t.runId) {
      collected.push({
        taskName: t.name,
        agentId: t.agentId,
        runId: t.runId,
        branch,
        parentAgentId: t.parentAgentId ?? null,
      });
    }
    if (t.type === "subplanner" && t.status === "running") {
      collectRunningAgentsInTree(
        { repoPath, branch: `orch/${ownSlug}/${t.name}`, slug: t.name },
        collected,
        visited
      );
    }
  }
  return collected;
}

export function filterVictimsToSubtree(
  victims: TreeVictim[],
  rootAgentId: string | null
): TreeVictim[] {
  if (!rootAgentId) return victims;
  const childrenByParent = new Map<string, TreeVictim[]>();
  for (const v of victims) {
    if (!v.parentAgentId) continue;
    const list = childrenByParent.get(v.parentAgentId) ?? [];
    list.push(v);
    childrenByParent.set(v.parentAgentId, list);
  }
  const out: TreeVictim[] = [];
  const seen = new Set<string>();
  const visit = (agentId: string): void => {
    if (seen.has(agentId)) return;
    seen.add(agentId);
    const directHit = victims.find(v => v.agentId === agentId);
    if (directHit) out.push(directHit);
    for (const child of childrenByParent.get(agentId) ?? []) {
      visit(child.agentId);
    }
  };
  visit(rootAgentId);
  return out;
}

export function buildInlineTask(opts: SpawnOptions): PlanTask {
  if (!opts.name) bail("--file or --name required");
  if (!opts.type) bail("--type required (worker|subplanner)");
  if (!opts.goal) bail("--goal required (or pass --file)");
  const taskBase = {
    name: opts.name,
    scopedGoal: opts.goal,
    pathsAllowed: opts.pathsAllowed,
    pathsForbidden: opts.pathsForbidden,
    acceptance: opts.acceptance,
    startingRef: opts.startingRef,
    dependsOn: opts.dependsOn,
    model: opts.model,
  };
  switch (opts.type) {
    case "worker":
      return { ...taskBase, type: "worker" };
    case "subplanner":
      return { ...taskBase, type: "subplanner" };
    default:
      bail(`--type must be worker or subplanner, got ${opts.type}`);
  }
}

export function transitivelyDependsOn(
  tasks: TaskState[],
  opts: { task: string; ancestor: string }
): boolean {
  const seen = new Set<string>();
  const walk = (name: string): boolean => {
    if (seen.has(name)) return false;
    seen.add(name);
    const t = tasks.find(x => x.name === name);
    if (!t) return false;
    if (t.dependsOn.includes(opts.ancestor)) return true;
    return t.dependsOn.some(dep => walk(dep));
  };
  return walk(opts.task);
}

export function collectCascadeVictims(
  mgr: AgentManager,
  rootName: string
): TaskState[] {
  const start = mgr.getTask(rootName);
  if (!start) return [];
  const out: TaskState[] = [start];
  const seen = new Set([rootName]);
  const frontier = [rootName];
  while (frontier.length > 0) {
    const cur = frontier.shift();
    if (cur === undefined) break;
    for (const t of mgr.tasks) {
      if (seen.has(t.name)) continue;
      if (!t.dependsOn.includes(cur)) continue;
      if (t.status !== "pending" && t.status !== "running") continue;
      seen.add(t.name);
      frontier.push(t.name);
      out.push(t);
    }
  }
  return out;
}

export function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function resolveTaskBody(parts: string[]): string {
  if (parts.length === 1 && parts[0] === "-") {
    return readFileSync(0, "utf8");
  }
  return parts.join(" ");
}

export function parseRespawnSourceOrBail(value: string): RespawnSource {
  switch (value) {
    case "local-cli":
    case "self-planner":
    case "script-auto-retry":
      return value;
    default:
      throw new PlanValidationError(
        `--source must be local-cli, self-planner, or script-auto-retry (got ${value})`
      );
  }
}

export function parseCommentCriticalityOrBail(
  value: string
): CommentCriticality {
  switch (value) {
    case "best_effort":
    case "required":
      return value;
    default:
      throw new PlanValidationError(
        `--criticality must be best_effort or required (got ${value})`
      );
  }
}

export function parsePositiveIntegerOrBail(args: {
  value: string;
  flag: string;
}): number {
  if (!/^[1-9]\d*$/.test(args.value.trim())) {
    throw new PlanValidationError(`${args.flag} must be a positive integer`);
  }
  const parsed = Number.parseInt(args.value, 10);
  return parsed;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function errorStackOrMessage(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  return String(err);
}

export function buildKickoffPrompt(args: {
  goal: string;
  agentId: string;
  dispatcherFirstName?: string;
  slackChannel?: string;
}): string {
  return renderPromptTemplate("root", {
    goal: args.goal,
    agentId: args.agentId,
    dispatcherInstruction: dispatcherInstruction(args.dispatcherFirstName),
    slackChannelInstruction: slackChannelInstruction(args.slackChannel),
    loopHygiene: renderPromptTemplate("loop-hygiene", { rootFlag: " --root" }),
  });
}

function dispatcherInstruction(firstName: string | undefined): string {
  const raw = firstName?.trim();
  if (!raw) return "";
  // Slack first_name is operator-controlled but not vetted. Strip every
  // interpolation hazard once so a `"`, backtick, backslash, or `{{...}}`
  // can't malform the prompt, crash renderPromptTemplate's leftover-
  // placeholder check, or break the JSON literal the planner copies into
  // plan.json. JSON.stringify handles `"` and `\`; the regex covers
  // newlines, backticks, and curly braces.
  const safe = raw.replace(/[\r\n`{}]/g, " ");
  const safeJson = JSON.stringify(safe);
  // Leading newline slots this between the summary instruction and the
  // bootstrapping paragraph in the rendered kickoff prompt.
  return `\n\nOperator: ${safe}. Set \`plan.dispatcher = { firstName: ${safeJson} }\` so the kickoff bot reads ${JSON.stringify(`${safe}'s bot`)}.`;
}

function slackChannelInstruction(slackChannel: string | undefined): string {
  if (!slackChannel) return "";
  return `\n\nSet \`plan.slackChannel = ${JSON.stringify(slackChannel)}\` in plan.json. Subplanners inherit this value.`;
}

// Agent name cap on the server is 100 chars. First-line-only so
// multi-paragraph goals don't surface their boilerplate preamble.
export function buildKickoffAgentName(goal: string): string {
  const firstLine = goal.split("\n")[0]?.trim() ?? "";
  const excerpt = firstLine.slice(0, 100).trim();
  return excerpt || "root planner";
}

export function resolveKickoffRepoUrl(repo: string | undefined): string {
  if (repo) return repo;
  const originUrl = execFileSync(
    "git",
    ["config", "--get", "remote.origin.url"],
    {
      stdio: ["ignore", "pipe", "pipe"],
    }
  )
    .toString()
    .trim();
  if (!originUrl) {
    throw new Error("git remote.origin.url not set");
  }
  return normalizeKickoffRepoUrl(originUrl);
}

export function normalizeKickoffRepoUrl(url: string): string {
  const trimmed = url.trim();
  const scpPrefix = "git@github.com:";
  if (trimmed.startsWith(scpPrefix)) {
    return stripGitSuffix(
      `https://github.com/${trimmed.slice(scpPrefix.length)}`
    );
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === "ssh:" &&
      parsed.username === "git" &&
      parsed.hostname === "github.com"
    ) {
      return stripGitSuffix(`https://github.com${parsed.pathname}`);
    }
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      parsed.username = "";
      parsed.password = "";
      parsed.search = "";
      parsed.hash = "";
      return stripGitSuffix(parsed.toString());
    }
  } catch {
    return stripGitSuffix(trimmed);
  }

  return stripGitSuffix(trimmed);
}

export function stripGitSuffix(url: string): string {
  return url.endsWith(".git") ? url.slice(0, -4) : url;
}

export function loadCommentDestinations(channelId: string): CommentDestinations {
  return { slack: createSlackAdapter(channelId) };
}

export function resolveSlackChannelOption(
  explicit: string | undefined
): string | undefined {
  const flag = explicit?.trim();
  if (flag) return flag;
  const env = process.env.SLACK_CHANNEL_ID?.trim();
  return env || undefined;
}

export function resolveKickoffSlackChannelOrBail(
  explicit: string | undefined
): string | undefined {
  const channel = resolveSlackChannelOption(explicit);
  requireSlackChannelIfTokenSet(channel);
  return channel;
}

export function resolveWorkspaceSlackChannelOrBail(args: {
  workspace: string;
  explicit?: string;
}): string | undefined {
  const fromOption = resolveSlackChannelOption(args.explicit);
  if (fromOption) return fromOption;
  const planPath = join(resolve(args.workspace), "plan.json");
  if (!existsSync(planPath)) {
    requireSlackChannelIfTokenSet(undefined);
    return undefined;
  }
  const plan = parsePlanJson(readFileSync(planPath, "utf8"), planPath);
  const channel = plan.slackChannel ?? plan.slackKickoffRef?.channel;
  requireSlackChannelIfTokenSet(channel);
  return channel;
}

function requireSlackChannelIfTokenSet(channel: string | undefined): void {
  if (process.env.SLACK_BOT_TOKEN && !channel) {
    throw new PlanValidationError(SLACK_CHANNEL_REQUIRED_MESSAGE);
  }
}

export function operatorModeFlagPath(
  home: string = userInfo().homedir
): string {
  return join(home, OPERATOR_MODE_FLAG);
}

export function operatorModeHint(): string {
  return `create ${operatorModeFlagPath()} owned by your user with chmod 600`;
}

/**
 * Workers control argv/env/cwd and can point --workspace at a forged plan.json.
 * Operator mode therefore uses an OS-home flag outside the workspace/env
 * surface. If workers can write that home directory, use a stronger boundary.
 */
export function isOperatorModeEnabled(
  flagPath: string = operatorModeFlagPath()
): boolean {
  if (typeof process.getuid !== "function") return false;
  try {
    const stat = lstatSync(flagPath);
    return (
      stat.isFile() &&
      stat.uid === process.getuid() &&
      (stat.mode & 0o777) === 0o600
    );
  } catch {
    return false;
  }
}

export function assertOperatorModeOrBail(
  action: string,
  flagPath?: string
): void {
  if (isOperatorModeEnabled(flagPath)) return;
  throw new PlanValidationError(
    `${action} is operator-only; ${operatorModeHint()}. Environment variables are ignored for this boundary.`
  );
}

/**
 * Returns the run thread so comments cannot target another channel, sibling
 * thread, or the channel root. Missing workspace state fails closed unless the
 * operator-mode home flag is present.
 */
export function loadAllowedSlackThreadOrBail(
  workspace: string | undefined
): { channel: string; threadTs: string } | undefined {
  if (isOperatorModeEnabled()) return undefined;
  if (!workspace) {
    throw new PlanValidationError(
      "comment requires --workspace so the bot stays in the run thread; " +
        `${operatorModeHint()} to post from outside an orchestrate run.`
    );
  }
  const planPath = join(resolve(workspace), "plan.json");
  if (!existsSync(planPath)) {
    throw new PlanValidationError(
      `comment --workspace ${workspace} has no plan.json; ` +
        `${operatorModeHint()} to post from outside an orchestrate run.`
    );
  }
  const plan = parsePlanJson(readFileSync(planPath, "utf8"), planPath);
  const ref = plan.slackKickoffRef;
  if (!ref?.channel || !ref?.ts) {
    throw new PlanValidationError(
      `${planPath} has no slackKickoffRef; run the workspace once so Slack visibility is initialized, ` +
        `or ${operatorModeHint()} to post outside the run.`
    );
  }
  return { channel: ref.channel, threadTs: ref.ts };
}

export function loadAndonTargetOrBail(opts: { workspace?: string }): {
  slack: SlackAdapter;
  ref: { channel: string; ts: string };
} {
  if (!opts.workspace) {
    throw new PlanValidationError("pass --workspace");
  }
  const planPath = join(resolve(opts.workspace), "plan.json");
  const plan = parsePlanJson(readFileSync(planPath, "utf8"), planPath);
  if (!plan.slackKickoffRef) {
    throw new PlanValidationError(
      `${planPath} has no slackKickoffRef; run the workspace once so Slack visibility is initialized`
    );
  }
  const slack = createSlackAdapter(plan.slackKickoffRef.channel);
  if (!slack) {
    throw new PlanValidationError(
      "set SLACK_BOT_TOKEN before running andon commands"
    );
  }
  return { slack, ref: plan.slackKickoffRef };
}

export async function loadOrBail(
  workspace: string,
  opts: { slackChannel?: string } = {}
): Promise<AgentManager> {
  try {
    return await AgentManager.load(workspace, opts);
  } catch (err) {
    if (err instanceof PlanValidationError) {
      console.error(err.message);
      process.exit(2);
    }
    console.error(errorStackOrMessage(err));
    process.exit(2);
  }
}

export function bail(msg: string): never {
  console.error(msg);
  process.exit(2);
}

export function firstChars(s: string | undefined, n: number): string {
  return (s ?? "").slice(0, n);
}
