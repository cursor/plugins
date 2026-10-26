import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const imports = (text, dir) =>
  [...text.matchAll(/\b(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)].map((m) =>
    path.resolve(dir, m[1]),
  );

const DEPENDENCIES = {
  ".tla": (text, dir) =>
    [
      ...text
        .replace(/\(\*[^]*?\*\)/g, " ")
        .replace(/\\\*.*/g, " ")
        .matchAll(/\b(?:EXTENDS|INSTANCE)\s+(\w+(?:\s*,\s*\w+)*)/g),
    ].flatMap((m) => m[1].split(/\s*,\s*/).map((name) => path.join(dir, `${name}.tla`))),
  ".mjs": imports,
  ".js": imports,
};

export const copyPath = (root, file, paths = path) => {
  const absolute = paths.resolve(file);
  const pathRoot = paths.parse(absolute).root;
  return paths.join(root, pathRoot.replace(/\W+/g, ""), paths.relative(pathRoot, absolute));
};

const contentOf = (file) => {
  try {
    return fs.readFileSync(file, "base64");
  } catch {
    return null;
  }
};

export class Inputs {
  #root = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-inputs-"));
  #files = new Set();

  constructor() {
    process.on("exit", () => fs.rmSync(this.#root, { recursive: true, force: true }));
  }

  add(files) {
    for (const file of files) if (file) this.#take(path.resolve(file), true);
    return this;
  }

  copyOf(file) {
    return copyPath(this.#root, file);
  }

  changed() {
    return [...this.#files].find((file) => contentOf(file) !== contentOf(this.copyOf(file)));
  }

  #take(file, listed) {
    if (this.#files.has(file)) return;
    let content;
    try {
      content = fs.readFileSync(file);
    } catch {
      if (listed) this.#files.add(file);
      return;
    }
    this.#files.add(file);
    const copy = this.copyOf(file);
    fs.mkdirSync(path.dirname(copy), { recursive: true });
    fs.writeFileSync(copy, content);
    const found = DEPENDENCIES[path.extname(file)]?.(content.toString("utf8"), path.dirname(file));
    for (const dependency of found ?? []) this.#take(dependency, false);
  }
}
