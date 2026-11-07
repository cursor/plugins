#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { loadConfig, setupConfig, resolveRole, RUNTIMES } from './lib/pstack-config.mjs';
import { setupModelAgents } from './lib/model-agents.mjs';
import { fileURLToPath } from 'node:url';

async function jsonInput(value, label) {
  try {
    return JSON.parse(value.trim().startsWith('{') ? value : await readFile(value, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot parse ${label}: ${error.message}`);
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries([
      'runtime', 'role', 'catalog', 'repo', 'home', 'input', 'scope', 'override', 'panel-mode',
    ].map(name => [name, { type: 'string' }])),
  });
  if (positionals.length !== 1 || !['show', 'setup', 'resolve', 'agents'].includes(positionals[0])) {
    throw new Error('Usage: pstack-config.mjs show|setup|resolve|agents [--repo PATH] [--override JSON|PATH]; setup --input PATH --scope user|repo; resolve/agents --runtime RUNTIME --role ROLE --catalog PATH; agents --scope user|repo');
  }
  const command = positionals[0];
  if (values.runtime && !RUNTIMES.includes(values.runtime)) throw new Error(`Unknown runtime: ${values.runtime}`);
  if (command !== 'setup' && values.input) throw new Error('--input is setup-only; use --override for explicit config overrides');
  if (!['setup', 'agents'].includes(command) && values.scope) throw new Error('--scope requires setup or agents');
  if (command === 'setup' && values.override) throw new Error('setup accepts --input, not --override');
  const options = { repo: values.repo, home: values.home };
  if (command === 'setup') {
    if (!values.input || !values.scope) throw new Error('setup requires --input and --scope');
    return setupConfig({ ...options, input: values.input, scope: values.scope });
  }
  const config = await loadConfig({
    ...options, override: values.override ? await jsonInput(values.override, 'override') : {},
  });
  if (command === 'show') return config;
  if (!values.runtime || !values.role) throw new Error('resolve requires --runtime and --role');
  const catalog = values.catalog ? await jsonInput(values.catalog, 'catalog') : undefined;
  if (command === 'agents') return setupModelAgents({
    ...options, config, runtime: values.runtime, role: values.role, catalog,
    scope: values.scope, pluginRoot: fileURLToPath(new URL('../', import.meta.url)),
  });
  return resolveRole(config, values.role, {
    runtime: values.runtime,
    catalog,
    panelMode: values['panel-mode'] ?? 'strict',
  });
}

try {
  console.log(JSON.stringify(await main(), null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
}
