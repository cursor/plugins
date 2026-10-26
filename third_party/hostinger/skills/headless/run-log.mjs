#!/usr/bin/env node
// Hostinger Headless run log: records a build as it happens and writes reports/<run>.json + .html.
//
//   node run-log.mjs <domain> run-start [--kind build|resume|redesign|iterate] [--tool <tool>] [--model <model>] [--skill <version>]
//   node run-log.mjs <domain> run-update [--kind …] [--model …] [--skill …]
//   node run-log.mjs <domain> run-resume [--reason "<text>"]
//   node run-log.mjs <domain> stage-start <stage> [--phase <phase>] [--started-ago 6m | --started-at <ISO time>]
//   node run-log.mjs <domain> stage-end <stage> <result> [--phase <phase>] [--note "<text>"] [--started-ago 6m | --started-at <ISO time>]
//   node run-log.mjs <domain> stage-fix <stage> [--phase <phase>] (--started-ago 6m | --started-at <ISO time>)
//   node run-log.mjs <domain> event <issue|feedback|skill_gap|good> '<json>'
//   node run-log.mjs <domain> report [--outcome live|stopped|failed|abandoned] [--tokens '<json>']
//   node run-log.mjs <domain> unsent
//   node run-log.mjs <domain> report-sent [<run>]
//   node run-log.mjs <domain> report-rejected [<run>]

import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGES = ['connect', 'check_state', 'refine', 'provision', 'content_model', 'design', 'frontend', 'validate', 'deploy', 'done'];
const RESULTS = ['ok', 'ok_after_retries', 'ok_with_fixups', 'failed', 'skipped', 'stopped'];
const OUTCOMES = ['live', 'stopped', 'failed', 'abandoned'];
const EVENT_FIELDS = {
  issue: { required: ['stage', 'symptom'], optional: ['cause', 'workaround', 'severity', 'resolved', 'user_had_to_intervene'] },
  feedback: { required: ['stage', 'category', 'paraphrase'], optional: [] },
  skill_gap: { required: ['skill', 'gap'], optional: ['stage'] },
  good: { required: ['text'], optional: ['stage'] },
};
const EVENT_LISTS = { issue: 'issues', feedback: 'user_feedback', skill_gap: 'skill_gaps', good: 'what_went_well' };

const here = dirname(fileURLToPath(import.meta.url));
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
// A start logged late is kept but marked estimated, so the report can tell measured times from remembered ones.
function lateStart(flags, run) {
  let at = null;
  if (typeof flags['started-at'] === 'string') {
    if (Number.isNaN(Date.parse(flags['started-at']))) fail(`--started-at "${flags['started-at']}" is not a time; use e.g. 2026-10-13T06:26:00Z`);
    at = Date.parse(flags['started-at']);
  } else if (typeof flags['started-ago'] === 'string') {
    const m = flags['started-ago'].match(/^(\d+(?:\.\d+)?)\s*([smh])$/);
    if (!m) fail(`--started-ago "${flags['started-ago']}" should look like 90s, 6m or 1h`);
    at = Date.now() - Number(m[1]) * { s: 1e3, m: 6e4, h: 36e5 }[m[2]];
  }
  if (at === null) return null;
  const clamped = Math.min(Math.max(at, Date.parse(run.started_at)), Date.now());
  return new Date(clamped).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const fail = (message) => {
  console.error(`run-log: ${message}`);
  process.exit(1);
};

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : true;
      flags[key] = value;
    } else positional.push(argv[i]);
  }
  return { positional, flags };
}

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function workspace(domain) {
  if (!domain || domain.startsWith('-')) fail('first argument must be the domain');
  const dir = join(homedir(), '.hostinger', domain);
  if (!existsSync(dir)) fail(`no workspace at ${dir}; connect creates it`);
  return {
    dir,
    domain,
    statePath: join(dir, 'state.json'),
    eventsPath: join(dir, 'events.jsonl'),
    reportsDir: join(dir, 'reports'),
  };
}

const loadState = (ws) => readJson(ws.statePath, {});
function saveState(ws, state) {
  state.updated_at = now();
  writeJson(ws.statePath, state);
}

function currentRun(ws, state) {
  if (!state.run?.id) fail('no run started; call run-start first (check-state does this)');
  return state.run;
}

