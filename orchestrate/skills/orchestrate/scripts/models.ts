import type { ModelSelection } from "@cursor/sdk";

import type { TaskType } from "./adapters/types.ts";

// Model catalog. Source of truth for `tasks[].model` choices; `defaultFor`
// entries supply the fallback when `tasks[].model` is omitted.

export interface ModelProfile {
  /** User-facing slug for `tasks[].model` and `--model` flags. */
  slug: string;
  /** Canonical SDK selection passed to `Agent.create({ model })`. */
  selection: ModelSelection;
  summary: string;
  strengths: string[];
  speed: "fast" | "medium" | "slow";
  use: string;
  /** Task types this profile is the default for. */
  defaultFor?: TaskType[];
}

// `slug` is the stable authoring name; `selection` is the canonical SDK form.
// Run `bun cli.ts models --check` after SDK or backend model-schema drift.
export const MODEL_CATALOG: ModelProfile[] = [
  {
    slug: "claude-opus-4-7",
    selection: { id: "claude-opus-4-7" },
    summary: "Solid judgment Opus; right tier for verifier acceptance checks.",
    strengths: [
      "judgment",
      "acceptance criteria",
      "frontend",
      "UX decisions",
      "ambiguity resolution",
    ],
    speed: "slow",
    use: "Default for verifiers; focused acceptance-criteria checks don't need xhigh. Also a good pick for subplanners or workers owning judgment-heavy or frontend slices when the deep-thinking variant is overkill.",
    defaultFor: ["verifier"],
  },
  {
    slug: "opus-max",
    selection: {
      id: "claude-opus-4-7",
      params: [
        { id: "thinking", value: "true" },
        { id: "context", value: "1m" },
        { id: "effort", value: "max" },
      ],
    },
    summary:
      "Maximum-reasoning Opus; reserved for exceptionally difficult judgment tasks.",
    strengths: ["complex judgment", "deep reasoning", "ambiguity resolution"],
    speed: "slow",
    use: "Reserved for exceptionally difficult tasks. May overthink simple problems — only reach for this when standard `claude-opus-4-7` has produced unsatisfying results.",
  },
  {
    slug: "gpt-5.5-high-fast",
    selection: {
      id: "gpt-5.5",
      params: [
        { id: "reasoning", value: "high" },
        { id: "fast", value: "true" },
      ],
    },
    summary: "Strong systems, architecture, algorithms, tricky code.",
    strengths: [
      "systems design",
      "architecture",
      "algorithms",
      "refactoring",
      "subtle correctness",
    ],
    speed: "medium",
    use: "Default for workers. Pick this for systems/architecture slices and tasks needing careful correctness. Reach for `gpt-5.5-high` (non-fast) when quality matters more than throughput.",
    defaultFor: ["worker"],
  },
  {
    slug: "gpt-5.5-high",
    selection: {
      id: "gpt-5.5",
      params: [
        { id: "reasoning", value: "high" },
        { id: "fast", value: "false" },
      ],
    },
    summary:
      "Non-fast `gpt-5.5-high`; trades latency for higher-quality systems work.",
    strengths: [
      "systems design",
      "architecture",
      "algorithms",
      "refactoring",
      "subtle correctness",
    ],
    speed: "slow",
    use: "Workers whose task is non-trivial and where quality matters more than throughput. Reach for this over `gpt-5.5-high-fast` when subtle correctness matters more than turnaround.",
  },
  {
    slug: "claude-opus-4-7-thinking-xhigh",
    selection: {
      id: "claude-opus-4-7",
      params: [
        { id: "thinking", value: "true" },
        { id: "effort", value: "xhigh" },
      ],
    },
    summary:
      "Thinking Opus at xhigh effort; reserved for orchestration roles where deep judgment matters most.",
    strengths: ["judgment", "second opinions", "prose", "ambiguity resolution"],
    speed: "slow",
    use: "Default for subplanners: they decompose, route, and synthesize, where deep judgment pays off. Also the the code discipline subagent default for prose, judgment, and second opinions. Resolved here so planners can pass the slug straight through `Task({ model })` without falling through to bare `{ id }` and being rejected as `invalid_model`.",
    defaultFor: ["subplanner"],
  },
  {
    slug: "gpt-5.3-codex-high-fast",
    selection: {
      id: "gpt-5.3-codex",
      params: [
        { id: "reasoning", value: "high" },
        { id: "fast", value: "true" },
      ],
    },
    summary: "Codex 5.3 tuned for quick, code-shaped implementation work.",
    strengths: ["code synthesis", "throughput", "tool calls"],
    speed: "fast",
    use: "Workers doing well-scoped code edits when `gpt-5.5-high-fast` is overkill. Reach for this when the task is mechanical code generation, not subtle algorithmic correctness.",
  },
  {
    slug: "gpt-xhigh",
    // 1m context requires fast=false per /v1/models. Fast=true caps at 272k.
    // Hard tasks usually need the larger window, so we pay the latency.
    selection: {
      id: "gpt-5.5",
      params: [
        { id: "context", value: "1m" },
        { id: "reasoning", value: "extra-high" },
        { id: "fast", value: "false" },
      ],
    },
    summary:
      "Maximum-reasoning GPT-5.5; reserved for exceptionally hard systems work.",
    strengths: [
      "complex algorithms",
      "subtle correctness",
      "deep architectural reasoning",
    ],
    speed: "slow",
    use: "Reserved for exceptionally difficult tasks. May overthink simple problems — only reach for this when standard `gpt-5.5-high-fast` has produced unsatisfying results.",
  },
  {
    slug: "composer-2-fast",
    selection: {
      id: "composer-2",
      params: [{ id: "fast", value: "true" }],
    },
    summary:
      "Fast and balanced; good throughput for bounded implementation work.",
    strengths: [
      "throughput",
      "well-scoped implementation",
      "straight-line code",
    ],
    speed: "fast",
    use: "Default for workers with clear acceptance criteria and bounded scope. The balanced choice when correctness risk is low.",
  },
];

export function defaultModelForType(type: TaskType): string {
  const match = MODEL_CATALOG.find(m => m.defaultFor?.includes(type));
  if (!match)
    throw new Error(`MODEL_CATALOG missing default for TaskType "${type}"`);
  return match.slug;
}

export function isKnownModel(slug: string): boolean {
  return MODEL_CATALOG.some(m => m.slug === slug);
}

/** Unknown slugs pass through as a bare `{ id }` so planners can reach
 * server-side models that aren't in our prescriptive catalog. */
export function resolveModelSelection(slug: string): ModelSelection {
  const profile = MODEL_CATALOG.find(m => m.slug === slug);
  return profile ? profile.selection : { id: slug };
}

export function renderModelCatalog(): string {
  const lines: string[] = [];
  for (const m of MODEL_CATALOG) {
    const defaults = m.defaultFor?.length
      ? ` (default for ${m.defaultFor.join(", ")})`
      : "";
    lines.push(`- \`${m.slug}\` — ${m.summary}${defaults}`);
    lines.push(`  speed: ${m.speed}; strengths: ${m.strengths.join(", ")}`);
    lines.push(`  use: ${m.use}`);
  }
  return lines.join("\n");
}
