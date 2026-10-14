// Starts headless Chrome for the observe browser tests and resolves with its DevTools socket URL.
// CI runners start Chrome slowly and have a small /dev/shm, so this passes the CI-safe flags, waits
// up to PSTACK_BROWSER_STARTUP_MS (default 60000) for the DevTools line, fails at once with Chrome's
// own output if it exits early, and tries once more with a fresh profile after a timeout.
const { spawn } = require('child_process');

const STARTUP_MS = Number(process.env.PSTACK_BROWSER_STARTUP_MS) || 60000;
const FLAGS = ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0'];

function once(chrome, profile, extra) {
  return new Promise((resolve, reject) => {
    const proc = spawn(chrome, [...FLAGS, '--user-data-dir=' + profile, ...extra, 'about:blank'],
      { stdio: ['ignore', 'ignore', 'pipe'] });
    let output = '';
    const fail = why => { clearTimeout(timer); proc.kill('SIGKILL'); reject(new Error(why + ': ' + output.slice(-2000))); };
    const timer = setTimeout(() => fail('browser startup timed out after ' + STARTUP_MS + 'ms'), STARTUP_MS);
    proc.stderr.on('data', data => {
      output += data;
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(output);
      if (match) { clearTimeout(timer); resolve({ proc, ws: match[1] }); }
    });
    proc.on('error', err => fail('browser failed to start (' + err.message + ')'));
    proc.on('exit', code => fail('browser exited with code ' + code + ' before DevTools was ready'));
  });
}

async function launch(chrome, profile, extra = []) {
  try {
    return await once(chrome, profile, extra);
  } catch (err) {
    if (!/timed out/.test(err.message)) throw err;
    return once(chrome, profile + '-retry', extra);
  }
}

module.exports = { launch };
