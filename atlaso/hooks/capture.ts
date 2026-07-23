#!/usr/bin/env bun
/**
 * capture hook — save the just-finished exchange. Event-routed, because no single
 * Cursor hook payload carries a whole turn (see lib/pending.ts):
 *   • beforeSubmitPrompt → stash the USER prompt (the confirmed source of user text)
 *   • afterAgentResponse → stash the ASSISTANT reply (best-effort enrichment)
 *   • stop / sessionEnd  → assemble the stash (+ payload/transcript fallback), run
 *                          the worth-keeping gate ON THE USER MESSAGE, SCRUB secrets
 *                          client-side, tag scope + project, and deposit with a
 *                          content-derived client_id so stop + sessionEnd of the same
 *                          turn DEDUPE server-side.
 * ZERO model involvement. Online-first: with no token / not cloud-linked we skip.
 * Never breaks the session (always exits 0).
 */
import { deposit, loadAuth, type DepositItem } from "../lib/atlaso";
import { buildContent, classifyScope, heuristicPolarity, scrub, shouldDeposit, turnKey } from "../lib/capture";
import { resolveCredential } from "../lib/credential";
import { online } from "../lib/entitlement";
import { log } from "../lib/log";
import { stashPrompt, stashResponse, takePending } from "../lib/pending";
import { projectKey, workspaceRoot } from "../lib/project";
import { parsePayload, readStdin } from "../lib/stdin";
import { exchangeFromPayload, lastExchangeFromFile } from "../lib/transcript";

const TOOL = "cursor";

const convId = (payload: Record<string, any>): string =>
  String(payload?.conversation_id || payload?.conversationId || "default");

/** The stop/sessionEnd path: assemble the turn and deposit it. */
async function depositTurn(payload: Record<string, any>, event: string): Promise<void> {
  // Keep the prompt-time workspace through stop. If Cursor later fires sessionEnd
  // for the same turn, it reuses this stash and produces the same client_id; the
  // sessionEnd path then removes it. A new prompt also replaces the retained stash.
  const pending = takePending(convId(payload), { retain: event === "stop" });

  // Prefer the stash (assembled across the turn); fall back to the payload's own
  // fields, then the transcript file — a Cursor build whose stop payload DOES carry
  // content, or a differently-wired session, still works.
  let user = pending?.user || "";
  let asst = pending?.asst || "";
  if (!user && !asst) [user, asst] = exchangeFromPayload(payload);
  if (!user && !asst) [user, asst] = lastExchangeFromFile(payload.transcript_path || "");

  // worth-keeping gate on the USER message only (matches the Python client).
  if (!shouldDeposit(user)[0]) {
    log("capture", "skip (gate)");
    return;
  }

  const auth = loadAuth();
  if (!auth) {
    log("capture", "skip (no auth — online-first)");
    return;
  }
  // entitlement gate: don't deposit to the cloud unless this tool is cloud-linked
  // (free plan = 1 active tool/device; enforced client-side).
  if (!(await online(auth, TOOL, auth.device_id ?? null))) {
    log("capture", "skip (not cloud-linked — local-only)");
    return;
  }

  // scrub BOTH sides client-side so secrets never leave the machine.
  const scrubbedUser = scrub(user)[0];
  const content = buildContent(scrubbedUser, scrub(asst)[0]);
  if (!content) return;

  // Project resolution prefers the workspace captured at prompt time (stashed),
  // falling back to this payload's workspace_roots — both scope to the same repo.
  const ws = pending?.ws || workspaceRoot(payload);
  const scope = classifyScope(user);
  const pk = projectKey(ws ?? undefined); // for the project tag AND the idempotency key
  const tags = ["cursor", "auto", `pol-hint:${heuristicPolarity(user)}`, `scope:${scope}`];
  if (scope === "project" && pk) tags.push(`project:${pk}`);

  const item: DepositItem = {
    client_id: turnKey(scrubbedUser, scope, scope === "project" ? pk : null),
    text: content,
    polarity: "open",
    evidence_grade: "anecdotal",
    scope_note: null,
    tags,
  };
  // Deposit with THIS tool's own credential (minted on first run) so the memory is
  // attributed to Cursor. Null = local-only this run (tombstoned/not-entitled) → skip.
  const cred = await resolveCredential(TOOL);
  if (!cred) {
    log("capture", "skip (local-only — no tool credential)");
    return;
  }
  try {
    const saved = await deposit(cred, [item]);
    log("capture", `saved=${saved} scope=${scope}`);
  } catch (e) {
    log("capture", `error ${e}`);
  }
}

async function main(): Promise<void> {
  if (process.env.ATLASO_EXTRACTING) return; // never capture our own enrichment
  const payload = parsePayload(await readStdin());
  const event = String(payload?.hook_event_name || "");

  // Route by event. beforeSubmitPrompt / afterAgentResponse only STASH (fast, no
  // network); the deposit happens once, on stop/sessionEnd.
  if (event === "beforeSubmitPrompt") {
    const [user] = exchangeFromPayload(payload); // reads payload.prompt
    if (user) stashPrompt(convId(payload), user, workspaceRoot(payload));
    log("capture", `stash prompt (${user.length} chars)`);
    return;
  }
  if (event === "afterAgentResponse") {
    const asst = String(payload?.text || "").trim();
    if (asst) stashResponse(convId(payload), asst);
    log("capture", `stash response (${asst.length} chars)`);
    return;
  }
  // stop / sessionEnd (or any other end-of-turn trigger) → deposit.
  await depositTurn(payload, event);
}

main().catch(() => {}).finally(() => process.exit(0));
