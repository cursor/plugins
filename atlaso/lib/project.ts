/** Derive a stable PROJECT KEY for per-project memory — commodity, never the IP.
 *
 * Preserves the "automatic per-project memory" UX (new folder → its own isolated
 * scope, zero setup) WITHOUT writing anything into the project folder. We only
 * compute a string key from a directory:
 *   1. the git remote origin URL (stable across clones), else
 *   2. "<basename>-<short hash of abspath>".
 * READ-ONLY: never creates a .atlaso folder, never throws (→ null = personal-only).
 * Ported 1:1 from the Python thin client's `_project.py` — the TRI-STATE design
 * (ok / none / unknown) is load-bearing and must stay in lockstep with it.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, parse, resolve } from "node:path";

const MARKERS = [
  ".git", "pyproject.toml", "package.json", "Cargo.toml", "go.mod",
  ".hg", ".svn", "Gemfile", "pom.xml", "build.gradle", "requirements.txt",
];

// Tool-install territory: a "project" resolved inside any of these is the
// connector's own runtime/extension dir or a package cache, never the user's
// work. An unguarded cwd walk lands exactly here — one NEW fake project per
// version-pinned release dir (field deposit 52c7e97d). Membership is by path
// ANCESTRY over the canonicalized (realpath'd) root — exact-path lists rot on
// the next versioned release (lab ruling).
const TOOL_DOT_DIRS = new Set([
  ".claude", ".codex", ".gemini", ".vscode", ".opencode", ".atlaso",
  "node_modules", "site-packages", "__pypackages__", ".cache", "Caches",
]);

function intersects(parts: Set<string>, names: Iterable<string>): boolean {
  for (const n of names) if (parts.has(n)) return true;
  return false;
}

/** Split a path into its named components (drops empty leading/anchor parts). */
function pathParts(p: string): Set<string> {
  return new Set(p.split(/[/\\]+/).filter(Boolean));
}

/** True when `root` is tool-install/cache territory — the measurement itself is
 *  garbage (we learn nothing about where the user was working). Distinct from
 *  `noProjectRoot`: garbage → status 'unknown'. */
function garbageRoot(root: string): boolean {
  try {
    const parts = pathParts(root);
    if (intersects(parts, TOOL_DOT_DIRS)) return true;
    // plugin caches that hide under non-dot dirs (marketplaces/cache/repos
    // layouts, e.g. "…/plugins/marketplaces/atlaso/atlaso/runtime")
    if (parts.has("plugins") && intersects(parts, ["cache", "marketplaces", "repos"])) return true;
    if (parts.has("extensions") && intersects(parts, ["Cursor", "Code", "VSCodium"])) return true;
    // ~/.cursor hosts BOTH junk (extensions, plugin caches) and real user work
    // (background-agent worktrees under .cursor/worktrees) — block only its
    // non-worktree subtrees.
    if (parts.has(".cursor") && !parts.has("worktrees")) return true;
  } catch {
    return true;
  }
  return false;
}

/** True when `root` is a real place that simply ISN'T a project ($HOME itself,
 *  the filesystem root). A trustworthy 'no project here' answer — status 'none',
 *  genuine personal scope. */
function noProjectRoot(root: string): boolean {
  try {
    // Prefer $HOME (Python's Path.home() does the same on POSIX) so this tracks
    // the caller's real home even under a modified environment; fall back to the
    // OS lookup. Compared realpath'd, since `root` is already canonicalized.
    const raw = process.env.HOME || homedir();
    let home = raw;
    try {
      home = realpathSync(raw);
    } catch {
      /* keep raw home */
    }
    return root === home || root === raw || root === parse(root).root;
  } catch {
    return true;
  }
}

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
      // A transport PORT is not repository identity. Previously the scheme was
      // stripped and then the first colon became a path separator, so
      // ssh://git@host:2222/group/repo turned into host/2222/group/repo — a
      // different project key from the same repo cloned over https, silently
      // splitting one project's memories in two. (Bugbot #157, "SSH ports break
      // project keys".) Parsing properly drops the port and the userinfo.
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

/** name-hash key for a non-git project root. Hash basis is the NFC-normalized,
 *  case-folded path — APFS is case-insensitive-preserving and hands back NFD
 *  filenames, so two layers producing the same directory's string must never
 *  hash it differently (lab ruling). Mirrors Python `_fallback_key` 1:1. */
