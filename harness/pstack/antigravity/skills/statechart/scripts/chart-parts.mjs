export const SEP = "\u0000";
export const edgeId = (from, to) => `${from}${SEP}${SEP}${to}`;

export function guarded(guards, label) {
  const words = guards?.get(label);
  return words && !words.has("") ? `${label} [${[...words].sort().join(" or ")}]` : label;
}
export const addGuard = (guards, label, words) => {
  if (!guards.has(label)) guards.set(label, new Set());
  guards.get(label).add(words);
};

export const frontMatter = (title) => [
  "---",
  ...(title ? [`title: ${JSON.stringify(title)}`] : []),
  "config:",
  "  markdownAutoWrap: false",
  "  state:",
  "    useMaxWidth: false",
  "---",
];
