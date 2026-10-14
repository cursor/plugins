const { launch } = require('./browser_launch.js');
const fs = require('fs');
const [,, chrome, base, profile, screenshot] = process.argv;
const pending = new Map(), errors = [];
let browser, socket, counter = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function assert(value, message) { if (!value) throw new Error(message); }
async function main() {
  const started = await launch(chrome, profile);
  browser = started.proc;
  const browserUrl = started.ws;
  const port = new URL(browserUrl).port;
  const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const [resolve, reject] = pending.get(message.id); pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++counter; pending.set(id, [resolve, reject]); socket.send(JSON.stringify({id, method, params}));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async expression => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(100); }
    throw new Error('Timed out: ' + expression);
  };

  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: base + '/#session=claude%3Ah'});
  await until(`document.querySelectorAll('#graph .trace-node').length >= 6`);
  assert(await evaluate(`!document.querySelector('#p-story').hidden && document.querySelector('#p-graph').hidden && document.querySelector('#graph-mode').value === 'execution'`), 'session opens Story with its observed map available');
  assert(await evaluate(`document.querySelectorAll('#view-tabs [data-view]').length === 3 && !document.querySelector('#session-pulse') && !document.querySelector('.story-agent[open]')`), 'primary view starts with three tabs and collapsed agent work');
  await evaluate(`document.querySelector('.story-agent[data-agent="how-agent"] summary').click()`);
  assert(await evaluate(`document.querySelector('.story-agent[data-agent="how-agent"]').open && document.querySelector('.story-agent[data-agent="how-agent"]').textContent.includes('Mechanism confirmed')`), 'Story expands the recorded agent result');
  await evaluate(`document.querySelector('.story-response .text-button').click()`);
  await until(`document.querySelector('#resource-dialog pre')?.textContent.includes('"kind": "message"')`);
  await evaluate(`document.querySelector('#resource-dialog header button').click();document.querySelector('[data-view="workflow"]').click()`);
  await until(`document.querySelector('#graph-wrap').getBoundingClientRect().width > 0`);
  const parallel = await evaluate(`(()=>{const p=id=>document.querySelector('[data-trace-id="agent:'+id+'"]').getAttribute('transform');return {how:p('how-agent'),why:p('why-agent'),synthesis:p('synthesis-agent')};})()`);
  assert(parallel.how.split(',')[1] === parallel.why.split(',')[1], JSON.stringify(parallel));
  assert(parallel.how.split(',')[1] !== parallel.synthesis.split(',')[1], 'later synthesis must not be shown as parallel');
  await evaluate(`document.querySelector('[data-trace-id="agent:how-agent"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await until(`document.querySelector('#marks').textContent.includes('Mechanism confirmed')`);
  assert(await evaluate(`!document.querySelector('#inspector').hidden && document.querySelector('#marks').textContent.includes('test-model')`), 'agent outcome and model visible');
  await evaluate(`document.querySelector('[data-view="resources"]').click()`);
  await until(`document.querySelectorAll('.resource-card').length > 0`);
  await evaluate(`[...document.querySelectorAll('.resource-card')].find(e=>e.textContent.includes('diagram.svg')).querySelector('button').click()`);
  await until(`document.querySelector('#resource-dialog img')?.naturalWidth > 0`);
  await evaluate(`document.querySelector('#resource-dialog header button').click();[...document.querySelectorAll('.resource-tabs button')].find(e=>e.textContent.includes('Source records')).click();document.querySelector('.resource-card button').click()`);
  await until(`document.querySelector('#resource-dialog pre')?.textContent.length === 65536 && !document.querySelector('.source-pagination button:last-child').disabled`);
  await evaluate(`document.querySelector('.source-pagination button:last-child').click()`);
  await until(`document.querySelector('#resource-dialog pre').textContent.includes('original unshortened tail')`);
  await evaluate(`document.querySelector('#resource-dialog header button').click();document.querySelector('[data-view="workflow"]').click();var mode=document.querySelector('#graph-mode');mode.value='blueprint';mode.dispatchEvent(new Event('change'))`);
  await until(`document.querySelectorAll('[data-route]').length === 23`);
  await evaluate(`document.querySelector('[data-route="bug-fix"]').click()`);
  await until(`document.querySelectorAll('#graph .trace-node').length === 21`);
  assert(await evaluate(`document.querySelectorAll('#graph .trace-edge').length === 26 && !!document.querySelector('[data-from="P"][data-to="M"]') && !!document.querySelector('[data-from="N"][data-to="AR"]')`), 'full bug-fix topology');
  await evaluate(`document.querySelector('[data-trace-id="M"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await sleep(200);
  assert(await evaluate(`(()=>{const n=document.querySelector('[data-trace-id="M"]').getBoundingClientRect(),v=document.querySelector('#graph-wrap').getBoundingClientRect();return n.top>=v.top && n.bottom<v.bottom;})()`), 'selected node stays in view after inspector resize');
  const routes = await evaluate(`[...document.querySelectorAll('[data-route]')].map(e=>e.dataset.route)`);
  for(const route of routes){await evaluate(`document.querySelector('[data-route="${route}"]').click()`);assert(await evaluate(`document.querySelectorAll('#graph .trace-node').length > 0`),'empty playbook '+route);}
  await evaluate(`var mode=document.querySelector('#graph-mode');mode.value='execution';mode.dispatchEvent(new Event('change'));document.querySelector('#theme').click()`);
  await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await sleep(300);
  assert(await evaluate(`document.documentElement.scrollWidth === innerWidth && getComputedStyle(document.querySelector('#mobile-request')).display !== 'none' && document.querySelector('#graph-wrap').getBoundingClientRect().height > 350`), 'mobile canvas and request navigation');
  await evaluate(`document.querySelector('[data-view="story"]').click()`);
  assert(await evaluate(`document.documentElement.scrollWidth === innerWidth && !document.querySelector('#p-story').hidden && document.querySelector('.story-agent[data-agent="how-agent"]').open`), 'mobile Story keeps its expanded agent after changing views');
  await evaluate(`document.querySelector('#search-sessions').click()`);
  assert(await evaluate(`document.querySelector('#app').classList.contains('show-sessions') && document.activeElement.id === 'q'`), 'mobile search opens the session browser');
  await evaluate(`document.querySelector('#close-sessions').click();document.querySelector('#session-menu summary').click()`);
  assert(await evaluate(`document.querySelector('#session-menu').open && document.querySelector('[data-view="resources"]').getBoundingClientRect().width > 0`), 'secondary views remain reachable on mobile');
  await evaluate(`document.querySelector('#theme').click()`);
  await evaluate(`document.querySelector('#session-menu').open=false`);
  const payload = await (await fetch(base + '/api/sessions/claude%3Ah')).json();
  const atEvent = async predicate => {
    const index = payload.events.findIndex(predicate);
    assert(index >= 0, 'fixture replay event missing');
    await evaluate(`document.querySelector('#phase-position').value=${index};document.querySelector('#phase-position').dispatchEvent(new Event('input'))`);
    await until(`document.querySelector('#phase-replay').dataset.record === ${JSON.stringify('event:' + payload.events[index].seq)}`);
    return index;
  };
  const replayAvailable = await evaluate(`!document.querySelector('#phase-replay').hidden && document.querySelector('#phase-position').max > 5`);
  assert(replayAvailable, 'session replay is available without a phase record');
  await atEvent(e => e.kind === 'tool_start' && e.id === 'read');
  assert(await evaluate(`document.querySelectorAll('.story-agent').length === 1 && !document.querySelector('#story').textContent.includes('Mechanism confirmed') && !document.querySelector('#story').textContent.includes('diagram.svg')`), 'Story has no future agents, outcomes, or artifacts');
  await evaluate(`document.querySelector('[data-view="activity"]').click()`);
  assert(await evaluate(`document.querySelector('#phase-replay').dataset.mode === 'replay' && document.querySelectorAll('#tl-list .st.run').length === 1 && !document.querySelector('#tl-list').textContent.includes('instruction content')`), 'Activity preserves replay and does not reveal a pending tool result');
  await evaluate(`document.querySelector('#replay-next').click()`);
  assert(await evaluate(`document.querySelector('#tl-list').textContent.includes('instruction content') && !document.querySelector('#tl-list .st.run')`), 'stepping reveals the result at its return event');
  const toolIndex = await atEvent(e => e.kind === 'tool_start' && e.id === 'how-tool');
  await evaluate(`document.querySelector('[data-view="workflow"]').click()`);
  assert(await evaluate(`!!document.querySelector('[data-trace-id="agent:how-agent"].n-active') && !!document.querySelector('[data-trace-id="agent:why-agent"].n-active') && !document.querySelector('[data-trace-id="agent:synthesis-agent"]')`), 'Map shows only the agents running at the selected point');
  await evaluate(`document.querySelector('[data-trace-id="agent:how-agent"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  assert(await evaluate(`!document.querySelector('#marks').textContent.includes('Mechanism confirmed') && !document.querySelector('#marks').textContent.includes('failure visible only after return')`), 'inspector and source events do not leak later output');
  await evaluate(`document.querySelector('[data-view="story"]').click();document.querySelector('.story-agent[data-agent="how-agent"] summary').click()`);
  assert(await evaluate(`document.querySelector('.story-agent[data-agent="how-agent"]').textContent.includes('Working') && !document.querySelector('.story-agent[data-agent="how-agent"]').textContent.includes('Completed')`), 'Story agent state is historical');
  await atEvent(e => e.kind === 'tool_end' && e.id === 'how-tool');
  await evaluate(`document.querySelector('[data-view="activity"]').click()`);
  assert(await evaluate(`!!document.querySelector('#tl-list .is-err') && document.querySelector('#tl-list').textContent.includes('failure visible only after return')`), 'failed tool result appears at its recorded return');
  await evaluate(`document.querySelector('#phase-position').value=${toolIndex};document.querySelector('#phase-position').dispatchEvent(new Event('input'))`);
  assert(await evaluate(`!document.querySelector('#tl-list').textContent.includes('failure visible only after return') && !!document.querySelector('#tl-list .st.run')`), 'rewinding restores a pending tool without leaving stale result text');
  await atEvent(e => e.kind === 'agent_start' && e.agent_id === 'synthesis-agent');
  await evaluate(`document.querySelector('[data-view="workflow"]').click()`);
  assert(await evaluate(`(()=>{const update=[...document.querySelectorAll('#graph .trace-node')].filter(n=>n.textContent.includes('Both explanations returned'));const synthesis=document.querySelector('[data-trace-id="agent:synthesis-agent"]');return update.length===1 && Number(update[0].getAttribute('transform').split(',')[1].replace(')','')) < Number(synthesis.getAttribute('transform').split(',')[1].replace(')',''));})()`), 'parent update appears once, before the later delegation it precedes');
  await evaluate(`document.querySelector('#replay-follow').checked=true;document.querySelector('#replay-follow').dispatchEvent(new Event('change'))`);
  await sleep(200);
  assert(await evaluate(`document.querySelector('#graph .replay-current').getBoundingClientRect().width > 200`), 'mobile Follow keeps the current node readable');
  await evaluate(`document.querySelector('[data-view="activity"]').click();document.querySelector('#phase-position').value=${toolIndex};document.querySelector('#phase-position').dispatchEvent(new Event('input'))`);
  await evaluate(`document.querySelector('#replay-speed').value='4';document.querySelector('#replay-speed').dispatchEvent(new Event('change'));document.querySelector('#phase-play').click()`);
  await until(`Number(document.querySelector('#phase-position').value) > ${toolIndex}`);
  await evaluate(`document.querySelector('#phase-play').click()`);
  const paused = await evaluate(`document.querySelector('#phase-position').value`);
  await sleep(450);
  assert(await evaluate(`document.querySelector('#phase-position').value === ${JSON.stringify(paused)}`), 'pause stops automatic replay');
  await evaluate(`document.querySelector('#phase-position').value=Number(document.querySelector('#phase-position').max)-1;document.querySelector('#phase-position').dispatchEvent(new Event('input'));document.querySelector('#phase-play').click()`);
  await until(`document.querySelector('#phase-position').value === document.querySelector('#phase-position').max && document.querySelector('#phase-play').getAttribute('aria-label') === 'Play session history'`);
  assert(await evaluate(`document.querySelector('#phase-replay').dataset.mode === 'replay'`), 'playback ends at the final captured record');
  await evaluate(`document.querySelector('#phase-latest').click();document.querySelector('[data-view="story"]').click()`);
  assert(await evaluate(`document.querySelector('#phase-replay').dataset.mode === 'live' && document.querySelectorAll('.story-agent').length === 4 && document.querySelector('#story').textContent.includes('Mechanism confirmed')`), 'return to live restores the complete session');
  assert(await evaluate(`document.documentElement.scrollWidth === innerWidth && document.querySelector('#phase-position').getBoundingClientRect().width > 90`), 'replay controls fit on mobile');
  assert(errors.length === 0, JSON.stringify(errors));
  console.log(JSON.stringify({parallel, playbooks:routes.length, sources:true, artifact:true, replay:replayAvailable, errors}));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(() => {
  if (socket) socket.close();
  if (browser) browser.kill('SIGKILL');
});
