const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function setup() {
  const skill = fs.readFileSync(path.join(__dirname, '../skills/add-read-aloud/SKILL.md'), 'utf8');
  const snippet = skill.match(/```ts\n\/\/ client\n([\s\S]*?)\n```/)[1];
  const requests = [], playing = new Set(), urls = new Set(), audios = [];
  let nextUrl = 0;
  class Audio {
    constructor(url) { this.url = url; this.listeners = {}; audios.push(this); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    pause() { playing.delete(this); }
    async play() { playing.add(this); }
    end() { playing.delete(this); this.listeners.ended(); }
  }
  const context = vm.createContext({
    Audio,
    URL: {
      createObjectURL() { const url = `blob:${++nextUrl}`; urls.add(url); return url; },
      revokeObjectURL(url) { urls.delete(url); },
    },
    fetch() { const request = deferred(); requests.push(request); return request.promise; },
  });
  vm.runInContext(stripTypeScriptTypes(snippet), context);
  const finish = (index) => requests[index].resolve({ ok: true, async blob() { return new Blob(['audio']); } });
  return { context, requests, playing, urls, audios, finish };
}

test('latest request wins when responses arrive out of order', async () => {
  const s = setup();
  const old = s.context.readAloud('old');
  const latest = s.context.readAloud('latest');
  s.finish(1); await latest;
  const latestAudio = s.audios[0];
  s.finish(0); await old;
  assert.equal(s.playing.size, 1);
  assert.ok(s.playing.has(latestAudio));
});

test('stop while a request is pending prevents delayed playback', async () => {
  const s = setup();
  const pending = s.context.readAloud('pending');
  s.context.stop();
  s.finish(0); await pending;
  assert.equal(s.playing.size, 0);
  assert.equal(s.urls.size, 0);
});

test('stopping active playback releases its blob URL', async () => {
  const s = setup();
  const pending = s.context.readAloud('active');
  s.finish(0); await pending;
  s.context.stop();
  assert.equal(s.playing.size, 0);
  assert.equal(s.urls.size, 0);
});

test('replacing active playback releases its blob URL', async () => {
  const s = setup();
  const first = s.context.readAloud('first'); s.finish(0); await first;
  const second = s.context.readAloud('second'); s.finish(1); await second;
  assert.equal(s.playing.size, 1);
  assert.equal(s.urls.size, 1);
});

test('natural completion releases its blob URL', async () => {
  const s = setup();
  const pending = s.context.readAloud('normal'); s.finish(0); await pending;
  s.audios[0].end();
  assert.equal(s.urls.size, 0);
});

test('stop during body download prevents delayed playback', async () => {
  const s = setup();
  const body = deferred();
  const pending = s.context.readAloud('downloading');
  s.requests[0].resolve({ ok: true, blob: () => body.promise });
  await new Promise(setImmediate);
  s.context.stop();
  body.resolve(new Blob(['audio']));
  await pending;
  assert.equal(s.playing.size, 0);
  assert.equal(s.urls.size, 0);
});
