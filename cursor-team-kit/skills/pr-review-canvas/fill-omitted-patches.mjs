import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Same key the canvas uses for data-diff attributes.
export function patchKey(filename) {
  return String(filename).replace(/[^a-zA-Z0-9]/g, "_");
}

function unquote(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

function sidePath(header, prefix) {
  const path = unquote(header.trim());
  if (path === "/dev/null") return null;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

// Map a `git diff` / GitHub pull diff onto filename -> hunk text.
// The files API's `patch` starts at the first @@ line, so this does too.
export function parseUnifiedDiff(diff) {
  const files = {};
  if (!diff) return files;
  const chunks = String(diff).split(/\n(?=diff --git )/);
  for (const chunk of chunks) {
    if (!chunk.startsWith("diff --git ")) continue;
    const lines = chunk.split("\n");
    let filename = null;
    let hunkAt = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("+++ ")) {
        filename = sidePath(line.slice(4), "b/") || filename;
      } else if (line.startsWith("--- ") && !filename) {
        filename = sidePath(line.slice(4), "a/");
      } else if (line.startsWith("@@")) {
        hunkAt = i;
        break;
      }
    }
    if (!filename || hunkAt < 0) continue;
    const body = lines.slice(hunkAt);
    while (body.length && body[body.length - 1] === "") body.pop();
    files[filename] = body.join("\n") + "\n";
  }
  return files;
}

function fileEntries(payload) {
  if (!Array.isArray(payload)) {
    throw new Error("files payload must be a JSON array");
  }
  // `gh api --paginate --slurp` wraps each page, which is itself an array.
  if (payload.length && Array.isArray(payload[0])) return payload.flat();
  return payload;
}

export function fillOmittedPatches(payload, unifiedDiff) {
  const recovered = parseUnifiedDiff(unifiedDiff);
  const out = {};
  for (const file of fileEntries(payload)) {
    if (!file || !file.filename) continue;
    const key = patchKey(file.filename);
    const provided = typeof file.patch === "string" ? file.patch : "";
    const textual = (file.additions || 0) + (file.deletions || 0) > 0;
    if (!provided && textual && recovered[file.filename]) {
      out[key] = recovered[file.filename];
    } else {
      out[key] = provided;
    }
  }
  return out;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isDirectRun()) {
  const [filesPath, diffPath] = process.argv.slice(2);
  if (!filesPath || !diffPath) {
    process.stderr.write(
      "usage: node fill-omitted-patches.mjs <files.json> <pull.diff>\n"
    );
    process.exit(1);
  }
  const payload = JSON.parse(readFileSync(filesPath, "utf8"));
  const diff = readFileSync(diffPath, "utf8");
  process.stdout.write(JSON.stringify(fillOmittedPatches(payload, diff)));
}
