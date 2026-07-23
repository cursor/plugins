/** Derive a stable PROJECT KEY for per-project memory — commodity, never the IP.
 *
 * Preserves the "automatic per-project memory" UX (new folder → its own isolated
 * scope, zero setup) WITHOUT writing anything into the project folder. We only
 * compute a string key from a directory:
 *   1. the git remote origin URL (stable across clones), else
 *   2. "<basename>-<short hash of abspath>".
 * READ-ONLY: never creates a .atlaso folder, never throws (→ null = personal-only).
 * Ported 1:1 from the Python thin client's `_project.py`.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const MARKERS = [
  ".git", "pyproject.toml", "package.json", "Cargo.toml", "go.mod",
  ".hg", ".svn", "Gemfile", "pom.xml", "build.gradle", "requirements.txt",
];

export function projectRoot(start?: string): string {
  let cur: string;
  try {
    cur = resolve(start || process.cwd());
  } catch {
    return process.cwd();
  }
  let d = cur;
  // walk up to the filesystem root looking for a project marker
  while (true) {
    for (const m of MARKERS) {
      try {
        if (existsSync(join(d, m))) return d;
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return cur; // no markers → the cwd itself is the "project"
}

/** Read remote.origin.url straight from .git/config (no subprocess). Handles a
 *  `.git` FILE (worktrees) by following gitdir → commondir, so all worktrees of
 *  one repo resolve to the SAME key. null if absent. */
function gitOrigin(root: string): string | null {
  try {
    const gitpath = join(root, ".git");
    let cfg: string | null = null;
    let st;
    try {
      st = statSync(gitpath);
    } catch {
      return null;
    }
    if (st.isDirectory()) {
      cfg = join(gitpath, "config");
    } else if (st.isFile()) {
      const txt = readFileSync(gitpath, "utf-8");
      const m = txt.match(/gitdir:\s*(.+)/);
      if (m) {
        const gd = resolve(root, m[1].trim());
        let common = gd;
        const cd = join(gd, "commondir");
        if (existsSync(cd)) {
          try {
            common = resolve(gd, readFileSync(cd, "utf-8").trim());
          } catch {
            common = gd;
          }
        }
        cfg = join(common, "config");
      }
    }
    if (!cfg || !existsSync(cfg)) return null;
    const text = readFileSync(cfg, "utf-8");
    let inOrigin = false;
    for (const line of text.split(/\r?\n/)) {
      const s = line.trim();
      if (s.startsWith("[")) {
        inOrigin = s.replace(/\s/g, "").toLowerCase().startsWith('[remote"origin"]');
      } else if (inOrigin && s.toLowerCase().startsWith("url")) {
        const val = s.slice(s.indexOf("=") + 1).trim();
        return val || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Normalize a git remote to a stable key: drop scheme/creds/.git, lowercase
 *  host+path. git@github.com:me/app.git & https://github.com/me/app(.git) →
 *  github.com/me/app. */
function normalizeRemote(url: string): string {
  let u = url.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(u)) {
    try {
      const parsed = new URL(u);
      // Transport ports are not repository identity. ssh://host:2222/a/b and
      // git@host:a/b must resolve to the same project key.
      u = `${parsed.hostname}${parsed.pathname}`;
    } catch {
      u = u.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
    }
  } else {
    u = u.replace(/^[^@/]+@/, ""); // strip user@
    u = u.replace(":", "/"); // scp-style host:path → host/path (first colon only)
  }
  u = u.replace(/\.git$/, "");
  return u.replace(/^\/+|\/+$/g, "").toLowerCase();
}

/** A stable identity for the current project. null on any failure → personal-only. */
export function projectKey(start?: string): string | null {
  try {
    const root = projectRoot(start);
    const origin = gitOrigin(root);
    if (origin) {
      const key = normalizeRemote(origin);
      if (key) return key.slice(0, 120);
    }
    const h = createHash("sha256").update(root).digest("hex").slice(0, 8);
    const name = (basename(root).replace(/[^A-Za-z0-9_.-]/g, "-") || "project");
    return `${name}-${h}`;
  } catch {
    return null;
  }
}

function firstWorkspaceFolder(raw: string | undefined): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const first = parsed.find((x) => typeof x === "string" && x.trim());
      if (typeof first === "string") return first.trim();
    }
  } catch {
    /* common form is a single path, not JSON */
  }
  return value.split(/\r?\n|,/)[0]?.trim() || null;
}

/** Current project identity for long-lived MCP processes. Cursor exposes
 *  CURSOR_PROJECT_DIR to plugin processes and WORKSPACE_FOLDER_PATHS to MCP
 *  processes; prefer those explicit values, with cwd as a fail-closed fallback. */
export function currentProjectKey(): string | null {
  const root =
    process.env.CURSOR_PROJECT_DIR ||
    process.env.CURSOR_WORKSPACE_ROOT ||
    firstWorkspaceFolder(process.env.WORKSPACE_FOLDER_PATHS) ||
    process.cwd();
  return projectKey(root);
}

/** (scope, project_key) from a deposit's tags — mirrors the server + Python
 *  `_project.scope_of`. */
export function scopeOf(tags: string[] | undefined): [string, string | null] {
  let scope = "personal";
  let pkey: string | null = null;
  for (const t of tags || []) {
    if (t === "scope:project") scope = "project";
    else if (t === "scope:personal") scope = "personal";
    else if (typeof t === "string" && t.startsWith("project:")) pkey = t.slice("project:".length);
  }
  return [scope, pkey];
}

/** Per-project visibility — MUST match the server. Personal/untagged → visible
 *  everywhere. Project-scoped → only its own project. Project-scoped with NO key
 *  (orphan) → FAIL CLOSED (hidden), so a capture we couldn't attribute never
 *  leaks across repos. Ported from `_project.visible_in_project`. */
export function visibleInProject(
  tags: string[] | undefined,
  project: string | null | undefined,
): boolean {
  const [scope, pkey] = scopeOf(tags);
  if (scope !== "project") return true;
  if (pkey === null) return false;
  return pkey === (project ?? null);
}

/** Best-effort workspace root from a hook payload. Cursor's exact field for this
 *  isn't nailed down (docs are thin; `workspace_roots` vs nested `project
 *  .workspaceRoot` both appear in the wild), so we try every plausible shape and
 *  fall back to the cwd Cursor launched the hook from. Shared by the recall +
 *  capture hooks so both scope to the SAME project. (The live field is one of the
 *  things to confirm in the deployed end-to-end test.) */
export function workspaceRoot(payload: Record<string, any>): string | null {
  const p = payload || {};
  const candidates: unknown[] = [
    Array.isArray(p.workspace_roots) ? p.workspace_roots[0] : undefined,
    Array.isArray(p.workspaceRoots) ? p.workspaceRoots[0] : undefined,
    p.project?.workspaceRoot,
    p.workspaceRoot,
    p.workspace_root,
    p.cwd,
  ];
  for (const c of candidates) if (typeof c === "string" && c.trim()) return c;
  return process.env.PWD || process.cwd() || null;
}
