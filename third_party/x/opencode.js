// x - OpenCode adapter for Cursor plugin (skills + MCP)
// Reads skills/ and mcp.json at runtime, registers both via config hook.

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFile, readdir } from "node:fs/promises";

const PLUGIN_DIR = fileURLToPath(new URL(".", import.meta.url));
const MCP_PATH = join(PLUGIN_DIR, "mcp.json");

function translateServer(server) {
  const isLocal = server.command || server.type === "stdio";
  if (isLocal) {
    const cmd = [server.command, ...(server.args || [])].filter(Boolean);
    const out = { type: "local", command: cmd, enabled: true };
    if (server.env) {
      const envRegex = new RegExp("\\\\${([^}]+)}", "g");
      out.environment = Object.fromEntries(
        Object.entries(server.env).map(([k, v]) => [k, String(v).replace(envRegex, "{env:$1}")])
      );
    }
    if (server.cwd) out.cwd = server.cwd;
    return out;
  }
  const out = { type: "remote", enabled: true };
  if (server.url) {
    const urlRegex = new RegExp("\\\\${([^}]+)}", "g");
    out.url = String(server.url).replace(urlRegex, "{env:$1}");
  }
  if (server.headers) {
    const hdrRegex = new RegExp("\\\\${([^}]+)}", "g");
    out.headers = Object.fromEntries(
      Object.entries(server.headers).map(([k, v]) => [k, String(v).replace(hdrRegex, "{env:$1}")])
    );
    out.oauth = false;
  } else if (server.auth) {
    const oauth = {};
    const cid = server.auth.CLIENT_ID || server.auth.clientId;
    const csec = server.auth.CLIENT_SECRET || server.auth.clientSecret;
    const authRegex = new RegExp("\\\\${([^}]+)}", "g");
    if (cid) oauth.clientId = String(cid).replace(authRegex, "{env:$1}");
    if (csec) oauth.clientSecret = String(csec).replace(authRegex, "{env:$1}");
    const scopes = server.auth.scopes || server.auth.scope;
    if (Array.isArray(scopes)) oauth.scope = scopes.join(" ");
    else if (typeof scopes === "string") oauth.scope = scopes;
    out.oauth = oauth;
  }
  return out;
}

export const XPlugin = async ({ directory }) => ({
  config: async (config) => {
    const skills = ["x-api-mcp-guide"];
    config.permission ??= { skill: {} };
    for (const s of skills) config.permission.skill[s] = "allow";
    const mcp = JSON.parse(await readFile(MCP_PATH, "utf-8"));
    for (const [name, server] of Object.entries(mcp.mcpServers || {})) {
      config.mcp ??= {};
      config.mcp[name] = translateServer(server);
    }
  },
});

export default XPlugin;
