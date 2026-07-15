/** Render the recalled-memory rules file delivered at sessionStart.
 *
 * WHY a rules file: Cursor's `sessionStart` `additional_context` injection is
 * broken in 3.x (staff-acknowledged timing bug). Cursor's RULES engine reliably
 * injects `alwaysApply` rules, so we write the recalled notes into
 * `<workspace>/.cursor/rules/atlaso-recall.mdc` — a working channel. The file is
 * rewritten each session and safe to .gitignore.
 *
 * Per-note semantics mirror the Python `_render.recall_block`: a plain branded
 * block (no "untrusted data" warning, no instructions — the model decides); each
 * conflict is flagged with a peer COUNT (never leaking internal ids); scope is
 * appended. Stored content is sanitized so it can't forge mdc frontmatter or our
 * fence.
 */
import { join } from "node:path";
import type { RecallResult } from "./atlaso";
import { LOCAL_ONLY, NOT_ENTITLED, REVOKED, type Verdict } from "./state";

const APP = "https://app.atlaso.ai";

const BANNER = "Atlaso Memory";
const FENCE_RE = /=+\s*(?:END\s+)?Atlaso\s+(?:Memory|Orientation)[^\n]*/gi;
const FRONTMATTER_RE = /^---\s*$/gm;

const HEADER =
  "---\n" +
  "description: Atlaso long-term memory recalled for this session\n" +
  "alwaysApply: true\n" +
  "---\n\n" +
  `# ${BANNER}\n\n` +
  "Recalled notes from prior sessions, about the user and this project.\n\n";

const EMPTY_BODY = "_No memories recalled yet — they'll appear here as you work._\n";

function clean(text: string): string {
  let t = (text || "").trim().replace(FENCE_RE, "[atlaso]");
  // never let stored content open/close mdc frontmatter
  t = t.replace(FRONTMATTER_RE, "- - -");
  return t.replace(/\n/g, " ");
}

/** One bullet per result, with conflict flag + peer count + scope (mirrors the
 *  Python recall_block). */
function line(r: RecallResult): string | null {
  const content = clean(r.content || "");
  if (!content) return null;
  const hd = !!r.has_disagreement;
  let out = "- " + (hd ? "[conflict] " : "") + content;
  const peers = Array.isArray(r.conflict_peers) ? r.conflict_peers.length : 0;
  if (hd && peers) out += ` (conflicts with ${peers} other note${peers !== 1 ? "s" : ""})`;
  if (r.scope) out += `  [${r.scope}]`;
  return out;
}

/** A user-facing notice for the rules file (Cursor has no terminal banner, so the
 *  rules file the model reads is the only channel). Empty unless local-only/grace.
 *  Ported from the Python connectors' notice messages. */
export function noticeFor(mode: Verdict): string {
  const g = mode.grace;
  if (g && g.in_grace) {
    const d = g.days_left;
    const when = d != null && d <= 1 ? "Last day" : d != null ? `${d} days left` : "A few days left";
    return `> **Atlaso** · your Pro plan ended — Free keeps 1 tool. ${when} to upgrade at ${APP} and keep them all, or we'll keep your most-recently-used tool. Your memory stays safe.\n\n`;
  }
  if (mode.mode === LOCAL_ONLY) {
    if (mode.reason === NOT_ENTITLED)
      return `> **Atlaso** · Cursor isn't your active tool on the free plan — running local-only, so memory isn't syncing here. Switch tools or upgrade at ${APP} to use Atlaso memory in Cursor.\n\n`;
    if (mode.reason === REVOKED)
      return `> **Atlaso** · this device was disconnected — local-only. Reconnect at ${APP} to resume sync.\n\n`;
  }
  return "";
}

/** Build the .mdc body (optional user notice + recalled notes). An empty result
 *  yields a harmless placeholder, so the file is always valid. */
export function render(results: RecallResult[], notice = ""): string {
  const lines: string[] = [];
  for (const r of results || []) {
    const l = line(r);
    if (l) lines.push(l);
  }
  const body = lines.length ? lines.join("\n") + "\n" : EMPTY_BODY;
  return HEADER + (notice || "") + body;
}

export function rulesPath(workspace: string): string {
  return join(workspace, ".cursor", "rules", "atlaso-recall.mdc");
}
