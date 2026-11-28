const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

function deferred() {
  let resolve, reject;
  const promise = new Promise((r, j) => { resolve = r; reject = j; });
  return { promise, resolve, reject };
}

function setup({ deferPlay = false, playError } = {}) {
  const skill = fs.readFileSync(path.join(__dirname, '../skills/add-read-aloud/SKILL.md'), 'utf8');
  const snippet = skill.match(/```ts\n\/\/ client\n([\s\S]*?)\n```/)[1];
  const requests = [], playing = new Set(), urls = new Set(), audios = [];
  let nextUrl = 0;
  class Audio {
    constructor(url) { this.url = url; this.listeners = {}; audios.push(this); }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    pause() { playing.delete(this); this.pendingPlay?.reject(Object.assign(new Error("Playback cancelled"), { name: "AbortError" })); }
    async play() {
      if (playError) throw playError;
      playing.add(this);
      if (deferPlay) { this.pendingPlay = deferred(); await this.pendingPlay.promise; }
    }
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


test('stop while play is pending treats pause rejection as cancellation', async () => {
  const s = setup({ deferPlay: true });
  const pending = s.context.readAloud('pending playback'); s.finish(0);
  await new Promise(setImmediate);
  s.context.stop();
  await assert.doesNotReject(pending);
  assert.equal(s.urls.size, 0);
});

test('replacing pending playback does not reject the cancelled request', async () => {
  const s = setup({ deferPlay: true });
  const first = s.context.readAloud('first'); s.finish(0);
  await new Promise(setImmediate);
  const second = s.context.readAloud('second'); s.finish(1);
  await assert.doesNotReject(first);
  await new Promise(setImmediate);
  s.audios[1].pendingPlay.resolve();
  await second;
  assert.equal(s.playing.size, 1);
});

test('an active playback failure still rejects and releases its URL', async () => {
  const s = setup({ playError: new Error('Audio decode failed') });
  const pending = s.context.readAloud('broken'); s.finish(0);
  await assert.rejects(pending, /Audio decode failed/);
  assert.equal(s.urls.size, 0);
});