function fallbackKey(root: string): string {
  const basis = root.normalize("NFC").toLowerCase();
  const h = createHash("sha256").update(basis, "utf-8").digest("hex").slice(0, 8);
  const name = basename(root).normalize("NFC").replace(/[^A-Za-z0-9_.-]/g, "-") || "project";
  return `${name}-${h}`;
}

export type ProjectStatus = "ok" | "none" | "unknown";
export interface ProjectResolution {
  status: ProjectStatus;
  key: string | null;
}

/** (status, key) — the tri-state project measurement. Mirrors Python
 *  `project_resolution`.
 *    'ok'      → key is a real project identity (normalized git remote, else
 *                name-hash of the canonical root).
 *    'none'    → trustworthy "this work belongs to NO project" ($HOME, the
 *                filesystem root) → genuine personal scope.
 *    'unknown' → the measurement itself failed or was garbage (root resolved
 *                into tool-install/cache territory, unreadable dir, exception)
 *                → record as an unattributed project memory, visible with a
 *                provenance marker, never silently buried.
 *  The none/unknown split is load-bearing: collapsing them is exactly how 298
 *  memories became indistinguishable from "no project" and disappeared. */
export function projectResolution(start?: string): ProjectResolution {
  try {
    let root = projectRoot(start);
    try {
      root = realpathSync(root); // canonicalize BEFORE the garbage/none checks
    } catch {
      /* keep the path.resolve()'d root */
    }
    if (garbageRoot(root)) return { status: "unknown", key: null };
    if (noProjectRoot(root)) return { status: "none", key: null };
    const origin = gitOrigin(root);
    if (origin) {
      const key = normalizeRemote(origin);
      if (key) return { status: "ok", key: key.slice(0, 120) };
    }
    return { status: "ok", key: fallbackKey(root) };
  } catch {
    return { status: "unknown", key: null };
  }
}

/** A stable identity for the current project. null → personal-only (both the
 *  'none' and 'unknown' cases — recall treats them the same). Mirrors Python
 *  `project_key`. */
export function projectKey(start?: string): string | null {
  const { status, key } = projectResolution(start);
  return status === "ok" ? key : null;
}

/** (scope, project_key) from a deposit's tags — mirrors the server + Python
 *  `_project.scope_of`. Recognizes `scope:orphaned`, the server-side rescue
 *  scope for memories reattributed away from a bad key. */
export function scopeOf(tags: string[] | undefined): [string, string | null] {
  // ORDER-INDEPENDENT with precedence orphaned > project > personal
  // (CodeRedTeam block: last-tag-wins let a crafted tag array leak a project
  // memory everywhere or revive a rescued orphan). Mirrors _project.scope_of
  // and the server's _scope_of exactly.
  const tl = (tags || []).filter((t) => typeof t === "string");
  let pkey: string | null = null;
  for (const t of tl) {
    if (t.startsWith("project:")) pkey = t.slice("project:".length);
  }
  const scope = tl.includes("scope:orphaned")
    ? "orphaned"
    : tl.includes("scope:project")
      ? "project"
      : "personal";
  return [scope, pkey];
}

/** Per-project visibility — MUST match the server. Personal/untagged → visible
 *  everywhere. Project-scoped WITH a key → only its own project. Project-scoped
 *  with NO key (orphan) → VISIBLE everywhere (fail OPEN): hiding is invisible to
 *  the user so it can never be corrected, while over-visibility of the user's OWN
 *  memory is observable and fixable (lab ruling — asymmetric loss; the old
 *  fail-closed rule silently buried every capture the key derivation couldn't
 *  attribute). `scope:orphaned` (server-side rescue) is HIDDEN from normal recall.
 *  Ported from `_project.visible_in_project`. */
export function visibleInProject(
  tags: string[] | undefined,
  project: string | null | undefined,
): boolean {
  const [scope, pkey] = scopeOf(tags);
  if (scope === "orphaned") return false; // rescue scope — not surfaced in normal recall
  if (scope !== "project") return true;
  if (pkey === null) return true; // orphan → visible-with-provenance, never silently buried
  return pkey === (project ?? null);
}

