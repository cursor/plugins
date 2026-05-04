#!/usr/bin/env bun
import { Agent } from "@cursor/sdk";
import { MODEL_CATALOG, type ModelProfile } from "../models.ts";

const PROBE_REPO = "https://github.com/example-org/example-repo";

export type ProbeResult =
  | {
      profile: ModelProfile;
      ok: true;
    }
  | {
      profile: ModelProfile;
      ok: false;
      error: string;
    };

export interface ProbeAgentApi {
  create: (opts: unknown) => Promise<{
    agentId: string;
    send: (message: unknown) => Promise<{ id: string }>;
  }>;
  getRun: (
    runId: string,
    opts: { runtime: "cloud"; apiKey: string; agentId: string }
  ) => Promise<{ cancel: () => Promise<void> }>;
}

export async function probeModelCatalog(
  apiKey: string,
  opts: {
    catalog?: ModelProfile[];
    agentApi?: ProbeAgentApi;
  } = {}
): Promise<ProbeResult[]> {
  const catalog = opts.catalog ?? MODEL_CATALOG;
  const agentApi = opts.agentApi ?? Agent;
  const results: ProbeResult[] = [];
  for (const profile of catalog) {
    try {
      const agent = await agentApi.create({
        apiKey,
        name: `probe: ${profile.slug}`,
        cloud: {
          repos: [{ url: PROBE_REPO, startingRef: "main" }],
          autoCreatePR: false,
        },
        model: profile.selection,
      });
      const run = await agent.send({ text: "probe, ignore" });
      results.push({ profile, ok: true });
      try {
        const live = await agentApi.getRun(run.id, {
          runtime: "cloud",
          apiKey,
          agentId: agent.agentId,
        });
        await live.cancel();
      } catch {}
    } catch (err) {
      results.push({
        profile,
        ok: false,
        error: (err instanceof Error ? err.message : String(err)).slice(0, 200),
      });
    }
  }
  return results;
}

export function printProbeResults(results: ProbeResult[]): number {
  let failures = 0;
  for (const r of results) {
    const label = `${r.profile.slug} -> ${JSON.stringify(r.profile.selection)}`;
    if (r.ok) {
      console.log(`[OK]   ${label}`);
    } else {
      failures += 1;
      console.log(`[FAIL] ${label}  ${r.error}`);
    }
  }
  if (failures > 0) {
    console.error(`\n${failures} catalog entries failed validation.`);
    console.error(
      "Re-probe candidate shapes against /v1/models and update MODEL_CATALOG.selection."
    );
  } else {
    console.log("\nAll catalog entries validate.");
  }
  return failures;
}

if (import.meta.main) {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("CURSOR_API_KEY missing");
    process.exit(2);
  }
  const results = await probeModelCatalog(apiKey);
  process.exit(printProbeResults(results) > 0 ? 1 : 0);
}
