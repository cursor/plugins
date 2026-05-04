import { execFileSync } from "node:child_process";
import type { SlackAdapter, SlackMessageRef } from "../adapters/types.ts";
import { type Andon, AndonSchema, type State } from "../schemas.ts";

const ANDON_RAISED_PREFIX = "🚨 ANDON RAISED";
const SLACK_ANDON_RAISED_PREFIX = ":rotating_light: ANDON RAISED";
const ANDON_REASON_REPLY_SCAN_LIMIT = 20;

export type AndonSnapshot =
  | (Andon & { active: true })
  | { active: false; lastCheckedAt: string };

export interface AndonSource {
  snapshot(): Promise<AndonSnapshot>;
}

export class AndonPoller {
  private attentionLogged = false;
  private cacheAttentionLogged = false;
  clearedDuringLoop = false;

  constructor(
    private readonly args: {
      source?: AndonSource;
      getState: () => State;
      saveState: (reason?: string) => void;
      logAttention: (line: string) => void;
      pollSource: boolean;
      cachedState?: {
        workspace: string;
        ref: string;
        path: string;
      };
    }
  ) {}

  async drainEvents(): Promise<void> {
    if (!this.args.pollSource) {
      this.syncFromCachedState();
      return;
    }
    if (!this.args.source) return;
    const state = this.args.getState();
    const before = JSON.stringify(state.andon ?? null);
    try {
      const next = await this.args.source.snapshot();
      let syncReason: string | undefined;
      if (next.active) {
        const { active: _active, ...nextAndon } = next;
        if (!isAndonActive(state.andon)) {
          state.andon = {
            ...nextAndon,
            reason: truncateAndonBody(nextAndon.reason ?? ""),
            cleared: false,
          };
          syncReason = "andon state changed";
          this.clearedDuringLoop = false;
        } else {
          // Keep state.json fresh so operators can see the root is still polling.
          const reasonChanged =
            nextAndon.reason !== undefined &&
            nextAndon.reason !== state.andon.reason;
          state.andon = {
            ...state.andon,
            reason:
              nextAndon.reason !== undefined
                ? truncateAndonBody(nextAndon.reason)
                : state.andon.reason,
            lastCheckedAt: nextAndon.lastCheckedAt,
          };
          if (reasonChanged) syncReason = "andon state changed";
        }
      } else if (state.andon) {
        if (isAndonActive(state.andon)) {
          state.andon = {
            ...state.andon,
            cleared: true,
            clearedAt: next.lastCheckedAt,
            lastCheckedAt: next.lastCheckedAt,
          };
          syncReason = "andon state changed";
          this.clearedDuringLoop = true;
        } else {
          state.andon = {
            ...state.andon,
            lastCheckedAt: next.lastCheckedAt,
          };
        }
      }
      if (JSON.stringify(state.andon ?? null) !== before) {
        this.attentionLogged = false;
        this.args.saveState(syncReason);
      }
    } catch (err) {
      this.args.logAttention(
        `andon source check failed: ${truncate(errorMessage(err), 200)}`
      );
    }
  }

  isActive(): boolean {
    return isAndonActive(this.args.getState().andon);
  }

  noteSpawnPaused(): void {
    if (this.attentionLogged) return;
    this.args.logAttention("andon raised; new spawns paused");
    this.attentionLogged = true;
  }

  private syncFromCachedState(): void {
    const cachedState = this.args.cachedState;
    if (!cachedState) return;
    try {
      execFileSync(
        "git",
        [
          "-C",
          cachedState.workspace,
          "fetch",
          "origin",
          cachedState.ref,
          "--quiet",
        ],
        {
          stdio: "pipe",
        }
      );
      const raw = execFileSync(
        "git",
        ["-C", cachedState.workspace, "show", `FETCH_HEAD:${cachedState.path}`],
        {
          encoding: "utf8",
          stdio: "pipe",
        }
      );
      const parsed = JSON.parse(raw) as Partial<State>;
      const nextAndon = isValidAndon(parsed.andon) ? parsed.andon : undefined;
      const state = this.args.getState();
      const before = JSON.stringify(state.andon ?? null);
      if (nextAndon) state.andon = nextAndon;
      else delete state.andon;
      if (JSON.stringify(state.andon ?? null) !== before) {
        this.args.saveState();
        this.cacheAttentionLogged = false;
      }
    } catch (err) {
      if (this.cacheAttentionLogged) return;
      this.args.logAttention(
        `andon cache sync failed: ${truncate(errorMessage(err), 200)}`
      );
      this.cacheAttentionLogged = true;
    }
  }
}

export class SlackReactionAndonSource implements AndonSource {
  constructor(
    private readonly slack: SlackAdapter,
    private readonly ref: SlackMessageRef
  ) {}

  async snapshot(): Promise<AndonSnapshot> {
    const { reactions } = await this.slack.getReactions(this.ref);
    const now = new Date().toISOString();
    const raised = reactions.find(
      reaction => reaction.name === "rotating_light"
    );
    if (!raised) return { active: false, lastCheckedAt: now };
    return {
      active: true,
      raisedAt: now,
      raisedBy: raised.users[0],
      lastCheckedAt: now,
      reason: await this.latestRaisedReasonOrUndefined(),
    };
  }

  private async latestRaisedReasonOrUndefined(): Promise<string | undefined> {
    try {
      return await this.latestRaisedReason();
    } catch {
      return undefined;
    }
  }

  private async latestRaisedReason(): Promise<string | undefined> {
    const page = await this.slack.getThreadReplies({
      ...this.ref,
      limit: ANDON_REASON_REPLY_SCAN_LIMIT,
      latest: String(Date.now() / 1000),
    });
    const recentReplies = page.messages
      .filter(message => message.ts !== this.ref.ts)
      .sort((a, b) => compareSlackTsDesc(a.ts, b.ts))
      .slice(0, ANDON_REASON_REPLY_SCAN_LIMIT);
    for (const message of recentReplies) {
      const reason = parseRaisedReason(message.text);
      if (reason !== undefined) return reason;
    }
    return undefined;
  }
}

function truncateAndonBody(s: string): string {
  return s.length > 500 ? s.slice(0, 500) : s;
}

function parseRaisedReason(text: string): string | undefined {
  const prefix = [ANDON_RAISED_PREFIX, SLACK_ANDON_RAISED_PREFIX].find(
    candidate => text.startsWith(candidate)
  );
  if (!prefix) {
    return undefined;
  }
  const reasonStart = text.indexOf(": ", prefix.length);
  if (reasonStart === -1) return undefined;
  // Reason lives on the first line of the message. The CLI appends an
  // observability footer (`<https://...|view>`) on its own line; keep it out
  // of the parsed reason so it never bleeds into state.json.
  return (
    text
      .slice(reasonStart + 2)
      .split("\n")[0]
      ?.trim() || undefined
  );
}

function compareSlackTsDesc(a: string, b: string): number {
  return Number(b) - Number(a);
}

export function isAndonActive(
  andon: Andon | undefined
): andon is Andon & { raisedAt: string } {
  return Boolean(andon?.raisedAt && !andon.cleared);
}

function isValidAndon(value: unknown): value is Andon {
  // Cached state JSON is git-fetched and partially untrusted, so validate via
  // the strict schema rather than handrolling field checks.
  return AndonSchema.safeParse(value).success;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