/** Best-effort workspace root from a hook payload, with EVERY element of the
 *  fallback chain guarded (lab RedTeam finding: "the fallback chain will silently
 *  accept the plugin process's own PWD"). Cursor's exact field isn't nailed down
 *  (docs are thin; `workspace_roots` vs nested `project.workspaceRoot` both appear
 *  in the wild), so we try every plausible shape AND the process PWD/cwd — but any
 *  candidate that canonicalizes into tool-install/cache territory is SKIPPED (the
 *  hook's own vendored-runtime cwd must never win). Returns the first real
 *  candidate, or null when every candidate is garbage → the caller records the
 *  capture as status 'unknown'. Shared by the recall + capture hooks so both scope
 *  to the SAME project. */
export function workspaceRoot(payload: Record<string, any>): string | null {
  const p = payload || {};
  let cwd: string | undefined;
  try {
    cwd = process.cwd();
  } catch {
    cwd = undefined;
  }
  const candidates: unknown[] = [
    Array.isArray(p.workspace_roots) ? p.workspace_roots[0] : undefined,
    Array.isArray(p.workspaceRoots) ? p.workspaceRoots[0] : undefined,
    p.project?.workspaceRoot,
    p.workspaceRoot,
    p.workspace_root,
    p.cwd,
    process.env.PWD,
    cwd,
  ];
  for (const c of candidates) {
    if (typeof c !== "string" || !c.trim()) continue;
    if (candidateIsGarbage(c)) continue; // skip the plugin's own runtime/cache dir
    return c;
  }
  return null; // every candidate was garbage → status 'unknown'
}

/** True when a raw workspace-root candidate canonicalizes into tool-install
 *  territory. Guards each element of the workspaceRoot() chain individually. */
function candidateIsGarbage(candidate: string): boolean {
  try {
    let resolved = resolve(candidate);
    try {
      resolved = realpathSync(resolved);
    } catch {
      /* keep the resolve()'d path */
    }
    return garbageRoot(resolved);
  } catch {
    return true;
  }
}

/** First entry of a workspace-folders list (editors pass these path-separated). */
function firstWorkspaceFolder(v: string | undefined): string | null {
  if (!v) return null;
  const first = v.split(/[:;,]/).map((s) => s.trim()).filter(Boolean)[0];
  return first || null;
}

/** Project key for the CURRENT process, resolved from the environment.
 *
 *  The MCP server is a standalone process — it gets no hook payload and its cwd is
 *  wherever the editor happened to launch it, so `projectKey()` alone would key
 *  memories to the wrong directory (or to none). Resolve the workspace from the env
 *  the editor exports, then hand it to the tri-state resolver so an unattributable
 *  root yields null rather than a junk key. */
/** Tri-state resolution for the CURRENT process. `currentProjectKey()` collapses
 *  'none' and 'unknown' to the same null, which is NOT the same thing: 'none' is a
 *  trustworthy "this is genuinely not a project" ($HOME, the filesystem root) and
 *  belongs in personal scope, while 'unknown' is "the measurement is garbage" and
 *  must stay project-scoped but unattributed. Callers that act on the difference
 *  must use this. (Bugbot #157, "Remember skips none-vs-unknown split".) */
export function currentProjectResolution(): ProjectResolution {
  return projectResolution(currentRoot());
}

function currentRoot(): string {
  return (
    process.env.CURSOR_PROJECT_DIR ||
    process.env.CURSOR_WORKSPACE_ROOT ||
    firstWorkspaceFolder(process.env.WORKSPACE_FOLDER_PATHS) ||
    process.env.PWD ||
    process.cwd()
  );
}

export function currentProjectKey(): string | null {
  return projectKey(currentRoot());
}

/** Visibility for a RECALL RESULT, as opposed to a raw tag list.
 *
 *  Some server versions normalize scope into a top-level `scope` field instead of
 *  leaving `scope:project` in tags. A caller that only inspects tags therefore
 *  reads such a row as PERSONAL and shows it everywhere — a cross-project leak.
 *  The MCP path had this right and the sessionStart hook did not, which is exactly
 *  the kind of drift two copies of one predicate produce, so it lives here now and
 *  both call it. (Bugbot #157, "Recall filter misses scope field".) */
export function resultVisibleHere(
  r: { scope?: string; tags?: string[] },
  project: string | null,
): boolean {
  const tags = Array.isArray(r.tags) ? [...r.tags] : [];
  if (r.scope === "project" && !tags.includes("scope:project")) tags.push("scope:project");
  return visibleInProject(tags, project);
}
