/** Pull the last user/assistant exchange for capture.
 *
 * Primary source = the documented hook payload fields:
 *   • afterAgentResponse → `text`   (assistant final message)
 *   • beforeSubmitPrompt → `prompt` (the user's prompt; `user_message` tolerated)
 * Fallback = the `transcript_path` file (a common field on `stop`). Its on-disk
 * FORMAT is undocumented, so we parse defensively (JSONL of role/content, then a
 * single JSON doc with a messages array) and NEVER depend on it. Best-effort,
 * never throws — a missing/unparseable file just yields ('', '').
 */
import { readFileSync } from "node:fs";

function flatten(content: unknown): string {
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const el of content) {
      if (el && typeof el === "object") {
        const o = el as Record<string, unknown>;
        if (o.type === undefined || o.type === "text") {
          const t = o.text ?? o.content;
          if (typeof t === "string") parts.push(t);
        }
      } else if (typeof el === "string") {
        parts.push(el);
      }
    }
    return parts.filter(Boolean).join(" ").trim();
  }
  if (typeof content === "string") return content.trim();
  return "";
}

function role(obj: Record<string, unknown>): "user" | "assistant" | null {
  const raw = obj.role ?? obj.type ?? obj.author;
  if (typeof raw !== "string") return null;
  const r = raw.toLowerCase();
  if (r === "user" || r === "human") return "user";
  if (r === "assistant" || r === "ai" || r === "model") return "assistant";
  return null;
}

function msgText(obj: Record<string, unknown>): string {
  for (const key of ["content", "message", "text"]) {
    let val: unknown = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const o = val as Record<string, unknown>;
      val = o.content ?? o.text;
    }
    const flat = flatten(val);
    if (flat) return flat;
  }
  return "";
}

function collect(records: unknown[], out: Array<[string, string]>): void {
  for (const obj of records) {
    if (!obj || typeof obj !== "object") continue;
    const r = role(obj as Record<string, unknown>);
    if (r === null) continue;
    const text = msgText(obj as Record<string, unknown>);
    if (text) out.push([r, text]);
  }
}

/** Best-effort [last_user_text, assistant_reply] from a transcript file. */
export function lastExchangeFromFile(path: string): [string, string] {
  if (!path) return ["", ""];
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return ["", ""];
  }

  const msgs: Array<[string, string]> = [];

  // 1) JSONL — one record per line (the common shape)
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      collect([JSON.parse(s)], msgs);
    } catch {
      /* skip non-JSON lines */
    }
  }

  // 2) Fallback — a single JSON document with a messages array
  if (!msgs.length) {
    let doc: unknown = null;
    try {
      doc = JSON.parse(raw);
    } catch {
      doc = null;
    }
    let records: unknown[] | null = null;
    if (Array.isArray(doc)) {
      records = doc;
    } else if (doc && typeof doc === "object") {
      for (const key of ["messages", "transcript", "turns", "history"]) {
        const v = (doc as Record<string, unknown>)[key];
        if (Array.isArray(v)) {
          records = v;
          break;
        }
      }
    }
    if (records) collect(records, msgs);
  }

  if (!msgs.length) return ["", ""];

  let lastUserIdx = -1;
  for (let i = 0; i < msgs.length; i++) if (msgs[i][0] === "user") lastUserIdx = i;
  if (lastUserIdx === -1) return ["", ""];

  const lastUser = msgs[lastUserIdx][1];
  let asst = "";
  for (let i = lastUserIdx + 1; i < msgs.length; i++) {
    if (msgs[i][0] === "assistant") asst = msgs[i][1];
  }
  return [lastUser, asst];
}

/** Documented fallback: pull user/assistant text straight from the hook payload. */
export function exchangeFromPayload(payload: Record<string, any>): [string, string] {
  const asst = (payload?.text || "").trim();
  const user = (payload?.prompt || payload?.user_message || "").trim();
  return [user, asst];
}
