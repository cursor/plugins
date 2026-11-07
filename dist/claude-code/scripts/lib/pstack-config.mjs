import { readFile, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const ROLES = Object.freeze([
  'implementation', 'exploration', 'architecture', 'explanation', 'verification', 'review',
]);
export const RUNTIMES = Object.freeze([
  'vscode-local', 'vscode-copilot', 'copilot-cli', 'cursor', 'claude-code',
]);
export const RUNTIME_CAPABILITIES = Object.freeze({
  'vscode-local': Object.freeze({
    perCallSubagents: true,
    perCallModelSelection: true,
    modelSelection: 'live-schema-or-agent-definition',
  }),
  'vscode-copilot': Object.freeze({ taskSchema: 'discover-dynamically' }),
  'copilot-cli': Object.freeze({ taskSchema: 'discover-dynamically' }),
  cursor: Object.freeze({ discoveryRequired: true }),
  'claude-code': Object.freeze({ discoveryRequired: true }),
});
const DEFAULTS_PATH = fileURLToPath(new URL('../../config/defaults.json', import.meta.url));
const FAMILIES = ['gpt', 'claude', 'xai'];
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

function assertObject(value, label) {
  if (!object(value)) fail(`${label} must be a JSON object`);
}

function merge(base, overlay) {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(overlay)) {
    // Define data properties rather than invoking Object.prototype setters.
    Object.defineProperty(result, key, {
      value: object(value) && object(result[key]) && own(result, key)
        ? merge(result[key], value) : structuredClone(value),
      enumerable: true, writable: true, configurable: true,
    });
  }
  return result;
}

async function readJson(path, optional = false) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if (optional && error.code === 'ENOENT') return {};
    fail(`Cannot read JSON ${path}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Invalid JSON ${path}: ${error.message}`);
  }
}

function paths({ repo = process.cwd(), home, env = process.env } = {}) {
  const userHome = home ?? env.HOME ?? homedir();
  return {
    user: resolve(env.PSTACK_CONFIG || resolve(env.XDG_CONFIG_HOME || resolve(userHome, '.config'), 'pstack/config.json')),
    repo: resolve(repo, '.pstack/config.json'),
  };
}

function validateSelector(selector, label, exact = false, partial = false) {
  assertObject(selector, label);
  if (own(selector, 'id') && selector.id !== null && !nonempty(selector.id)) fail(`${label}.id must be a nonempty exact ID`);
  if (own(selector, 'family') && selector.family !== null && !FAMILIES.includes(selector.family)) fail(`${label}.family must be gpt, claude, or xai`);
  if (!partial && !nonempty(selector.id) && !FAMILIES.includes(selector.family)) fail(`${label} requires id or family`);
  if (exact && !nonempty(selector.id)) fail(`${label} fallback requires an exact id`);
  if (own(selector, 'tier') && selector.tier !== null && !['opus', 'sonnet'].includes(selector.tier)) fail(`${label}.tier must be opus or sonnet`);
  if (own(selector, 'reasoningEffort') && selector.reasoningEffort !== null && !nonempty(selector.reasoningEffort)) fail(`${label}.reasoningEffort must be a nonempty string`);
  if (own(selector, 'speed') && selector.speed !== null && !['standard', 'fast'].includes(selector.speed)) fail(`${label}.speed must be standard or fast`);
  if (own(selector, 'fallback')) {
    if (exact) fail(`${label} cannot contain nested fallback`);
    if (Array.isArray(selector.fallback)) {
      if (selector.fallback.length === 0) fail(`${label}.fallback must not be empty`);
      selector.fallback.forEach((item, index) => validateSelector(item, `${label}.fallback[${index}]`, true));
    } else if (!['stop', 'inherit'].includes(selector.fallback)) {
      fail(`${label}.fallback must be stop, inherit, or a list of exact selectors`);
    }
  }
}

