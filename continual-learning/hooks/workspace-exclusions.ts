import { readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, sep } from "node:path";

export function isWorkspaceExcluded(
  workspace = process.cwd(),
  configPath = process.env.CONTINUAL_LEARNING_CONFIG ??
    join(homedir(), ".cursor", "continual-learning.json")
): boolean {
  let text: string;
  try {
    text = readFileSync(configPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  const config = JSON.parse(text);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Continual learning config must be an object");
  }
  const paths = config.excludedPaths === undefined ? [] : config.excludedPaths;
  if (!Array.isArray(paths) || paths.some((path) => typeof path !== "string" || !isAbsolute(path))) {
    throw new Error("excludedPaths must be an array of absolute paths");
  }
  const current = realpathSync(workspace);
  return paths.some((path: string) => {
    const excluded = realpathSync(path);
    const child = relative(excluded, current);
    return child === "" || (child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child));
  });
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify({ excluded: isWorkspaceExcluded() }));
  } catch (error) {
    console.error("[continual-learning] cannot check workspace exclusions", error);
    process.exitCode = 1;
  }
}
