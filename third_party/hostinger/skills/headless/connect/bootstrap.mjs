#!/usr/bin/env node
// Hostinger Headless — bootstrap.
// Verifies the Hostinger MCP server is reachable and drives the OAuth sign-in,
// emitting one JSON event per line on stdout so a coding agent can relay
// progress to the user. No filesystem writes besides what the MCP itself
// stores (OAuth credentials); no network calls of its own.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ── tiny event protocol (one JSON object per line) ───────────────────────────
const emit = (event, extra = {}) =>
  process.stdout.write(JSON.stringify({ event, ...extra }) + '\n');
const fail = (event, extra = {}) => {
  emit(event, { ok: false, ...extra });
  process.exit(1);
};

// ── platform-safe binary names (npm/npx are .cmd on Windows) ─────────────────
const isWin = process.platform === 'win32';
const bin = (name) => (isWin ? `${name}.cmd` : name);
// Run the MCP via npx — no global install, always the latest published version.
// Use --package so npx resolves the published package, then invoke the unified binary.
const MCP = [bin('npx'), '-y', '--package=@hostinger/mcp@latest', 'hostinger-api-mcp'];
// Node >= 18.20.2 / 20.12.2 refuses to spawn a .cmd/.bat without a shell
// (CVE-2024-27980), so npx.cmd needs shell:true on Windows. Our args are all
// fixed literals, so enabling the shell introduces no injection risk.
const spawnShell = isWin;

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: spawnShell });
  return { status: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}`, error: r.error };
}

// ── 1. MCP server reachable ──────────────────────────────────────────────────
function checkMcp() {
  const r = capture(MCP[0], [...MCP.slice(1), '--version']);
  if (r.status !== 0) fail('mcp_unreachable', { detail: r.out.trim().slice(0, 400) });
  // npx interleaves "npm notice …" lines, so pick the first semver-looking token.
  const version = (r.out.match(/\d+\.\d+\.\d+[^\s]*/) || [])[0] || r.out.trim().split('\n').pop();
  emit('mcp_ok', { version });
}

// ── 2. Existing auth? ────────────────────────────────────────────────────────
// An env token always wins (the MCP bypasses OAuth entirely when it is set).
// Otherwise stored OAuth credentials mean a previous sign-in can be reused —
// the MCP refreshes expired tokens automatically on the first tool call.
function existingAuth() {
  if (process.env.HOSTINGER_API_TOKEN || process.env.API_TOKEN) {
    return 'api_token';
  }
  const base = isWin ? (process.env.APPDATA || os.homedir()) : path.join(os.homedir(), '.config');
  const credsPath = path.join(base, 'hostinger-mcp', 'credentials.json');
  if (existsSync(credsPath)) {
    try {
      const creds = JSON.parse(readFileSync(credsPath, 'utf8'));
      if (creds.refresh_token || (creds.access_token && creds.expires_at > Date.now())) {
        return 'oauth_cached';
      }
    } catch {
      /* unreadable credentials — fall through to a fresh login */
    }
  }
  return null;
}

// ── 3. Login (human-in-the-loop browser flow) ────────────────────────────────
// `hostinger-api-mcp --login` opens the Hostinger sign-in page and listens on
// an ephemeral localhost port for the OAuth callback, so the browser must run
// on this same machine. It prints the sign-in URL to stderr with a stable
// prefix — forward it so the agent can show it if the browser didn't open.
function login() {
  return new Promise((resolve) => {
    const child = spawn(MCP[0], [...MCP.slice(1), '--login'], { shell: spawnShell });
    let diag = '';
    let urlSent = false;
    const collect = (chunk) => {
      diag = (diag + chunk).slice(-2000);
      if (!urlSent) {
        const m = diag.match(/Opening browser for sign-in:\s*\n\s*(https?:\/\/\S+)/);
        if (m) {
          urlSent = true;
          emit('awaiting_user', {
            verificationUri: m[1],
            note: 'A browser window should have opened. If not, open this URL manually on this machine and sign in.',
          });
        }
      }
    };
    child.stderr?.on('data', collect);
    child.stdout?.on('data', collect);
    child.on('close', (code) => {
      if (code === 0 && /Sign-in successful/i.test(diag)) {
        emit('logged_in', { method: 'oauth' });
        resolve();
        return;
      }
      const detail = diag.trim().slice(-1500) || `--login exited (code ${code}) with no output.`;
      fail('login_failed', { code, detail });
    });
    child.on('error', (e) => fail('login_failed', { detail: String(e) }));
  });
}

// ── main ─────────────────────────────────────────────────────────────────────
checkMcp();
const method = existingAuth();
if (method) {
  emit('logged_in', { method });
} else {
  await login();
}
emit('success');
