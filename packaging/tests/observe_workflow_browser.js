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
  await send('Page.navigate', {url: base + '/#session=claude%3Abrowser-workflow'});
  await until(`document.querySelectorAll('#graph .n-active').length === 3`);
  assert(await evaluate(`!document.querySelector('#p-story').hidden && document.querySelector('.story-context').textContent.includes('Recorded workflow')`), 'tracked sessions also open Story with explicit workflow context');
  await evaluate(`document.querySelector('[data-view="workflow"]').click()`);
  await until(`document.querySelector('#graph-wrap').getBoundingClientRect().width > 0`);
  const parallel = await evaluate(`(() => {
    const a = document.querySelector('[data-id="root-cause/how"]').getBoundingClientRect();
    const b = document.querySelector('[data-id="root-cause/why"]').getBoundingClientRect();
    return a.y === b.y && a.x !== b.x;
  })()`);
  assert(parallel, 'parallel investigation steps must share a row');
  fs.writeFileSync(screenshot, Buffer.from((await send('Page.captureScreenshot', {format: 'png'})).data, 'base64'));
  await evaluate(`document.querySelector('#phase-position').value=document.querySelector('#phase-position').max;document.querySelector('#phase-position').dispatchEvent(new Event('input'))`);
  const frozen = await evaluate(`document.querySelector('#phase-position').value`);
  console.log('parallel-ready');
  await until(`document.querySelector('#phase-latest').textContent.includes('new')`);
  assert(await evaluate(`document.querySelector('#phase-position').value === ${JSON.stringify(frozen)} && document.querySelector('[data-id="verify"]').classList.contains('n-pending') && document.querySelectorAll('#graph .n-active').length === 3`), 'live phase and host updates do not change the paused snapshot');
  await evaluate(`document.querySelector('[data-view="activity"]').click()`);
  assert(await evaluate(`!document.querySelector('#tl-list').textContent.includes('test failed output')`), 'Activity does not reveal incoming tool results during replay');
  await evaluate(`document.querySelector('#phase-latest').click();document.querySelector('[data-view="workflow"]').click()`);
  await until(`document.querySelector('[data-id="verify"]').classList.contains('n-failed') && document.querySelector('[data-id="root-cause"]').textContent.includes('attempt 2')`);
  await evaluate(`document.querySelector('[data-id="verify"]').dispatchEvent(new MouseEvent('click', {bubbles: true}))`);
  await until(`document.querySelector('#marks').textContent.includes('retest mechanism') && document.querySelector('#marks').textContent.includes('test failed output')`);
  const retry = await evaluate(`({
    pendingChild: document.querySelector('[data-id="root-cause/how"]').classList.contains('n-pending'),
    takenReturn: !!document.querySelector('#graph .e.back.taken'),
    command: document.querySelector('#marks').textContent.includes('pytest original_repro.py'),
    evidence: document.querySelector('#marks').textContent.includes('Evidence'),
    active: document.querySelectorAll('#graph .n-active').length
  })`);
  assert(retry.pendingChild && retry.takenReturn && retry.command && retry.evidence && retry.active === 1, JSON.stringify(retry));
  const snapshot = await (await fetch(base + '/api/sessions/claude%3Abrowser-workflow')).json();
  const run = snapshot.runs[0], failed = run.phases.find(p => p.id === 'verify').marks.find(m => m.status === 'failed');
  const target = 'run:' + run.id + ':mark:' + failed.seq;
  const max = await evaluate(`Number(document.querySelector('#phase-position').max)`);
  let found = false;
  for (let i = 0; i <= max; i++) {
    await evaluate(`document.querySelector('#phase-position').value=${i};document.querySelector('#phase-position').dispatchEvent(new Event('input'))`);
    if (await evaluate(`document.querySelector('#phase-replay').dataset.record === ${JSON.stringify(target)}`)) { found = true; break; }
  }
  assert(found, 'verification failure is a replay point');
  assert(await evaluate(`document.querySelector('[data-id="verify"]').classList.contains('n-failed') && document.querySelector('[data-id="root-cause/how"]').classList.contains('n-done') && !document.querySelector('[data-id="root-cause"]').textContent.includes('attempt 2')`), 'historical phases precede the future parent retry');
  await evaluate(`document.querySelector('#phase-position').value=document.querySelector('#phase-position').max;document.querySelector('#phase-position').dispatchEvent(new Event('input'))`);
  assert(await evaluate(`document.querySelector('[data-id="root-cause/how"]').classList.contains('n-pending') && document.querySelector('[data-id="root-cause"]').textContent.includes('attempt 2')`), 'replay resets child state when its parent enters a new attempt');
  assert(errors.length === 0, JSON.stringify(errors));
  console.log(JSON.stringify({parallel, retry, errors}));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(() => {
  if (socket) socket.close();
  if (browser) browser.kill('SIGKILL');
});
