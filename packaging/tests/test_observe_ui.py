"""Tests for the `pstack serve` page (observe/ui/index.html) against the contract and the mock server.

    cd packaging && uv run pytest tests/test_observe_ui.py -q

The browser test drives headless Chromium over the DevTools protocol from a small Node script (Node 22
has a global WebSocket), so it needs no Python browser package. Screenshots go to /tmp.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest

TESTS = Path(__file__).resolve().parent
PKG = TESTS.parent
UI = PKG / "src" / "pstack_cli" / "observe" / "ui" / "index.html"
CONTRACT = PKG / "src" / "pstack_cli" / "observe" / "CONTRACT.md"
MOCK = TESTS / "observe_mock_server.py"
LIVE_KEY = "claude:live-7c41-uploader"
SHOTS = Path("/tmp/pstack-observe-ui")


def page():
    return UI.read_text(encoding="utf-8")


def scripts(html):
    return re.findall(r"<script\b([^>]*)>(.*?)</script>", html, flags=re.S | re.I)


def node_bin():
    for c in (shutil.which("node"), os.path.expanduser("~/.local/bin/node")):
        if c and os.path.exists(c):
            return c
    return None


def browser_bin():
    for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        p = shutil.which(name)
        if p:
            return p
    # Playwright's bundled Chromium, when the Python or Node package installed one.
    found = sorted(glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome")))
    return found[-1] if found else None


# ---------- static checks ----------

def test_page_has_no_external_urls_or_resources():
    html = page()
    assert not re.search(r"https?://", html, re.I), "the page must not name any http(s) URL"
    assert not re.search(r"(?<![\w-])(?:ws|wss)://", html, re.I)
    assert not re.search(r"@import", html, re.I)
    # Every url(...) in CSS is a same-document reference (SVG pattern/marker ids).
    for u in re.findall(r"url\(([^)]*)\)", html):
        assert u.strip("'\" ").startswith("#"), f"external css url({u})"
    for attrs, _ in scripts(html):
        assert "src" not in attrs.lower(), "scripts must be inline"
    for tag in re.findall(r"<(?:link|img|iframe|source|video|audio|embed|object)\b[^>]*>", html, re.I):
        for val in re.findall(r"(?:href|src|data)\s*=\s*[\"']([^\"']*)[\"']", tag, re.I):
            assert val.startswith("data:") or val.startswith("#"), f"external resource in {tag}"
    assert "fonts.googleapis" not in html and "cdn" not in html.lower()


def test_inline_scripts_parse_with_node(tmp_path):
    node = node_bin()
    if not node:
        pytest.skip("node not found")
    found = scripts(page())
    assert found, "the page has an inline script"
    for i, (_, body) in enumerate(found):
        f = tmp_path / f"s{i}.js"
        f.write_text(body)
        r = subprocess.run([node, "--check", str(f)], capture_output=True, text=True)
        assert r.returncode == 0, r.stderr


def contract_paths():
    text = CONTRACT.read_text()
    return sorted(set(re.findall(r"`(?:GET )?(/api/[A-Za-z/<>_-]*)", text)))


def test_page_uses_only_contract_api_paths():
    defined = contract_paths()
    assert {"/api/sessions", "/api/sessions/<key>", "/api/routes", "/api/stream"} <= set(defined)
    patterns = [re.compile("^" + re.sub(r"<[^>]+>", "[^/]+", p) + "$") for p in defined]
    used = set(re.findall(r"['\"](/api/[^'\"?]*)", page()))
    assert used, "the page calls the API"
    for u in used:
        # A literal ending in "/" is a prefix the page concatenates a key onto.
        probe = u + "KEY" if u.endswith("/") else u
        assert any(p.match(probe) for p in patterns), f"{u} is not a path the contract defines"
    assert not re.search(r"/__mock", page())


# ---------- mock server ----------

class Mock:
    def __init__(self, speed=4.0, ping=1.0, hold=False):
        self.proc = subprocess.Popen(
            [sys.executable, str(MOCK), "--port", "0", "--speed", str(speed), "--ping", str(ping)]
            + (["--hold"] if hold else []),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        line = self.proc.stdout.readline()
        m = re.search(r"(http://[\d.]+:\d+)/", line)
        if not m:
            self.proc.kill()
            raise RuntimeError(f"mock did not start: {line!r} {self.proc.stderr.read()}")
        self.base = m.group(1)

    def get(self, path, timeout=10):
        with urllib.request.urlopen(self.base + path, timeout=timeout) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read()

    def json(self, path):
        return json.loads(self.get(path)[2])

    def close(self):
        self.proc.kill()
        self.proc.wait(5)


@pytest.fixture
def mock():
    m = Mock()
    try:
        yield m
    finally:
        m.close()


def read_sse(url, want, timeout=15):
    """Read SSE messages until `want(messages)` is true or time runs out."""
    msgs, name, data = [], None, []
    deadline = time.time() + timeout
    with urllib.request.urlopen(url, timeout=timeout) as r:
        assert r.headers.get("Content-Type", "").startswith("text/event-stream")
        while time.time() < deadline:
            line = r.readline().decode()
            if not line:
                break
            line = line.rstrip("\n")
            if line.startswith("event:"):
                name = line[6:].strip()
            elif line.startswith("data:"):
                data.append(line[5:].strip())
            elif line == "" and name:
                msgs.append((name, json.loads("\n".join(data))))
                name, data = None, []
                if want(msgs):
                    break
    return msgs


def test_mock_serves_page_and_contract_api(mock):
    status, ctype, body = mock.get("/")
    assert status == 200 and ctype.startswith("text/html")
    assert body.decode() == page()

    s = mock.json("/api/sessions")
    assert set(s) >= {"sessions", "now"}
    keys = [x["key"] for x in s["sessions"]]
    assert "codex:bulk-3000" in keys and "claude:9a1c2e7b-edge-proxy" in keys
    updated = [x["updated"] for x in s["sessions"]]
    assert updated == sorted(updated, reverse=True), "newest activity first"
    hosts = {x["host"] for x in s["sessions"]}
    assert hosts >= {"claude", "codex", "copilot", "vscode-copilot"}
    for x in s["sessions"]:
        assert set(x) >= {"key", "host", "id", "title", "cwd", "branch", "model", "started", "updated", "state",
                          "last_prompt", "agents_total", "agents_working", "run"}

    d = mock.json("/api/sessions/" + urllib.request.quote("claude:9a1c2e7b-edge-proxy", safe=""))
    assert set(d) >= {"session", "agents", "events", "runs"}
    seqs = [e["seq"] for e in d["events"]]
    assert seqs == sorted(seqs) and len(set(seqs)) == len(seqs)
    run = d["runs"][0]
    assert set(run) >= {"id", "route", "route_title", "task", "created", "linked_by", "phases", "edges", "path",
                        "current", "check", "evidence", "delegates", "findings", "pause"}
    assert run["check"]["complete"] is True
    assert {p["state"] for p in run["phases"]} >= {"done", "skipped", "revisited"}

    bulk = mock.json("/api/sessions/codex%3Abulk-3000")
    assert len(bulk["events"]) == 3000

    routes = mock.json("/api/routes")
    assert "bug-fix" in routes and routes["bug-fix"]["phases"]

    with pytest.raises(urllib.error.HTTPError):
        mock.get("/api/sessions/claude%3Anope")


def test_mock_stream_sends_sessions_then_live_events(mock):
    url = mock.base + "/api/stream?session=" + urllib.request.quote(LIVE_KEY, safe="")
    msgs = read_sse(url, lambda ms: sum(n == "event" for n, _ in ms) >= 6 and any(n == "run" for n, _ in ms))
    names = [n for n, _ in msgs]
    assert names[0] == "sessions"
    events = [d for n, d in msgs if n == "event"]
    assert len(events) >= 6
    assert all(d["session"] == LIVE_KEY for d in events)
    seqs = [d["event"]["seq"] for d in events]
    assert seqs == sorted(seqs)
    assert {"ts", "agent", "kind", "seq"} <= set(events[0]["event"])
    runs = [d for n, d in msgs if n == "run"]
    assert runs and runs[0]["run"]["linked_by"] == "output"

    # Without a session parameter only sessions and ping arrive.
    plain = read_sse(mock.base + "/api/stream", lambda ms: len(ms) >= 3, timeout=4)
    assert {n for n, _ in plain} <= {"sessions", "ping"}


# ---------- headless browser ----------

DRIVER = r"""
const fs = require('fs');
const [,, chrome, base, outdir, profile] = process.argv;
const LIVE = 'claude:live-7c41-uploader';
const out = { errors: [], checks: {}, shots: {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const launch = () => require(__LAUNCH__).launch(chrome, profile, ['--window-size=1500,950']);

async function main() {
  const { proc, ws: browserWs } = await launch();
  try {
    const port = /:(\d+)\//.exec(browserWs)[1];
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
      target = list.find(t => t.type === 'page');
      if (!target) await sleep(100);
    }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pending = new Map();
    ws.onmessage = m => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        out.errors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 600));
      } else if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
        out.errors.push('console.' + msg.params.type + ': ' + msg.params.args.map(a => a.value || a.description).join(' '));
      } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        out.errors.push('log: ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
      } else if (msg.method === 'Network.requestWillBeSent') {
        const u = msg.params.request.url;
        if (!u.startsWith(base) && !u.startsWith('data:')) out.errors.push('external request: ' + u);
      }
    };
    const send = (method, params = {}) => new Promise((res, rej) => {
      const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
    });
    const ev = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('evaluate failed: ' + expression + ' ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
      return r.result.value;
    };
    const waitFor = async (expression, timeout = 15000, label = expression) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await ev(expression)) return true; await sleep(100); }
      throw new Error('timed out waiting for ' + label);
    };
    const shot = async (name, selector) => {
      let clip;
      if (selector) {
        const r = await ev(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x: b.x, y: b.y, width: b.width, height: b.height}; })()`);
        clip = { ...r, scale: 1 };
      }
      const img = await send('Page.captureScreenshot', clip ? { format: 'png', clip } : { format: 'png' });
      const f = outdir + '/' + name + '.png';
      fs.writeFileSync(f, Buffer.from(img.data, 'base64'));
      out.shots[name] = f;
    };
    const key = async (k, code) => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code });
    };
    const mockState = async () => (await fetch(base + '/__mock/state')).json();
    const selectGraphMode = async (mode) => {
      await waitFor(`!!document.querySelector('#graph-mode option[value="${mode}"]:not(:disabled)')`,
        20000, mode + ' graph mode available');
      await ev(`(() => { const select = document.getElementById('graph-mode'); select.value = ${JSON.stringify(mode)}; select.dispatchEvent(new Event('change')); })()`);
      const graph = mode === 'recorded' ? '.workflow-graph' : '.execution-graph';
      await waitFor(`document.getElementById('graph-mode').value === ${JSON.stringify(mode)} && !!document.querySelector('#graph ${graph}')`,
        10000, mode + ' graph rendered');
    };

    await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 950, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: base + '/' });
    // The mock holds its scripted run until the page is open, however long Chrome took to start.
    await fetch(base + '/__mock/start');

    // Session list fills from the stream; the live session appears once the script starts.
    await waitFor(`document.querySelectorAll('#list .srow').length >= 6`, 15000, 'six session rows');
    await waitFor(`document.querySelector('#conn').className === 'live'`, 10000, 'live connection');
    out.checks.rows = await ev(`document.querySelectorAll('#list .srow').length`);
    out.checks.overview = await ev(`document.querySelectorAll('.overview-card').length >= 6 && document.querySelector('.overview-heading h1').textContent === 'Sessions'`);
    out.checks.hostBadges = await ev(`[...new Set([...document.querySelectorAll('#list .host')].map(e => e.textContent))].sort()`);

    // Keyboard: ArrowDown selects the first session, then the next; the hash follows.
    await ev(`document.getElementById('list').focus()`);
    await key('ArrowDown', 40);
    await key('ArrowDown', 40);
    out.checks.keyboardHash = await ev(`location.hash`);
    out.checks.keyboardSel = await ev(`document.querySelector('.srow.sel') && document.querySelector('.srow.sel').dataset.key`);

    // Filters: host chip and search narrow the list.
    await ev(`[...document.querySelectorAll('#hostf .chip')].find(c => c.textContent === 'copilot').click()`);
    await sleep(100);
    out.checks.hostFiltered = await ev(`[...document.querySelectorAll('#list .srow')].map(r => r.dataset.key)`);
    await ev(`[...document.querySelectorAll('#hostf .chip')].find(c => c.textContent === 'all hosts').click()`);
    await ev(`(() => { const q = document.getElementById('q'); q.value = 'invoice'; q.dispatchEvent(new Event('input')); })()`);
    await sleep(100);
    out.checks.searchFiltered = await ev(`[...document.querySelectorAll('#list .srow')].map(r => r.dataset.key)`);
    await ev(`(() => { const q = document.getElementById('q'); q.value = ''; q.dispatchEvent(new Event('input')); })()`);

    // Select the live session and watch the run advance.
    await waitFor(`!!document.querySelector('.srow[data-key="${LIVE}"]')`, 15000, 'live session row');
    await ev(`document.querySelector('.srow[data-key="${LIVE}"]').click()`);
    await waitFor(`location.hash === '#session=' + encodeURIComponent('${LIVE}')`, 5000, 'hash update');
    // A run may arrive after the initial detail fetch, leaving Observed execution selected.
    // Both graphs use .node, so node count alone cannot identify recorded phases.
    // Start there explicitly so this regression is covered regardless of stream/fetch timing.
    await selectGraphMode('execution');
    await selectGraphMode('recorded');
    await waitFor(`document.querySelectorAll('#graph .workflow-graph .node').length === 9`, 20000, 'phase graph of 9 nodes');
    await waitFor(`!!document.querySelector('.story-agent')`, 5000, 'agent work in Story');
    await ev(`window.expandedStoryKey=document.querySelector('.story-agent').dataset.storyKey;document.querySelector('.story-agent summary').click()`);
    let sawActive = false, sawWorking = false, sawRunningTool = false;
    const end = Date.now() + 60000;
    while (Date.now() < end) {
      sawActive = sawActive || await ev(`!!document.querySelector('#graph .workflow-graph .node.n-active')`);
      sawWorking = sawWorking || await ev(`!!document.querySelector('#agents .sdot.working')`);
      sawRunningTool = sawRunningTool || await ev(`!!document.querySelector('#tl-list .st.run')`);
      if ((await mockState()).done) break;
      await sleep(150);
    }
    out.checks.sawActive = sawActive; out.checks.sawWorking = sawWorking; out.checks.sawRunningTool = sawRunningTool;
    await waitFor(`/Complete/.test(document.getElementById('run').textContent)`, 10000, 'run check complete');
    await sleep(600);
    out.checks.storyLive = await ev(`!![...document.querySelectorAll('.story-agent')].find(e => e.dataset.storyKey === window.expandedStoryKey && e.open) && document.querySelector('.story-context').textContent.includes('Recorded workflow') && document.querySelectorAll('.story-request').length === 2`);
    out.checks.final = await ev(`(() => {
      const q = s => document.querySelectorAll(s).length;
      const seqs = [...document.querySelectorAll('#tl-list .ev[data-seq]')].map(e => e.dataset.seq);
      return {
        nodes: q('#graph .workflow-graph .node'), revisited: q('#graph .workflow-graph .node.n-revisited'), skipped: q('#graph .workflow-graph .node.n-skipped'),
        done: q('#graph .workflow-graph .node.n-done'), active: q('#graph .workflow-graph .node.n-active'),
        backTaken: q('#graph .workflow-graph .e.back.taken'), backDeclared: q('#graph .workflow-graph .e.back'), fwdTaken: q('#graph .workflow-graph .e.fwd.taken'),
        nextTaken: q('#graph .workflow-graph .e.next.taken'), counts: [...document.querySelectorAll('#graph .workflow-graph .cnt text')].map(t => t.textContent),
        prompts: q('#tl-list .ev.c-prompt'), turns: q('#tl-list .turn'), rows: seqs.length, uniqueSeq: new Set(seqs).size,
        runningTools: q('#tl-list .st.run'), okTools: q('#tl-list .st.ok'), badTools: q('#tl-list .st.bad'),
        agentNodes: q('#agents .anode'), nestedAgents: q('#agents .atree .atree .anode'), workingAgents: q('#agents .sdot.working'),
        spawnMarkers: q('#tl-list .ev.c-agent'), linkedBy: document.getElementById('run').textContent.includes('from tool output'),
        listRun: (document.querySelector('.srow[data-key="${LIVE}"] .l3') || {}).textContent || ''
      };
    })()`);

    // Clicking a revisited node lists its marks. Wait for the recorded state before clicking.
    await waitFor(`!!document.querySelector('#graph .workflow-graph .node.n-revisited')`, 10000, 'recorded revisited phase');
    await ev(`document.querySelector('#graph .workflow-graph .node.n-revisited').dispatchEvent(new MouseEvent('click', {bubbles: true}))`);
    await waitFor(`document.querySelectorAll('#marks table tr').length >= 3`, 3000, 'marks table');
    out.checks.markRows = await ev(`document.querySelectorAll('#marks table tr').length - 1`);

    await ev(`document.getElementById('phase-position').value=0; document.getElementById('phase-position').dispatchEvent(new Event('input'));`);
    out.checks.replay = await ev(`document.querySelector('#phase-time').textContent.includes('replay') && document.querySelectorAll('#graph .workflow-graph .n-pending').length > 0`);
    await ev(`document.getElementById('phase-latest').click()`);
    out.checks.returnLatest = await ev(`document.querySelector('#phase-latest').hidden && document.querySelectorAll('#graph .workflow-graph .node').length === 9`);
    await shot('list');
    await ev(`document.querySelector('[data-view="workflow"]').click()`);
    await waitFor(`document.getElementById('p-graph').getBoundingClientRect().width > 0`, 3000, 'workflow visible');
    await shot('graph', '#p-graph');
    // These modes describe different evidence. Returning to Recorded phases must restore
    // retries, branch history, and replay controls rather than mixing graph representations.
    await selectGraphMode('execution');
    out.checks.executionMode = await ev(`!!document.querySelector('#graph .trace-node') && !document.querySelector('#graph .workflow-graph') && !document.getElementById('phase-replay').hidden`);
    await selectGraphMode('blueprint');
    out.checks.blueprintMode = await ev(`!!document.querySelector('#graph .trace-node') && document.getElementById('tracking-note').textContent.includes('Definition only') && document.getElementById('phase-replay').hidden`);
    await selectGraphMode('recorded');
    out.checks.recordedRestored = await ev(`document.querySelectorAll('#graph .workflow-graph .node').length === 9 && !!document.querySelector('#graph .workflow-graph .node.n-revisited') && !document.getElementById('phase-replay').hidden`);
    await ev(`document.querySelector('[data-view="journey"]').click()`);
    out.checks.journey = await ev(`document.querySelectorAll('.journey-step').length === 9 && !document.getElementById('p-journey').hidden`);
    await ev(`document.querySelector('[data-view="activity"]').click()`);
    await sleep(150);
    await shot('timeline', '#p-tl');
    out.checks.disclosure = await ev(`!!document.querySelector('.action-detail') && !document.querySelector('.action-detail').open`);
    await ev(`document.querySelector('[data-view="agents"]').click()`);

    // Agent filter: clicking a subagent hides the other agents' rows.
    await ev(`document.querySelector('#agents .anode[data-agent="a-how1"]').click()`);
    await sleep(150);
    out.checks.agentFilter = await ev(`(() => {
      const vis = [...document.querySelectorAll('#tl-list .ev')].filter(e => e.offsetParent !== null && !e.classList.contains('c-prompt'));
      return { visible: vis.length, allMatch: vis.every(e => e.dataset.a.split(' ').includes('a-how1')) };
    })()`);
    await key('Escape', 27);
    // Timeline filter chips.
    await ev(`[...document.querySelectorAll('#tlf .chip')].find(c => c.textContent === 'errors').click()`);
    await sleep(100);
    out.checks.errorsFilter = await ev(`[...document.querySelectorAll('#tl-list .ev')].filter(e => e.offsetParent !== null && !e.classList.contains('c-prompt')).every(e => e.classList.contains('is-err'))`);
    await ev(`[...document.querySelectorAll('#tlf .chip')].find(c => c.textContent === 'all').click()`);

    // Scrolling up pauses auto-scroll and shows "jump to latest".
    await ev(`document.getElementById('tl-scroll').scrollTop = 0; document.getElementById('tl-scroll').dispatchEvent(new Event('scroll'))`);
    await sleep(100);
    out.checks.jumpShown = await ev(`document.getElementById('jump').classList.contains('on')`);
    await ev(`document.getElementById('jump').click()`);
    await sleep(100);
    out.checks.jumpHidden = await ev(`!document.getElementById('jump').classList.contains('on')`);

    // Reconnect: the mock drops every stream; the page backs off, reconnects, and resyncs without duplicates.
    const before = await ev(`document.querySelectorAll('#tl-list .ev[data-seq]').length`);
    await fetch(base + '/__mock/drop');
    await waitFor(`document.querySelector('#conn').className !== 'live'`, 5000, 'disconnect noticed');
    await waitFor(`document.querySelector('#conn').className === 'live'`, 15000, 'reconnected');
    await sleep(800);
    out.checks.reconnect = await ev(`(() => { const s = [...document.querySelectorAll('#tl-list .ev[data-seq]')].map(e => e.dataset.seq); return { rows: s.length, unique: new Set(s).size }; })()`);
    out.checks.reconnectBefore = before;

    // Reload keeps the selected session through the hash.
    await send('Page.reload');
    await waitFor(`!!document.querySelector('.srow.sel')`, 15000, 'selection after reload');
    out.checks.afterReload = await ev(`document.querySelector('.srow.sel').dataset.key`);
    await selectGraphMode('recorded');
    await waitFor(`document.querySelectorAll('#graph .workflow-graph .node').length === 9`, 15000, 'graph after reload');

    // No run: Story is primary, with observed execution available in Map.
    await ev(`document.querySelector('.srow[data-key="copilot:5d2b8e41"]').click()`);
    await waitFor(`!!document.querySelector('#graph .trace-node')`, 8000, 'observed execution');
    out.checks.conversation = await ev(`!document.getElementById('p-story').hidden && document.getElementById('tracking-banner').hidden && !!document.querySelector('[data-view="workflow"]')`);
    out.checks.stalledAmber = await ev(`getComputedStyle(document.querySelector('.srow[data-key="copilot:5d2b8e41"] .state')).color`);

    // 3000 events render quickly.
    const t0 = Date.now();
    await ev(`document.querySelector('.srow[data-key="codex:bulk-3000"]').click()`);
    // tool_start and tool_end share one row, so 3000 events make fewer rows; the header counts events.
    await waitFor(`/^3000 events/.test(document.getElementById('tl-sub').textContent)`, 15000, 'bulk timeline');
    out.checks.bulkMs = Date.now() - t0;
    out.checks.bulkRows = await ev(`document.querySelectorAll('#tl-list .ev').length`);
    const t1 = Date.now();
    await ev(`[...document.querySelectorAll('#tlf .chip')].find(c => c.textContent === 'tools').click()`);
    await ev(`document.body.offsetHeight`);
    out.checks.bulkFilterMs = Date.now() - t1;
    await shot('bulk');

    // Unknown event kinds and keys are ignored.
    await ev(`document.querySelector('.srow[data-key="vscode-copilot:chat-4411"]').click()`);
    await waitFor(`document.querySelectorAll('#tl-list .ev.c-message').length === 1`, 8000, 'vscode session timeline');
    out.checks.unknownKindRows = await ev(`document.querySelectorAll('#tl-list .ev').length`);
    await sleep(300);
  } finally {
    proc.kill('SIGKILL');
  }
}
main().then(() => { console.log(JSON.stringify(out)); process.exit(0); })
  .catch(e => { out.fatal = String(e && e.stack || e); console.log(JSON.stringify(out)); process.exit(0); });
"""


def test_page_in_headless_browser(tmp_path):
    chrome, node = browser_bin(), node_bin()
    if not chrome or not node:
        pytest.skip("no headless browser available (looked for chromium, google-chrome, Playwright's Chromium) or no node")
    SHOTS.mkdir(parents=True, exist_ok=True)
    driver = tmp_path / "driver.js"
    driver.write_text(DRIVER.replace("__LAUNCH__", json.dumps(str(TESTS / "browser_launch.js"))))
    m = Mock(speed=4.0, ping=1.0, hold=True)
    try:
        r = subprocess.run([node, str(driver), chrome, m.base, str(SHOTS), str(tmp_path / "profile")],
                           capture_output=True, text=True, timeout=240)
    finally:
        m.close()
    assert r.stdout.strip(), f"browser driver printed nothing (exit {r.returncode}): {r.stderr[-2000:]}"
    out = json.loads(r.stdout.strip().splitlines()[-1])
    (SHOTS / "results.json").write_text(json.dumps(out, indent=2))
    assert "fatal" not in out, out.get("fatal")
    assert out["errors"] == [], out["errors"]
    c = out["checks"]
    assert c["rows"] >= 6
    assert c["overview"] and c["journey"] and c["disclosure"] and c["conversation"]
    assert c["storyLive"], "live updates preserve the expanded agent and add the next request to Story"
    assert c["replay"] and c["returnLatest"]
    assert c["executionMode"] and c["blueprintMode"] and c["recordedRestored"]
    assert set(c["hostBadges"]) >= {"claude", "codex", "copilot", "vscode-copilot"}
    assert c["keyboardSel"] and c["keyboardHash"].startswith("#session=")
    assert c["hostFiltered"] == ["copilot:5d2b8e41"]
    assert c["searchFiltered"] == ["codex:019f3c55-billing"]
    assert c["sawActive"] and c["sawWorking"] and c["sawRunningTool"]
    f = c["final"]
    assert f["nodes"] == 9 and f["active"] == 0
    assert f["revisited"] >= 3 and f["skipped"] == 2
    assert f["backTaken"] == 1 and f["backDeclared"] >= 4
    assert f["fwdTaken"] >= 1, "root-cause -> implement jumps over the skipped plan"
    assert "1×" in f["counts"]
    assert f["prompts"] == 2 and f["turns"] >= 2
    assert f["rows"] == f["uniqueSeq"] and f["rows"] > 40
    assert f["runningTools"] == 0 and f["okTools"] > 10 and f["badTools"] == 2
    assert f["agentNodes"] == 6 and f["nestedAgents"] == 5 and f["workingAgents"] == 0
    assert f["spawnMarkers"] == 10
    assert f["linkedBy"]
    assert "Bug fix" in f["listRun"] and "complete" in f["listRun"]
    assert c["markRows"] >= 2
    assert c["agentFilter"]["visible"] > 0 and c["agentFilter"]["allMatch"]
    assert c["errorsFilter"]
    assert c["jumpShown"] and c["jumpHidden"]
    assert c["reconnect"]["rows"] == c["reconnect"]["unique"] == c["reconnectBefore"]
    assert c["afterReload"] == LIVE_KEY
    assert c["bulkRows"] > 1500 and c["bulkMs"] < 5000 and c["bulkFilterMs"] < 1000
    assert c["unknownKindRows"] == 4
    for name in ("list", "graph", "timeline"):
        assert Path(out["shots"][name]).stat().st_size > 5000