function readEvents(ws) {
  if (!existsSync(ws.eventsPath)) return [];
  return readFileSync(ws.eventsPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function runStart(ws, flags) {
  const state = loadState(ws);
  // A previous run that never reached its report (closed window, crash) is closed out first, so
  // its log still turns into a report.
  if (state.run?.id && !state.run.reported_at) {
    buildReport(ws, { outcome: 'abandoned' });
    console.log(`closed previous run ${state.run.id} as abandoned`);
  }
  const fresh = loadState(ws);
  const previous = fresh.run ?? {};
  const startedAt = now();
  const connect = readJson(join(ws.dir, 'connect.json'), {});
  // Run ids are the start time; a second run in the same second gets a suffix.
  const taken = new Set([
    ...(fresh.history ?? []).map((h) => h.run),
    ...(existsSync(ws.reportsDir) ? readdirSync(ws.reportsDir).map((f) => f.replace(/\.(json|html)$/, '')) : []),
  ]);
  const base = startedAt.replace(/:/g, '-');
  let id = base;
  for (let n = 2; taken.has(id) || id === fresh.run?.id; n += 1) id = `${base}-${n}`;
  const kind = flags.kind ?? 'build';
  if (!['build', 'resume', 'redesign', 'iterate'].includes(kind)) fail(`unknown kind "${kind}"; one of build, resume, redesign, iterate`);
  fresh.run = {
    id,
    kind,
    started_at: startedAt,
    tool: flags.tool ?? connect.tool ?? fresh.tool ?? previous.tool ?? null,
    model: flags.model ?? previous.model ?? null,
    skill: flags.skill ?? previous.skill ?? null,
  };
  fresh.history ??= [];
  saveState(ws, fresh);
  console.log(`run ${fresh.run.id} started`);
}

function runUpdate(ws, flags) {
  const state = loadState(ws);
  const run = currentRun(ws, state);
  for (const key of ['kind', 'tool', 'model', 'skill']) if (typeof flags[key] === 'string') run[key] = flags[key];
  if (!['build', 'resume', 'redesign', 'iterate'].includes(run.kind)) fail(`unknown kind "${run.kind}"; one of build, resume, redesign, iterate`);
  saveState(ws, state);
  console.log(`run ${run.id} updated`);
}

// A follow-up in the same session (the user asks for a fix right after the final report) belongs
// to the run it follows: reopen it, so the next `report` rewrites that run's report instead of
// starting a second one.
function runResume(ws, flags) {
  const state = loadState(ws);
  const run = currentRun(ws, state);
  if (!run.reported_at) {
    console.log(`run ${run.id} is still open; nothing to resume`);
    return;
  }
  run.follow_ups = [
    ...(run.follow_ups ?? []),
    { resumed_at: now(), after_report_at: run.reported_at, reason: typeof flags.reason === 'string' ? flags.reason : null },
  ];
  delete run.reported_at;
  saveState(ws, state);
  console.log(`run ${run.id} resumed (follow-up ${run.follow_ups.length})`);
}

function stageStart(ws, [stage], flags) {
  if (!STAGES.includes(stage)) fail(`unknown stage "${stage}"; one of ${STAGES.join(', ')}`);
  const state = loadState(ws);
  const run = currentRun(ws, state);
  state.history ??= [];
  const phase = flags.phase ?? null;
  const open = state.history.find((h) => h.run === run.id && h.stage === stage && h.phase === phase && !h.ended_at);
  if (open) {
    console.log(`${stage}${phase ? `/${phase}` : ''} already started at ${open.started_at}`);
    return;
  }
  const late = lateStart(flags, run);
  state.history.push({ run: run.id, stage, phase, started_at: late ?? now(), ended_at: null, result: null, note: null, ...(late ? { start_estimated: true } : {}) });
  saveState(ws, state);
  console.log(`${stage}${phase ? `/${phase}` : ''} started${late ? ` (estimated start ${late})` : ''}`);
}

function stageEnd(ws, [stage, result], flags) {
  if (!STAGES.includes(stage)) fail(`unknown stage "${stage}"`);
  if (!RESULTS.includes(result)) fail(`unknown result "${result}"; one of ${RESULTS.join(', ')}`);
  const state = loadState(ws);
  const run = currentRun(ws, state);
  state.history ??= [];
  const phase = flags.phase ?? null;
  let entry = [...state.history].reverse().find((h) => h.run === run.id && h.stage === stage && h.phase === phase && !h.ended_at);
  if (!entry) {
    // Missed stage-start: use the remembered start if given, else the end of the previous stage; either way estimated.
    const runEntries = state.history.filter((h) => h.run === run.id);
    const lastEnd = runEntries.map((h) => h.ended_at).filter(Boolean).sort().at(-1);
    const late = lateStart(flags, run);
    entry = { run: run.id, stage, phase, started_at: late ?? lastEnd ?? run.started_at, ended_at: null, result: null, note: null, start_estimated: true };
    state.history.push(entry);
    console.log(`${stage}${phase ? `/${phase}` : ''}: stage-start was not logged; start estimated as ${entry.started_at}${late ? '' : ' (end of the previous stage). Pass --started-ago if you know better'}`);
  } else if (flags['started-at'] || flags['started-ago']) {
    entry.started_at = lateStart(flags, run);
    entry.start_estimated = true;
  }
  entry.ended_at = now();
  entry.result = result;
  if (typeof flags.note === 'string') entry.note = flags.note;
  saveState(ws, state);
  console.log(`${stage}${phase ? `/${phase}` : ''} ended: ${result}`);
}

function stageFix(ws, [stage], flags) {
  if (!STAGES.includes(stage)) fail(`unknown stage "${stage}"`);
  const state = loadState(ws);
  const run = currentRun(ws, state);
  const phase = flags.phase ?? null;
  const entry = [...(state.history ?? [])].reverse().find((h) => h.run === run.id && h.stage === stage && h.phase === phase);
  if (!entry) fail(`${stage}${phase ? `/${phase}` : ''} was never logged in this run; use stage-start with --started-ago instead`);
  const late = lateStart(flags, run);
  if (!late) fail('stage-fix needs --started-ago (e.g. 6m) or --started-at <ISO time>');
  if (entry.ended_at && late > entry.ended_at) fail(`the new start ${late} is after the stage ended (${entry.ended_at})`);
  entry.started_at = late;
  entry.start_estimated = true;
  saveState(ws, state);
  console.log(`${stage}${phase ? `/${phase}` : ''} start set to ${late} (estimated)`);
}

function event(ws, [type, raw]) {
  const spec = EVENT_FIELDS[type];
  if (!spec) fail(`unknown event type "${type}"; one of ${Object.keys(EVENT_FIELDS).join(', ')}`);
  let data;
  try {
    data = JSON.parse(raw ?? '');
  } catch {
    fail(`event ${type} needs a JSON object, e.g. '${JSON.stringify(Object.fromEntries(spec.required.map((k) => [k, '…'])))}'`);
  }
  const missing = spec.required.filter((k) => data[k] === undefined || data[k] === '');
  if (missing.length) fail(`event ${type} is missing ${missing.join(', ')}`);
  const unknown = Object.keys(data).filter((k) => !spec.required.includes(k) && !spec.optional.includes(k));
  if (unknown.length) fail(`event ${type} has unknown fields ${unknown.join(', ')}`);
  if (type === 'issue') {
    data.severity ??= 'medium';
    if (!['high', 'medium', 'low'].includes(data.severity)) fail('issue severity must be high, medium or low');
    data.resolved ??= false;
    data.user_had_to_intervene ??= false;
  }
  // A bad line in events.jsonl would fail every later report and run-start.
  validate({ ...data, logged_at: now() }, eventSchema(type), `event ${type}`);
  const state = loadState(ws);
  const run = currentRun(ws, state);
  appendFileSync(ws.eventsPath, `${JSON.stringify({ ts: now(), run: run.id, type, ...data })}\n`);
  console.log(`${type} logged`);
}

const minutesBetween = (a, b) => (a && b ? Math.round(((Date.parse(b) - Date.parse(a)) / 60000) * 10) / 10 : null);

function frontendStack(dir) {
  // Framework is recorded in state.json by the frontend step.
  const state = readJson(join(dir, 'state.json'), {});
  const fe = state.frontend ?? {};
  const framework = fe.framework ?? fe.stack ?? null;
  if (framework) return fe.rendering ? `${framework} (${fe.rendering})` : framework;
  // Fallback: an older build may have a design.md with a "## Stack" heading.
  const design = existsSync(join(dir, 'design.md')) ? readFileSync(join(dir, 'design.md'), 'utf8') : '';
  return design.match(/## Stack\s*\n\s*\*\*([^*]+)\*\*/)?.[1] ?? null;
}

function buildReport(ws, { outcome, tokens } = {}) {
  const state = loadState(ws);
  const run = currentRun(ws, state);
  const site = readJson(join(ws.dir, 'site.json'), {});
  const deploy = readJson(join(ws.dir, 'deploy.json'), {});
  const connect = readJson(join(ws.dir, 'connect.json'), {});
  const history = (state.history ?? []).filter((h) => h.run === run.id);
  // Lines logged before events were checked on write may not match the schema.
  const dropped = [];
  const events = readEvents(ws)
    .filter((e) => e.run === run.id)
    .filter((e) => {
      const { ts, run: _run, type, ...rest } = e;
      const problem = schemaError({ ...rest, logged_at: ts }, eventSchema(type), 'event');
      if (problem) dropped.push({ stage: typeof e.stage === 'string' ? e.stage : 'unknown', phase: null, problem: `left out a malformed ${type} event (${problem})` });
      return !problem;
    });
  const resolvedOutcome = outcome ?? (history.some((h) => h.stage === 'deploy' && h.result?.startsWith('ok')) ? 'live' : 'stopped');
  // A run ends at its last logged activity, so re-running `report` later (after fixing warnings, or
  // when the next run-start closes an abandoned run) doesn't stretch it to "now". Only a stage still
  // open on a live run keeps the clock running.
  const lastActivity = [run.started_at, ...history.flatMap((h) => [h.started_at, h.ended_at]), ...events.map((e) => e.ts)]
    .filter(Boolean)
    .sort()
    .at(-1);
  const stillOpen = resolvedOutcome !== 'abandoned' && history.some((h) => !h.ended_at);
  const endedAt = stillOpen ? now() : lastActivity;
  const stages = history.map((h) => ({ ...h, minutes: minutesBetween(h.started_at, h.ended_at ?? endedAt) }));
  const gaps = [...loggingGaps(stages, run, resolvedOutcome), ...dropped];
  const strip = ({ ts, run: _run, type: _type, ...rest }) => ({ ...rest, logged_at: ts });
  const liveStage = stages.find((s) => s.stage === 'deploy' && s.result?.startsWith('ok'));
  if (!OUTCOMES.includes(resolvedOutcome)) fail(`unknown outcome "${resolvedOutcome}"; one of ${OUTCOMES.join(', ')}`);

  const previous = existsSync(ws.reportsDir)
    ? readdirSync(ws.reportsDir)
        .filter((f) => f.endsWith('.json') && f !== `${run.id}.json`)
        .map((f) => readJson(join(ws.reportsDir, f), {}))
        .sort((a, b) => `${a.timing?.started_at}${a.run?.id}`.localeCompare(`${b.timing?.started_at}${b.run?.id}`))
        .map((r) => ({ run: r.run?.id, kind: r.run?.kind, outcome: r.info?.outcome, minutes: r.timing?.minutes_total, html: `${r.run?.id}.html` }))
    : [];

  const report = {
    schema_version: '1',
    generated_at: now(),
    // Intent, not delivery: delivery is tracked in state.json.
    consent: { sent: true, note: 'Sent to Hostinger automatically at the end of the run.' },
    run: { id: run.id, kind: run.kind, skill: run.skill, follow_ups: run.follow_ups ?? [] },
    info: {
      domain: ws.domain,
      tool: run.tool ?? connect.tool ?? null,
      model: run.model ?? null,
      os: process.platform,
      node: process.version,
      mcp: connect.mcp ?? null,
      backend: site.backend ?? null,
      frontend: frontendStack(ws.dir),
      outcome: resolvedOutcome,
      stopped_at: resolvedOutcome === 'live' ? null : stoppedAt(stages, state),
      live_url: resolvedOutcome === 'live' ? deploy.urls?.site ?? site.urls?.site ?? null : null,
      admin_url: site.urls?.wp_admin ?? null,
    },
    timing: {
      started_at: run.started_at,
      ended_at: endedAt,
      live_at: liveStage?.ended_at ?? null,
      minutes_total: minutesBetween(run.started_at, endedAt),
      minutes_to_live: liveStage ? minutesBetween(run.started_at, liveStage.ended_at) : null,
      stages: stages.map(({ run: _run, ...s }) => s),
    },
    // Not null: the MCP layer treats a null required field as missing, and the API reads {} as an array.
    tokens: tokens ?? { source: 'not reported' },
    issues: events.filter((e) => e.type === 'issue').map(strip),
    user_feedback: events.filter((e) => e.type === 'feedback').map(strip),
    skill_gaps: events.filter((e) => e.type === 'skill_gap').map(strip),
    what_went_well: events.filter((e) => e.type === 'good').map(strip),
    logging_gaps: gaps,
    previous_runs: previous,
  };

  validate(report, reportSchema());
  mkdirSync(ws.reportsDir, { recursive: true });
  writeJson(join(ws.reportsDir, `${run.id}.json`), report);
  writeFileSync(join(ws.reportsDir, `${run.id}.html`), renderHtml(report));
  copyFileSync(join(ws.reportsDir, `${run.id}.html`), join(ws.dir, 'report.html'));

  const fresh = loadState(ws);
  fresh.run.reported_at = now();
  saveState(ws, fresh);
  for (const g of gaps) console.log(`warning: ${g.stage}${g.phase ? `/${g.phase}` : ''}: ${g.problem}`);
  return join(ws.dir, 'report.html');
}

// A report counts as sent only while the sent copy's generated_at matches the file.
function reportFile(ws, runId) {
  const id = runId ?? currentRun(ws, loadState(ws)).id;
  const file = join(ws.reportsDir, `${id}.json`);
  if (!existsSync(file)) fail(`no report for run ${id} at ${file}`);
  return { id, file, generatedAt: readJson(file, {}).generated_at };
}

function unsent(ws) {
  const state = loadState(ws);
  const files = existsSync(ws.reportsDir) ? readdirSync(ws.reportsDir).filter((f) => f.endsWith('.json')).sort() : [];
  // Older reports promised "nothing is uploaded".
  const pending = files
    .map((f) => {
      const report = readJson(join(ws.reportsDir, f), {});
      return { id: f.replace(/\.json$/, ''), file: join(ws.reportsDir, f), generatedAt: report.generated_at, consent: report.consent };
    })
    .filter(({ consent }) => consent?.sent !== false)
    .filter(({ id, generatedAt }) => state.reports_sent?.[id] !== generatedAt && state.reports_rejected?.[id] !== generatedAt);
  if (!pending.length) console.log('no unsent reports');
  for (const { id, file } of pending) console.log(`${id} ${file}`);
}

function reportSent(ws, [runId]) {
  const { id, generatedAt } = reportFile(ws, runId);
  const state = loadState(ws);
  state.reports_sent = { ...state.reports_sent, [id]: generatedAt };
  saveState(ws, state);
  console.log(`report ${id} marked sent`);
}

// A 422 is schema drift, so resending won't help.
function reportRejected(ws, [runId]) {
  const { id, generatedAt } = reportFile(ws, runId);
  const state = loadState(ws);
  state.reports_rejected = { ...state.reports_rejected, [id]: generatedAt };
  saveState(ws, state);
  const run = currentRun(ws, state);
  const symptom = `build report ${id} rejected with 422 by hosting_headless_submit-build-report`;
  appendFileSync(ws.eventsPath, `${JSON.stringify({ ts: now(), run: run.id, type: 'issue', stage: run.reported_at ? 'done' : 'check_state', symptom, severity: 'medium', resolved: false, user_had_to_intervene: false })}\n`);
  console.log(`report ${id} marked rejected; issue logged in run ${run.id}`);
}

// Gaps are printed as warnings by `report`, so guesses never pass as measurements.
const EXPECTED_FOR_BUILD = ['check_state', 'refine', 'provision', 'content_model', 'design', 'frontend', 'validate', 'deploy'];
function loggingGaps(stages, run, outcome) {
  const gaps = [];
  for (const s of stages) {
    if (!s.ended_at) gaps.push({ stage: s.stage, phase: s.phase, problem: 'started but never ended' });
    else if (s.start_estimated) gaps.push({ stage: s.stage, phase: s.phase, problem: 'start time estimated, not measured' });
    else if (Date.parse(s.ended_at) - Date.parse(s.started_at) < 5000) gaps.push({ stage: s.stage, phase: s.phase, problem: 'logged with no duration; probably started and ended in one go after the work' });
  }
  if (run.kind === 'build' && outcome === 'live') {
    for (const stage of EXPECTED_FOR_BUILD) {
      if (!stages.some((s) => s.stage === stage)) gaps.push({ stage, phase: null, problem: 'never logged, though the site went live' });
    }
  }
  return gaps;
}

function stoppedAt(stages, state) {
  const stuck = [...stages].reverse().find((s) => !s.ended_at || s.result === 'failed' || s.result === 'stopped');
  return stuck?.stage ?? state.stage ?? null;
}

// Minimal JSON Schema subset, so reports from different tools share one shape without a dependency.
const reportSchema = () => readJson(join(here, 'report.schema.json'), null);
const eventSchema = (type) => reportSchema()?.properties?.[EVENT_LISTS[type]]?.items ?? null;

function schemaError(value, schema, path = 'report') {
  if (!schema) return null;
  const types = [].concat(schema.type ?? []);
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value;
  if (types.length && !types.includes(actual) && !(actual === 'integer' && types.includes('number'))) {
    return `${path} should be ${types.join(' or ')}, got ${actual}`;
  }
  if (schema.enum && !schema.enum.includes(value)) return `${path} should be one of ${schema.enum.join(', ')}`;
  if (actual === 'object') {
    for (const key of schema.required ?? []) if (!(key in value)) return `${path}.${key} is missing`;
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      const error = key in value ? schemaError(value[key], sub, `${path}.${key}`) : null;
      if (error) return error;
    }
  }
  if (actual === 'array' && schema.items) {
    for (const [i, item] of value.entries()) {
      const error = schemaError(item, schema.items, `${path}[${i}]`);
      if (error) return error;
    }
  }
  return null;
}

function validate(value, schema, path) {
  const error = schemaError(value, schema, path);
  if (error) fail(error);
}

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const label = (s) => String(s ?? '').replace(/_/g, ' ');
const time = (iso) => (iso ? iso.slice(11, 19) : '—');
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : '—');

function gantt(report) {
  const stages = report.timing.stages;
  if (!stages.length) return '<p class="muted">No stages were logged for this run.</p>';
  const t0 = Date.parse(report.timing.started_at);
  const at = (iso) => (Date.parse(iso) - t0) / 60000;
  const total = Math.max(report.timing.minutes_total ?? 1, ...stages.map((s) => at(s.ended_at ?? report.timing.ended_at)), 1);
  const step = [1, 2, 5, 10, 15, 30, 60, 120, 240].find((s) => total / s <= 8) ?? 480;
  const span = Math.ceil(total / step) * step;
  const W = 760;
  const LABEL = 160;
  const ROW = 32;
  const TOP = 32;
  const H = TOP + ROW * stages.length + 32;
  const x = (m) => LABEL + ((W - LABEL - 40) * m) / span;
  const out = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="gantt-title" class="gantt"><title id="gantt-title">Stage timeline, minutes from the start of the run</title>`];
  for (let m = 0; m <= span; m += step) {
    out.push(`<line x1="${x(m).toFixed(1)}" x2="${x(m).toFixed(1)}" y1="${TOP - 8}" y2="${H - 28}" class="grid"/><text x="${x(m).toFixed(1)}" y="${H - 10}" class="tick" text-anchor="middle">${m} min</text>`);
  }
  for (const f of report.run.follow_ups ?? []) {
    const fx = x(at(f.resumed_at)).toFixed(1);
    out.push(`<line x1="${fx}" x2="${fx}" y1="${TOP - 12}" y2="${H - 28}" class="follow-up"/><text x="${Number(fx) + 6}" y="${TOP - 12}" class="follow-up-label">Follow-up</text>`);
  }
  if (report.timing.live_at) {
    const lx = x(at(report.timing.live_at)).toFixed(1);
    out.push(`<line x1="${lx}" x2="${lx}" y1="${TOP - 12}" y2="${H - 28}" class="live"/><text x="${lx - 6}" y="${TOP - 12}" class="live-label" text-anchor="end">Live · ${report.timing.minutes_to_live} min</text>`);
  }
  stages.forEach((s, i) => {
    const y = TOP + i * ROW;
    const a = at(s.started_at);
    const b = at(s.ended_at ?? report.timing.ended_at);
    const width = Math.max(x(b) - x(a), 4);
    const name = `${label(s.stage)}${s.phase ? ` · ${s.phase}` : ''}`;
    const tip = [name, `${s.minutes} min`, s.result ? label(s.result) : 'not finished', s.start_estimated ? 'start estimated' : null, s.note].filter(Boolean).join(' · ');
    const failed = s.result === 'failed' || s.result === 'stopped' || !s.ended_at;
    const fill = failed ? 'url(#hatch)' : s.start_estimated ? 'none' : 'var(--series-1)';
    out.push(`<text x="${LABEL - 12}" y="${(y + ROW / 2 + 4).toFixed(1)}" class="row-label" text-anchor="end">${esc(name)}</text>`);
    out.push(`<g class="bar" tabindex="0" data-tip="${esc(tip)}"><rect x="${LABEL}" y="${y}" width="${W - LABEL - 16}" height="${ROW}" fill="transparent"/><rect x="${x(a).toFixed(1)}" y="${y + 8}" width="${width.toFixed(1)}" height="${ROW - 16}" rx="4" fill="${fill}"${s.start_estimated && !failed ? ' stroke="var(--series-1)" stroke-width="2" stroke-dasharray="4 3"' : ''}/></g>`);
  });
  out.push('<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--series-1)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--surface-1)" stroke-width="2.5"/></pattern></defs></svg>');
  return out.join('');
}

function renderHtml(r) {
  const tile = (name, value, sub = '') => `<div class="tile"><div class="tile-label">${esc(name)}</div><div class="tile-value">${esc(value)}</div><div class="tile-sub">${esc(sub)}</div></div>`;
  const stepped = r.issues.filter((i) => i.user_had_to_intervene).length;
  const rejected = r.user_feedback.filter((f) => f.category === 'design_rejected').length;
  const t = r.tokens && ['input', 'output', 'cache_read', 'cache_write', 'est_cost_usd'].some((k) => r.tokens[k] != null) ? r.tokens : null;
  const tiles = [
    r.timing.minutes_to_live != null
      ? tile('Time to live', `${r.timing.minutes_to_live} min`, 'start of run → deploy finished')
      : tile('Outcome', label(r.info.outcome), r.info.stopped_at ? `stopped at ${label(r.info.stopped_at)}` : ''),
    tile('Run length', `${r.timing.minutes_total} min`, `${r.timing.stages.length} stage entries`),
    tile('Issues', String(r.issues.length), `${stepped} needed the user to step in`),
    tile('User feedback', String(r.user_feedback.length), rejected ? `${rejected} design rejections` : 'corrections and requests'),
    t ? tile('Tokens', fmt((t.input ?? 0) + (t.output ?? 0) + (t.cache_read ?? 0) + (t.cache_write ?? 0)), t.est_cost_usd != null ? `≈ $${t.est_cost_usd} API-equivalent` : t.source ?? '') : tile('Tokens', '—', 'not reported by this tool'),
  ].join('');
  const SEV = { high: ['●', 'critical', 'High'], medium: ['▲', 'serious', 'Medium'], low: ['■', 'warning', 'Low'] };
  const order = ['high', 'medium', 'low'];
  const issues = [...r.issues]
    .sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
    .map((i) => {
      const [icon, cls, name] = SEV[i.severity];
      return `<tr><td><span class="sev sev-${cls}"><span aria-hidden="true">${icon}</span> ${name}</span></td><td>${esc(label(i.stage))}</td><td>${esc(i.symptom)}${i.user_had_to_intervene ? ' <span class="chip">user had to step in</span>' : ''}</td><td>${esc(i.cause)}</td><td>${esc(i.workaround)}</td><td>${i.resolved ? '✓ Resolved' : 'Open'}</td></tr>`;
    })
    .join('');
  const list = (items, render, empty) => (items.length ? `<ul>${items.map(render).join('')}</ul>` : `<p class="muted">${empty}</p>`);
  const stageRows = r.timing.stages
    .map((s) => `<tr><td>${esc(label(s.stage))}${s.phase ? ` · ${esc(s.phase)}` : ''}</td><td>${time(s.started_at)}</td><td>${time(s.ended_at)}</td><td class="num">${s.minutes ?? '—'}</td><td>${esc(label(s.result ?? 'not finished'))}</td><td>${esc(s.note)}</td></tr>`)
    .join('');
  const details = [
    ['Domain', r.info.domain],
    ['Outcome', [label(r.info.outcome), r.info.live_url].filter(Boolean).join(' · ')],
    ['Run', `${r.run.id} · ${r.run.kind}`],
    ['Tool / model', [r.info.tool, r.info.model].filter(Boolean).join(' · ') || '—'],
    ['Stack', [r.info.backend, r.info.frontend].filter(Boolean).join(' + ') || '—'],
    ['Environment', `${r.info.os} · Node ${r.info.node}${r.info.mcp ? ` · ${r.info.mcp}` : ''}`],
    ['Skill version', r.run.skill ?? '—'],
    ...(r.run.follow_ups?.length
      ? [['Follow-ups', r.run.follow_ups.map((f) => `resumed ${time(f.resumed_at)}${f.reason ? ` — ${f.reason}` : ''}`).join('; ')]]
      : []),
  ]
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');
  const tokenTable = t
    ? `<section><h2>Tokens</h2><div class="table-wrap"><table><thead><tr><th class="num">Requests</th><th class="num">Input</th><th class="num">Output</th><th class="num">Cache read</th><th class="num">Cache write</th><th class="num">≈ API cost</th></tr></thead><tbody><tr><td class="num">${fmt(t.requests)}</td><td class="num">${fmt(t.input)}</td><td class="num">${fmt(t.output)}</td><td class="num">${fmt(t.cache_read)}</td><td class="num">${fmt(t.cache_write)}</td><td class="num">${t.est_cost_usd != null ? `$${t.est_cost_usd}` : '—'}</td></tr></tbody></table></div><p class="muted">${esc(t.source ?? '')}</p></section>`
    : '';
  const previous = r.previous_runs.length
    ? `<section><h2>Earlier runs on this domain</h2><ul>${r.previous_runs.map((p) => `<li><a href="${esc(p.html)}">${esc(p.run)}</a> — ${esc(p.kind)} · ${esc(label(p.outcome))}${p.minutes != null ? ` · ${p.minutes} min` : ''}</li>`).join('')}</ul></section>`
    : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Build report — ${esc(r.info.domain)}</title>
<style>
.viz-root { color-scheme: light; --surface-0:#f4f4f2; --surface-1:#fcfcfb; --border:#e2e1dc; --text-primary:#0b0b0b; --text-secondary:#52514e; --text-muted:#6b6a65; --series-1:#2a78d6; --grid:#e8e7e2; --warning:#fab219; --serious:#ec835a; --critical:#d03b3b; }
@media (prefers-color-scheme: dark) { .viz-root { color-scheme: dark; --surface-0:#111110; --surface-1:#1a1a19; --border:#33332f; --text-primary:#f0efec; --text-secondary:#c3c2b7; --text-muted:#a3a299; --series-1:#3987e5; --grid:#2a2a27; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--surface-0); color:var(--text-primary); font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
main { max-width:1080px; margin:0 auto; padding:32px 24px 64px; }
h1 { font-size:28px; line-height:1.2; margin:0 0 4px; } h2 { font-size:18px; margin:0 0 16px; }
a { color:var(--series-1); }
.lede { color:var(--text-secondary); margin:0 0 24px; }
section { background:var(--surface-1); border:1px solid var(--border); border-radius:12px; padding:24px; margin-bottom:24px; }
.tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-bottom:24px; }
.tile { background:var(--surface-1); border:1px solid var(--border); border-radius:12px; padding:16px; }
.tile-label { color:var(--text-secondary); font-size:13px; } .tile-value { font-size:28px; font-weight:650; line-height:1.3; font-variant-numeric:tabular-nums; } .tile-sub { color:var(--text-muted); font-size:13px; }
dl { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:12px 24px; margin:0; } dt { color:var(--text-muted); font-size:13px; } dd { margin:0; overflow-wrap:anywhere; }
.gantt { width:100%; height:auto; display:block; } .grid { stroke:var(--grid); stroke-width:1; } .tick { fill:var(--text-secondary); font-size:12px; } .row-label { fill:var(--text-primary); font-size:13px; text-transform:capitalize; }
.live { stroke:var(--text-primary); stroke-width:2; stroke-dasharray:4 4; } .follow-up { stroke:var(--text-muted); stroke-width:1; stroke-dasharray:2 4; } .follow-up-label { fill:var(--text-muted); font-size:12px; } .live-label { fill:var(--text-primary); font-size:12px; font-weight:600; }
.bar { outline:none; } .bar:hover rect:last-child, .bar:focus rect:last-child { stroke:var(--text-primary); stroke-width:2; }
.legend { display:flex; gap:24px; flex-wrap:wrap; color:var(--text-secondary); font-size:13px; margin-top:8px; } .swatch { display:inline-block; width:24px; height:12px; border-radius:4px; vertical-align:-1px; margin-right:6px; }
.sw-solid { background:var(--series-1); } .sw-est { border:2px dashed var(--series-1); } .sw-hatch { background:repeating-linear-gradient(45deg,var(--series-1) 0 3px,var(--surface-1) 3px 6px); }
#tip { position:fixed; pointer-events:none; background:var(--text-primary); color:var(--surface-1); font-size:13px; padding:8px 12px; border-radius:8px; max-width:340px; opacity:0; transition:opacity .1s; z-index:5; }
table { width:100%; border-collapse:collapse; font-size:14px; } th,td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--border); vertical-align:top; } th { color:var(--text-secondary); font-weight:600; font-size:13px; }
td.num,th.num { text-align:right; font-variant-numeric:tabular-nums; } .table-wrap { overflow-x:auto; }
.sev { white-space:nowrap; font-weight:600; } .sev-critical span { color:var(--critical); } .sev-serious span { color:var(--serious); } .sev-warning span { color:var(--warning); }
.chip { display:inline-block; font-size:12px; padding:0 8px; border-radius:999px; border:1px solid var(--border); color:var(--text-secondary); white-space:nowrap; }
.cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:24px; margin-bottom:24px; } .cols section { margin:0; }
ul { margin:0; padding-left:20px; } li { margin-bottom:8px; } .muted { color:var(--text-muted); font-size:13px; }
code { font-size:13px; background:var(--surface-0); padding:1px 4px; border-radius:4px; }
details summary { cursor:pointer; color:var(--text-secondary); margin-top:16px; }
</style></head><body class="viz-root"><main>
<h1>Build report — ${esc(r.info.domain)}</h1>
<p class="lede">${esc(label(r.run.kind))} run · ${esc(r.timing.started_at.slice(0, 16).replace('T', ' '))} UTC · ${esc(label(r.info.outcome))}</p>
<div class="tiles">${tiles}</div>
<section><h2>Stage timeline</h2>${gantt(r)}
<div class="legend"><span><span class="swatch sw-solid"></span>Finished</span><span><span class="swatch sw-hatch"></span>Failed, stopped or not finished</span><span><span class="swatch sw-est"></span>Start estimated</span><span>Stages can overlap: prep work runs while provisioning settles.</span></div>
<details><summary>Show as table</summary><div class="table-wrap"><table><thead><tr><th>Stage</th><th>Start</th><th>End</th><th class="num">Minutes</th><th>Result</th><th>Note</th></tr></thead><tbody>${stageRows}</tbody></table></div></details></section>
${r.logging_gaps.length ? `<section><h2>Logging gaps (${r.logging_gaps.length})</h2><p class="muted">Where the run log is missing or unsure, so times here are less reliable.</p><ul>${r.logging_gaps.map((g) => `<li><strong>${esc(label(g.stage))}${g.phase ? ` · ${esc(g.phase)}` : ''}</strong> — ${esc(g.problem)}</li>`).join('')}</ul></section>` : ''}
<section><h2>Issues (${r.issues.length})</h2>${r.issues.length ? `<div class="table-wrap"><table><thead><tr><th>Severity</th><th>Stage</th><th>Symptom</th><th>Cause</th><th>Workaround</th><th>Status</th></tr></thead><tbody>${issues}</tbody></table></div>` : '<p class="muted">No issues logged.</p>'}</section>
<div class="cols"><section><h2>User feedback</h2>${list(r.user_feedback, (f) => `<li><span class="chip">${esc(label(f.category))}</span> <span class="muted">${esc(label(f.stage))}</span> — “${esc(f.paraphrase)}”</li>`, 'No feedback logged.')}</section>
<section><h2>Skill gaps</h2>${list(r.skill_gaps, (g) => `<li><code>${esc(g.skill)}</code> — ${esc(g.gap)}</li>`, 'No skill gaps logged.')}</section></div>
<div class="cols"><section><h2>What went well</h2>${list(r.what_went_well, (g) => `<li>${esc(g.text)}</li>`, 'Nothing logged.')}</section>
<section><h2>Run details</h2><dl>${details}</dl></section></div>
${tokenTable}${previous}
</main><div id="tip" role="status"></div>
<script>
const tip = document.getElementById('tip');
const show = (el, x, y) => { tip.textContent = el.dataset.tip; tip.style.left = Math.min(x + 12, innerWidth - 360) + 'px'; tip.style.top = (y + 12) + 'px'; tip.style.opacity = 1; };
document.querySelectorAll('.bar').forEach((el) => {
  el.addEventListener('mousemove', (e) => show(el, e.clientX, e.clientY));
  el.addEventListener('mouseleave', () => (tip.style.opacity = 0));
  el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); });
  el.addEventListener('blur', () => (tip.style.opacity = 0));
});
</script></body></html>
`;
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const [domain, command, ...rest] = positional;
const ws = workspace(domain);
switch (command) {
  case 'run-start':
    runStart(ws, flags);
    break;
  case 'run-update':
    runUpdate(ws, flags);
    break;
  case 'run-resume':
    runResume(ws, flags);
    break;
  case 'stage-start':
    stageStart(ws, rest, flags);
    break;
  case 'stage-end':
    stageEnd(ws, rest, flags);
    break;
  case 'stage-fix':
    stageFix(ws, rest, flags);
    break;
  case 'event':
    event(ws, rest);
    break;
  case 'report': {
    let tokens;
    if (typeof flags.tokens === 'string') {
      try {
        tokens = JSON.parse(flags.tokens);
      } catch {
        fail('--tokens must be JSON, e.g. \'{"input":0,"output":0,"source":"…"}\'');
      }
      // null and {} can't be sent; treat them as not reported.
      if (tokens === null || (typeof tokens === 'object' && !Array.isArray(tokens) && !Object.keys(tokens).length)) tokens = undefined;
      else validate(tokens, { ...reportSchema()?.properties?.tokens, type: 'object' }, '--tokens');
    }
    console.log(`report written: ${buildReport(ws, { outcome: flags.outcome, tokens })}`);
    const { id, file } = reportFile(ws);
    console.log(`send it: pass ${file} unchanged to hosting_headless_submit-build-report, then run report-sent ${id} (or report-rejected ${id} on a 422)`);
    break;
  }
  case 'unsent':
    unsent(ws);
    break;
  case 'report-sent':
    reportSent(ws, rest);
    break;
  case 'report-rejected':
    reportRejected(ws, rest);
    break;
  default:
    fail('command must be run-start, run-update, run-resume, stage-start, stage-end, stage-fix, event, report, unsent, report-sent or report-rejected');
}
