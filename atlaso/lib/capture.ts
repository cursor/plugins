/** Commodity capture heuristics — NOT the IP.
 *
 * Simple regex/string helpers (a chatter gate, scope router, polarity hint,
 * secret scrub) that decide WHETHER and HOW to send a capture to the server.
 * None of the proprietary engine lives here — that stays on the brain. Ported
 * 1:1 from the Python thin client's `_capture.py` so the bun connector keeps the
 * same capture quality. The server re-scrubs + runs the real worth-keeping gate.
 */
import { createHash } from "node:crypto";

// ── worth-keeping gate ───────────────────────────────────────────────────────
const CHATTER =
  /^(?:ok(?:ay)?|k|thx|thanks?|thank you|ty|yes|yep|yeah|yup|no|nope|sure|cool|nice|great|awesome|perfect|lgtm|got it|continue|go ahead|do it|please do|proceed|run it|run the tests?|next|stop|wait|hmm+|ah|oh|nvm|never ?mind)[\s.!?]*$/i;
// Meta / recall-REQUEST: the user asking the agent to USE its memory, or asking a
// question about themselves — NOT stating a durable fact. These routinely trip a
// SIGNAL keyword ("use your memory", "what do I prefer…?") yet are worthless to keep,
// so they're checked BEFORE signal. Declarative facts ("I always use pnpm") don't
// match — they have no memory-verb + memory-object pairing and aren't interrogative.
const META_RECALL = new RegExp(
  [
    String.raw`\b(?:use|using|check|search|query|consult|look\s*up|pull|fetch)\b[^.?!]{0,40}\bmemor(?:y|ies)\b`, // "use your atlaso memory"
    String.raw`\brecall\b[^.?!]{0,40}\b(?:memor(?:y|ies)|from\s+my|what|which|my)\b`, // "recall from my memory / recall what…"
    String.raw`\bdo you (?:remember|recall|know)\b`, // "do you remember…"
    String.raw`\bwhat(?:'?s| is| are| was| were| do i| did i)\b[^.?!]{0,60}\bmy\b[^.?!]{0,60}\?`, // "what's my favorite …?"
  ].join("|"),
  "i",
);
const SIGNAL =
  /\b(prefer|always|never|don'?t|do not|avoid|use\b|using|i like|we should|should (?:always|never|use)|remember|note that|going with|decided|rule:|important|make sure|ensure|must\b|need to|require|my .+ is\b|the .+ is\b)\b/i;
const MIN_WORDS = 4;

export function shouldDeposit(userText: string): [boolean, string] {
  const t = (userText || "").trim();
  if (!t) return [false, "empty"];
  if (CHATTER.test(t)) return [false, "chatter"];
  // A recall-request / self-question is never a durable fact — drop it before the
  // SIGNAL keywords ("use", "prefer") can rescue it as a false positive.
  if (META_RECALL.test(t)) return [false, "meta_recall"];
  if (SIGNAL.test(t)) return [true, "signal"];
  if (t.split(/\s+/).length < MIN_WORDS) return [false, "too_short"];
  return [true, "substantive"];
}

export function heuristicPolarity(userText: string): string {
  const t = (userText || "").toLowerCase();
  if (/\b(never|don'?t|do not|avoid|stop|doesn'?t work|didn'?t work|fails?|failed|broke|broken|bug|wrong|bad)\b/.test(t))
    return "cautionary";
  if (/\b(prefer|always|use|like|love|want|should|works?|good)\b/.test(t)) return "positive";
  return "open";
}

// ── scope router (personal/global vs project) ────────────────────────────────
const PERSONAL =
  /\b(i (?:prefer|like|love|always|usually|tend to|never|hate|avoid)\b|my (?:favou?rite|preferred|default|usual|go-?to|style|setup|workflow)\b|for all my (?:projects|repos)\b|i'?m a .*?(?:person|developer|engineer)\b)/i;
const EXPLICIT_PROJECT =
  /\b(?:this (?:project|repo|codebase|app|service)|in this (?:repo|project))\b/i;
const PROJECT =
  /(?:\b(?:the (?:server|database|db|api|endpoint|service|build|deploy(?:ment)?|schema)\b|localhost|127\.0\.0\.1|\b\d{1,3}(?:\.\d{1,3}){3}\b)|\/[\w.\-]+\/[\w./\-]+)/i;

export function classifyScope(userText: string): string {
  const t = userText || "";
  // An explicit "this repo/project" phrase wins, but a generic path/API mention
  // must not trap an otherwise clear personal preference in one repository.
  if (EXPLICIT_PROJECT.test(t)) return "project";
  if (PERSONAL.test(t)) return "personal";
  if (PROJECT.test(t)) return "project";
  return "project"; // default: contain locally rather than pollute global
}

export function buildContent(userText: string, asstText: string): string {
  let content = (userText || "").trim();
  const a = (asstText || "").trim();
  if (a) content += `\n\n(assistant: ${a.slice(0, 400)})`;
  return content.trim();
}

/** Content-free fingerprint used to match a stop deposit with a later sessionEnd
 *  fallback. Whitespace normalization tolerates transcript serialization differences
 *  without persisting the user's message in the completion receipt. */
export function messageKey(userMsg: string): string {
  const normalized = (userMsg || "").trim().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/** Deterministic per-turn idempotency key (the deposit's client_id). Derived from the
 *  USER message — the stable identity of a turn — NOT the assembled user+assistant
 *  content. This is load-bearing: `stop` may deposit a user-only turn while a late
 *  `afterAgentResponse` re-stashes user+assistant that a later `sessionEnd` then
 *  deposits. Keying on the assembled content would give those two DIFFERENT keys → a
 *  near-duplicate memory; keying on the user message collapses them to ONE (assistant
 *  text is best-effort enrichment, not identity). Scope + project keep the SAME
 *  statement in a DIFFERENT project distinct (server idempotency window is per
 *  (user, key), ~7 days). */
export function turnKey(userMsg: string, scope: string, project: string | null): string {
  return createHash("sha256")
    .update(`${scope} ${project ?? ""} ${userMsg}`)
    .digest("hex")
    .slice(0, 32);
}

// ── secret scrub (defense-in-depth; the server re-scrubs too) ────────────────
type Rule = { kind: string; re: RegExp };
const PATTERNS: Rule[] = [
  { kind: "private_key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { kind: "openai_anthropic_key", re: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { kind: "github_token", re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { kind: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "google_api_key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "slack_token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: "uri_credential", re: /\b([a-zA-Z][a-zA-Z0-9+.\-]*:\/\/[^\s:/@]*):([^\s/@]+)@/g },
  { kind: "jwt", re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { kind: "bearer", re: /\bbearer\s+[A-Za-z0-9._\-]{16,}/gi },
  {
    // key looks secret-y → redact its value whether unquoted OR quoted (quoted
    // values may contain spaces, e.g. PASSWORD="correct horse battery staple").
    kind: "assignment",
    re: /\b([A-Za-z0-9_]*(?:api[_-]?key|secret|token|password|passwd|pwd|access[_-]?key|client[_-]?secret|auth[_-]?token)[A-Za-z0-9_]*)\s*[:=]\s*(?:"[^"]{2,}"|'[^']{2,}'|[^\s"']{6,})/gi,
  },
];
const BLOB = /\b[A-Za-z0-9+/=_-]{32,}\b/g;
const ENTROPY_THRESHOLD = 4.2;

function entropy(s: string): number {
  if (!s) return 0;
  const n = s.length;
  const counts = new Map<string, number>();
  for (const c of s) counts.set(c, (counts.get(c) || 0) + 1);
  let e = 0;
  for (const c of counts.values()) e -= (c / n) * Math.log2(c / n);
  return e;
}

/** Returns [scrubbed, kindsFound]. */
export function scrub(text: string): [string, string[]] {
  if (!text) return [text, []];
  const found: string[] = [];
  let out = text;
  for (const { kind, re } of PATTERNS) {
    out = out.replace(re, (...args: any[]) => {
      const groups = args.slice(1, -2); // capture groups (drop offset + whole string)
      found.push(kind);
      if (kind === "assignment") return `${groups[0]}=[REDACTED]`; // keep the key name
      if (kind === "uri_credential") return `${groups[0]}:[REDACTED]@`; // keep scheme+user+host
      return `[REDACTED:${kind}]`;
    });
  }
  out = out.replace(BLOB, (tok: string) => {
    if (tok.includes("REDACTED")) return tok;
    if (entropy(tok) >= ENTROPY_THRESHOLD) {
      found.push("high_entropy");
      return "[REDACTED:high_entropy]";
    }
    return tok;
  });
  return [out, found];
}
