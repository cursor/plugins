/** Read the hook's stdin JSON. Portable across bun + node; never hangs (a TTY
 *  with no pipe resolves '' after a short grace). Parsing is forgiving → {}. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  return await new Promise<string>((resolve) => {
    const done = (s: string) => {
      clearTimeout(timer);
      resolve(s);
    };
    // Guard: if nothing is ever piped (e.g. run interactively) don't block.
    const timer = setTimeout(() => done(Buffer.concat(chunks).toString("utf-8")), 2000);
    process.stdin.on("data", (c) => chunks.push(Buffer.from(c)));
    process.stdin.on("end", () => done(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", () => done(""));
  });
}

export function parsePayload(raw: string): Record<string, any> {
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