/** Validate known fields without removing extension fields; return the input or throw. */
export function validateConfig(config, { partial = false } = {}) {
  assertObject(config, 'config');
  if ((!partial || own(config, 'schemaVersion')) && config.schemaVersion !== 1) fail('schemaVersion must be 1');
  if ((!partial || own(config, 'profile')) && !nonempty(config.profile)) fail('profile must be a nonempty string');
  for (const section of ['limits', 'integrations', 'roles']) {
    if (!partial || own(config, section)) assertObject(config[section], section);
  }
  if (config.limits) {
    for (const key of ['maxConcurrent', 'maxWorkers']) {
      if ((!partial || own(config.limits, key)) && (!Number.isSafeInteger(config.limits[key]) || config.limits[key] < 1)) {
        fail(`limits.${key} must be a positive integer`);
      }
    }
  }
  if (config.integrations) {
    for (const [key, value] of Object.entries(config.integrations)) {
      if (typeof value !== 'boolean') fail(`integrations.${key} must be boolean`);
    }
  }
  if (config.roles) {
    for (const role of ROLES) {
      if (partial && !own(config.roles, role)) continue;
      if (role === 'review') {
        if (!Array.isArray(config.roles.review) || config.roles.review.length !== 2) fail('roles.review requires exactly two selectors');
        config.roles.review.forEach((selector, index) => validateSelector(selector, `roles.review[${index}]`));
      } else if (partial) {
        // A role override may supply only controls or fallback; the merged role must be complete.
        assertObject(config.roles[role], `roles.${role}`);
        validateSelector(config.roles[role], `roles.${role}`, false, true);
      } else {
        validateSelector(config.roles[role], `roles.${role}`);
      }
    }
  }
  return config;
}

/** Async precedence: bundled < user < repo < override. Host policy is not config. */
export async function loadConfig({ repo, home, env, override = {}, defaultsPath = DEFAULTS_PATH } = {}) {
  const locations = paths({ repo, home, env });
  let config = validateConfig(await readJson(defaultsPath));
  for (const path of [locations.user, locations.repo]) {
    const layer = validateConfig(await readJson(path, true), { partial: true });
    config = merge(config, layer);
  }
  validateConfig(override, { partial: true });
  return validateConfig(merge(config, override));
}

/** Async setup writes only pstack config, atomically; equal config is not rewritten. */
export async function setupConfig({ input, scope, repo, home, env } = {}) {
  if (!['user', 'repo'].includes(scope)) fail('scope must be user or repo');
  const patch = validateConfig(typeof input === 'string' ? await readJson(input) : input, { partial: true });
  const locations = paths({ repo, home, env });
  const target = locations[scope];
  const existing = validateConfig(await readJson(target, true), { partial: true });
  let config = validateConfig(await readJson(DEFAULTS_PATH));
  if (scope === 'repo') config = merge(config, validateConfig(await readJson(locations.user, true), { partial: true }));
  const stored = merge(existing, patch);
  config = validateConfig(merge(config, stored));
  if (isDeepStrictEqual(existing, stored)) return { path: target, changed: false, config };
  await mkdir(dirname(target), { recursive: true });
  const staging = `${target}.${randomUUID()}.pending`;
  try {
    await writeFile(staging, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await rename(staging, target);
  } finally {
    await unlink(staging).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return { path: target, changed: true, config };
}

function validateModel(model, label) {
  assertObject(model, label);
  if (!nonempty(model.id)) fail(`${label}.id must be a nonempty exact ID`);
  for (const key of ['family', 'provider', 'tier']) {
    if (own(model, key) && !nonempty(model[key])) fail(`${label}.${key} must be a nonempty string`);
  }
  for (const key of ['reasoningEfforts', 'speeds']) {
    if (own(model, key) && (!Array.isArray(model[key]) || !model[key].every(nonempty))) fail(`${label}.${key} must be a string array`);
  }
}

function validateCatalog(catalog) {
  assertObject(catalog, 'catalog');
  if (!Array.isArray(catalog.models)) fail('catalog.models must be an array');
  const ids = new Set();
  catalog.models.forEach((model, index) => {
    validateModel(model, `catalog.models[${index}]`);
    if (ids.has(model.id)) fail(`Duplicate catalog model ID: ${model.id}`);
    ids.add(model.id);
  });
  if (own(catalog, 'selected')) validateModel(catalog.selected, 'catalog.selected');
  if (own(catalog, 'capabilities')) assertObject(catalog.capabilities, 'catalog.capabilities');
}

function validateHostPolicy(policy) {
  assertObject(policy, 'hostPolicy');
  for (const key of ['allowedModelIds', 'deniedModelIds', 'allowedFamilies']) {
    if (own(policy, key) && (!Array.isArray(policy[key]) || !policy[key].every(nonempty))) fail(`hostPolicy.${key} must be a string array`);
  }
  if (own(policy, 'capabilities')) assertObject(policy.capabilities, 'hostPolicy.capabilities');
}

function allowed(model, policy) {
  return (!policy.allowedModelIds || policy.allowedModelIds.includes(model.id))
    && !policy.deniedModelIds?.includes(model.id)
    && (!policy.allowedFamilies || policy.allowedFamilies.includes(model.family));
}

function matches(model, selector) {
  return (selector.id == null || model.id === selector.id)
    && (selector.family == null || model.family === selector.family)
    && (selector.tier == null || model.tier === selector.tier);
}

function controlsFor(model, selector) {
  const controls = {};
  for (const [key, supported] of [['reasoningEffort', 'reasoningEfforts'], ['speed', 'speeds']]) {
    if (selector[key] == null) continue;
    if (!model[supported]?.includes(selector[key])) return { error: `${model.id} does not advertise ${key}=${selector[key]}` };
    controls[key] = selector[key];
  }
  return { controls };
}

function resolveSelector(selector, catalog, policy) {
  const errors = [];
  const attempt = preference => {
    const candidates = catalog.models.filter(model => matches(model, preference));
    for (const model of candidates) {
      if (!allowed(model, policy)) {
        errors.push(`Host policy disallows ${model.id}`);
        continue;
      }
      const result = controlsFor(model, preference);
      if (result.error) errors.push(result.error);
      else return { model: structuredClone(model), controls: result.controls, inherited: false };
    }
    if (!candidates.length) errors.push(`No catalog model matches ${JSON.stringify(preference)}`);
    return null;
  };
  const preferred = attempt(selector);
  if (preferred) return { ...preferred, warnings: [] };
  if (Array.isArray(selector.fallback)) {
    for (const fallback of selector.fallback) {
      const resolved = attempt(fallback);
      if (resolved) return { ...resolved, warnings: [`Using explicit fallback: ${errors.join('; ')}`] };
    }
  } else if (selector.fallback === 'inherit') {
    if (!catalog.selected) return {
      model: null, controls: {}, inherited: true,
      warnings: [`Inheriting selected host model; identity and family are not exposed. Requested controls are not applied. ${errors.join('; ')}`],
    };
    const listed = catalog.models.find(model => model.id === catalog.selected.id);
    if (listed) {
      for (const key of ['family', 'provider', 'tier']) {
        if (own(listed, key) && own(catalog.selected, key) && listed[key] !== catalog.selected[key]) {
          fail(`Conflicting selected catalog metadata for ${key}`);
        }
      }
    }
    const model = merge(catalog.selected, listed ?? {});
    if (!allowed(model, policy)) fail(`Host policy disallows inherited model ${model.id}`);
    return {
      model, controls: {}, inherited: true,
      warnings: [`Inheriting selected host model ${model.id}; requested controls are not applied. ${errors.join('; ')}`],
    };
  }
  fail(`Model resolution stopped: ${errors.join('; ')}`);
}

/** Check two distinct identities; strict requires positively known, distinct families. */
export function checkPanel(members, { mode = 'strict' } = {}) {
  if (!['strict', 'independent-unverified'].includes(mode)) fail('panel mode must be strict or independent-unverified');
  if (!Array.isArray(members) || members.length !== 2) fail('A panel requires exactly two members');
  const models = members.map(member => member?.model ?? member);
  models.forEach((model, index) => validateModel(model, `panel[${index}]`));
  if (models[0].id === models[1].id) fail('A panel requires two independent model identities');
  const families = models.map(model => FAMILIES.includes(model.family) ? model.family : null);
  const crossFamily = families.every(Boolean) && families[0] !== families[1];
  if (mode === 'strict' && !crossFamily) fail('Strict panel requires verified cross-family metadata');
  return {
    mode, crossFamily, verified: crossFamily, families,
    warnings: crossFamily ? [] : ['Independent-unverified panel: no cross-family diversity claim is made.'],
  };
}

/** Routing only, not execution. Exact IDs and controls come only from the supplied catalog. */
export function resolveRole(config, role, { runtime, catalog = { models: [] }, hostPolicy = {}, panelMode = 'strict' } = {}) {
  validateConfig(config);
  if (!ROLES.includes(role)) fail(`Unknown role: ${role}`);
  if (!RUNTIMES.includes(runtime)) fail(`Unknown runtime: ${runtime}`);
  validateCatalog(catalog);
  validateHostPolicy(hostPolicy);
  const runtimePolicy = {
    invoked: false,
    modelSelectionEnforced: false,
    hostPolicyEnforcedByRuntime: false,
    capabilities: RUNTIME_CAPABILITIES[runtime],
    readerTools: ['read', 'search'],
    concurrentWriterIsolation: 'worktree',
    cloudAgent: false,
    disclosure: 'Preferences are not superiority claims. Routing does not invoke a model or enforce runtime policy; host policy remains authoritative.',
  };
  if (role === 'review') {
    if (config.roles.review.length > config.limits.maxWorkers) fail('Review panel exceeds limits.maxWorkers');
    const members = config.roles.review.map(selector => resolveSelector(selector, catalog, hostPolicy));
    if (panelMode === 'strict' && members.some(member => member.inherited)) {
      fail('Strict panel cannot inherit an unavailable configured preference');
    }
    const panel = checkPanel(members, { mode: panelMode });
    return { role, runtime, members, panel, warnings: [...members.flatMap(member => member.warnings), ...panel.warnings], runtimePolicy };
  }
  return { role, runtime, ...resolveSelector(config.roles[role], catalog, hostPolicy), runtimePolicy };
}

/** Explicit capability evidence only. Required unsupported steps throw; optional ones disclose a skip. */
export function requireCapability(capabilities, capability, {
  required = true, hostPolicy = {}, tools, workers = 1, isolation,
} = {}) {
  assertObject(capabilities, 'capabilities');
  validateHostPolicy(hostPolicy);
  if (!nonempty(capability)) fail('capability must be a nonempty string');
  if (typeof required !== 'boolean') fail('required must be boolean');
  if (!Number.isSafeInteger(workers) || workers < 1) fail('workers must be a positive integer');
  let reason;
  if (capabilities[capability] !== true) reason = `${capability} is not explicitly supported`;
  if (hostPolicy.capabilities?.[capability] === false) reason = `Host policy prohibits ${capability}`;
  if (capability === 'cloudAgent') reason = 'Cloud-agent execution is disabled by the standalone runtime profile';
  if (capability === 'readers' && (!Array.isArray(tools) || !tools.length || !tools.every(tool => ['read', 'search'].includes(tool)))) {
    reason = 'Readers require an explicit read/search-only tool allowlist; shell and MCP are prohibited';
  }
  if (capability === 'concurrentWriters' && workers > 1 && isolation !== 'worktree') {
    reason = 'Isolated concurrent writers require worktrees';
  }
  if (reason) {
    if (required) fail(`Required capability unavailable: ${reason}`);
    return { capability, supported: false, skipped: true, reason };
  }
  return { capability, supported: true, skipped: false };
}
