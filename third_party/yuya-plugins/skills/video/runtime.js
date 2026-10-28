/* oxlint-disable unicorn/consistent-function-scoping -- every runtime is inlined into one shared <script>; the surrounding block keeps these helpers private instead of global */
// video unit runtime. Registers YESUnits.kinds.video.
//
// Unit contract (shared by every YESUnits kind):
//   factory(root, data, host) -> { show(rest), hide(), locate?(), play?() }
//   root  — the unit's <div class="su-unit" data-unit=ID> (its fragment is already inside)
//   data  — unit.json "data"
//   host  — { saved: {frac, done, ...} | null, setRest(rest), progress(frac), position(rest), complete(),
//             result(r), endActions() -> [{label, primary, run, title?, note?, auto?}], prefs: {get(k), set(k, v)} }
//   `saved` may change while the unit lives (a sibling version of the same unit adds progress); a kind
//   re-reads it on show. Optional, for versions of one unit (course `variants`): locate() returns
//   {at, t, started, playing}, where `at` is a rest that another version with the same shape accepts in
//   show(); play() starts playback (the host calls it from the learner's click).
//   A primary action may carry the next step's headline (title), a line under it (note) and auto (seconds
//   until it runs by itself; any other input cancels). The video's end screen features it over the rest.
// A kind renders only from its own state and reports upward; the host owns hash, storage and navigation.
window.EV = window.EV || { hooks: {}, on(id, fn) { this.hooks[id] = fn; } };
{
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
// control icons: path data shared byte for byte with slides/runtime.js (slides/runtime.test.ts compares them)
const ICONS = {
  play: 'M7 4.8v14.4L19 12z',
  pause: 'M8 5v14M16 5v14',
  toc: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  captions: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM10.5 10.2a2 2 0 1 0 0 3.6M16.5 10.2a2 2 0 1 0 0 3.6',
  captionsOff: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM10.5 10.2a2 2 0 1 0 0 3.6M16.5 10.2a2 2 0 1 0 0 3.6M4 4l16 16',
  help: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.4M12 17h.01',
  maximize: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  restore: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
  volume: 'M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  volumeOff: 'M11 5 6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6',
};
// iOS keeps media volume at the hardware buttons: assigning it is a no-op there, so only mute is offered
const CAN_SET_VOLUME = (() => { try { const a = new Audio(); a.volume = 0.5; return a.volume === 0.5; } catch { return false; } })();
const setIcon = (b, name) => { b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + `<path d="${ICONS[name]}"/></svg>`; };
const lastStartAtOrBefore = (arr, x) => { let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m].start <= x) { ans = m; lo = m + 1; } else hi = m - 1; } return ans; };

// ---------- cast motion: pure functions of t, so a seek renders the same frame as playback ----------
const MOUTH_FPS = 30, BLINK_CELL = 4, BLINK_CLOSED = 0.12, HOP_DUR = 0.2;
const hash01 = (a, b) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d); h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const seedOf = (id) => { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; };
// One blink per 4 s cell at a hashed offset inside it: consecutive blinks land 3–5 s apart, and two seeds never sync.
const blinkClosed = (t, seed) => {
  const x = t + hash01(seed, -1) * BLINK_CELL, k = Math.floor(x / BLINK_CELL), at = k * BLINK_CELL + hash01(seed, k);
  return x >= at && x < at + BLINK_CLOSED;
};
const mouthLevel = (line, t) => {
  if (!line?.mouth || t < line.start || t >= line.end) return 0;
  const c = line.mouth[Math.floor((t - line.start) * MOUTH_FPS)];
  return c === '2' ? 2 : c === '1' ? 1 : 0;
};
const faceAt = (lines, li, who) => {
  for (let i = li; i >= 0; i--) if (lines[i].who === who && lines[i].face) return lines[i].face;
  return 'normal';
};
// 0 → 1 → 0 over the first 200 ms of a line whose speaker differs from the previous line's
const hopAt = (lines, li, t) => {
  const line = lines[li];
  if (!line?.who || (li > 0 && lines[li - 1].who === line.who)) return 0;
  const u = (t - line.start) / HOP_DUR;
  return u >= 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
};
// Faces arrive resolved against normal (characters.py cast_entry); an unknown name shows normal.
const faceOf = (ch, name) => {
  const normal = ch.faces.normal || {}, face = ch.faces[name] || normal;
  return { layers: face.layers || [], mouth: face.mouth || normal.mouth || null, blink: 'blink' in face ? face.blink : (normal.blink ?? null) };
};
// showing `layer` replaces every face layer under its parent group (めたん's eyes are a white and a pupil layer)
const replaces = (layer, p) => { const cut = layer.lastIndexOf('/'); return cut >= 0 && p.startsWith(layer.slice(0, cut + 1)); };
const visibleLayers = (ch, f, level, blinking) => {
  const mouth = f.mouth ? f.mouth[level] ?? f.mouth[0] : null, blink = blinking ? f.blink : null;
  const on = new Set(ch.base || []);
  for (const p of f.layers) if (!(mouth && replaces(mouth, p)) && !(blink && replaces(blink, p))) on.add(p);
  if (mouth) on.add(mouth);
  if (blink) on.add(blink);
  return on;
};
// `facing` is the art's own direction as the viewer sees it; mirror whoever would look away from the board
const mirrored = (side, facing) => (facing || 'left') === side;
window.EV.motion = { blinkClosed, seedOf, mouthLevel, faceAt, hopAt, faceOf, visibleLayers, mirrored, lineAt: lastStartAtOrBefore };
// stage px: the visible figure stands ~330 px above the bottom edge and its full height is drawn at ~530 px
const CHAR_VISIBLE = 330, CHAR_HEIGHT = 530, CHAR_CENTER = 150;

function mountCast(stage, cast) {
  const chars = [];
  cast.forEach((c, i) => {
    if (!c.canvas || !c.layers || !c.faces) return;
    const side = c.side || (i === 0 ? 'left' : 'right');
    const boxOf = (c.base?.length ? c.base : Object.keys(c.layers)).map((p) => c.layers[p]).filter(Boolean);
    const minX = Math.min(...boxOf.map((l) => l.x)), maxX = Math.max(...boxOf.map((l) => l.x + l.w));
    const minY = Math.min(...boxOf.map((l) => l.y)), maxY = Math.max(...boxOf.map((l) => l.y + l.h));
    const s = CHAR_HEIGHT / (maxY - minY), flip = mirrored(side, c.facing);
    const cx = side === 'left' ? CHAR_CENTER : 1280 - CHAR_CENTER, mid = (minX + maxX) / 2;
    const left = cx - (flip ? c.canvas[0] - mid : mid) * s, top = 720 - CHAR_VISIBLE - minY * s;
    const wrap = el('div', `ev-char ${side}`), art = el('div', 'ev-char-art');
    wrap.dataset.who = c.id;
    Object.assign(wrap.style, { left: `${left}px`, top: `${top}px`, width: `${c.canvas[0] * s}px`, height: `${c.canvas[1] * s}px`,
      transformOrigin: `${side === 'left' ? -left : 1280 - left}px ${720 - top}px` });
    Object.assign(art.style, { width: `${c.canvas[0]}px`, height: `${c.canvas[1]}px`,
      // the flip lives on the art inside the box, so the box's hop/shrink transform is untouched
      transform: flip ? `translateX(${c.canvas[0] * s}px) scale(${-s}, ${s})` : `scale(${s})` });
    wrap.classList.toggle('mirrored', flip);
    const imgs = new Map();
    for (const [p, l] of Object.entries(c.layers)) {
      const img = el('img'); img.alt = ''; img.src = l.src; img.hidden = true; img.draggable = false;
      Object.assign(img.style, { left: `${l.x}px`, top: `${l.y}px`, width: `${l.w}px`, height: `${l.h}px` });
      if (l.blend === 'multiply') img.style.mixBlendMode = 'multiply';
      imgs.set(p, img); art.append(img);
    }
    wrap.append(art); stage.append(wrap);
    chars.push({ c, wrap, imgs, seed: seedOf(c.id), faces: new Map(), key: '' });
  });
  return function renderCast(lines, li, t) {
    const line = li >= 0 ? lines[li] : null;
    const hop = hopAt(lines, li, t);
    for (const ch of chars) {
      const name = faceAt(lines, li, ch.c.id);
      if (!ch.faces.has(name)) ch.faces.set(name, faceOf(ch.c, name));
      const f = ch.faces.get(name), speaking = line?.who === ch.c.id;
      const level = speaking ? mouthLevel(line, t) : 0, blinking = !!f.blink && blinkClosed(t, ch.seed);
      ch.wrap.style.setProperty('--hop', speaking ? hop.toFixed(3) : '0');
      const key = `${name}|${level}|${blinking}`;
      if (key === ch.key) continue;
      ch.key = key;
      const on = visibleLayers(ch.c, f, level, blinking);
      for (const [p, img] of ch.imgs) { const hide = !on.has(p); if (img.hidden !== hide) img.hidden = hide; }
    }
  };
}

(window.YESUnits = window.YESUnits || { kinds: {} }).kinds.video = function videoUnit(root, data, host) {
  const TL = data.timeline, lines = TL.lines, scenes = TL.scenes, chapters = TL.chapters;
  const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
  const DONE_RATIO = 0.85;

  // ---------- build the player around the authored scenes ----------
  root.classList.add('ev-video');
  const viewport = el('div', 'ev-viewport'), stage = el('div', 'ev-stage');
  const top = el('div', 'ev-top'), chname = el('div', 'ev-chname'), segs = el('div', 'ev-segs');
  const cast = data.cast?.length ? data.cast : null;
  const CAST_COLORS = ['#d9418c', '#2e9e3a', '#2f6fd0', '#c26a00'];
  const castById = new Map((cast || []).map((c, i) => [c.id, { ...c, color: c.color || CAST_COLORS[i % CAST_COLORS.length] }]));
  top.append(chname, segs); stage.append(top);
  if (cast) { root.classList.add('ev-cast'); stage.append(el('div', 'ev-board')); }
  for (const s of root.querySelectorAll(':scope > section.scene')) stage.append(s);
  const renderCast = cast ? mountCast(stage, cast) : null;
  const cap = el('div', 'ev-cap'), capSpans = [el('span')];
  if (cast) { const inner = el('div', 'ev-cap-in'); capSpans.unshift(el('span', 'ev-cap-edge')); inner.append(...capSpans); cap.append(inner); }
  else cap.append(capSpans[0]);
  stage.append(cap);
  const start = el('div', 'ev-over'), end = el('div', 'ev-over'); end.hidden = true;
  const playBig = el('button', 'ev-play-big', '▶'); playBig.setAttribute('aria-label', '再生');
  const goals = el('ul', 'ev-goals'); for (const g of data.goals || []) goals.append(el('li', null, g));
  start.append(el('p', null, data.kicker || ''), el('h1', null, data.title || ''), goals, playBig,
    el('p', null, `${fmt(TL.duration)} ・ ${chapters.length} チャプター ・ Space で再生/停止、←→ で文送り`));
  end.classList.add('ev-end');
  const endDone = el('p', 'ev-end-done', '✓ 動画を見終わりました'), endTitle = el('h1', null, 'おしまい'), endNote = el('p', 'ev-end-note');
  const endMain = el('div', 'ev-end-main'), endCount = el('p', 'ev-end-count'), endActs = el('div', 'ev-end-links');
  end.append(endDone, endTitle, endNote, endMain, endCount, endActs);
  let autoTimer = null, autoTick = null;
  function cancelAuto() {
    clearTimeout(autoTimer); clearInterval(autoTick); autoTimer = autoTick = null;
    end.classList.remove('ev-counting'); endCount.textContent = '';
  }
  stage.append(start, end); viewport.append(stage);
  const capOut = el('div', 'ev-cap-out');
  const controls = el('div', 'ev-controls');
  const btn = (icon, aria) => { const b = el('button', 'ev-btn'); b.setAttribute('aria-label', aria); b.title = aria; if (icon) setIcon(b, icon); return b; };
  const playBtn = btn('play', '再生/一時停止 (Space)'), time = el('span', 'ev-time', '0:00 / 0:00');
  const seekBar = el('div', 'ev-seek'), fill = el('div', 'ev-seek-fill'), knob = el('div', 'ev-seek-knob');
  seekBar.append(el('div', 'ev-seek-track'), fill, knob);
  chapters.forEach((c, i) => { if (!i) return; const t = el('div', 'ev-seek-tick'); t.style.left = `${(c.start / TL.duration) * 100}%`; seekBar.append(t); });
  const ccBtn = btn('captions', '字幕 (C)'), speedBtn = btn('', '再生速度 (< >)'), trBtn = btn('toc', '文字起こし (T)');
  speedBtn.classList.add('ev-speed');
  const vol = el('div', 'ev-vol'), muteBtn = btn('volume', 'ミュート (M)'), volRange = el('input', 'ev-vol-range');
  Object.assign(volRange, { type: 'range', min: '0', max: '1', step: '0.05' }); volRange.setAttribute('aria-label', '音量 (↑ ↓)');
  vol.append(muteBtn); if (CAN_SET_VOLUME) vol.append(volRange);
  const helpBtn = btn('help', 'キー操作 (?)'); helpBtn.classList.add('ev-help');
  const fsBtn = btn('maximize', '全画面 (F)'); fsBtn.classList.add('ev-fs'); fsBtn.setAttribute('aria-label', '全画面');
  // the key help hangs above the bar inside the player, so it shows in fullscreen too
  const help = el('div', 'ev-pop'); help.hidden = true; help.setAttribute('role', 'dialog');
  const keys = el('div', 'ev-keys');
  for (const [k, v] of [['Space / K', '再生 / 一時停止'], ['← / →', '前 / 次の文'], ['Shift + ← / →', '前 / 次のチャプター'], ['J / L', '5 秒戻る / 進む'],
    ['↑ / ↓', '音量'], ['M', 'ミュート / 解除'], ['C', '字幕 オン / オフ'], ['T', '文字起こし'], ['< / >', '再生速度'], ['F', '全画面 / 終了'], ['Esc', '閉じる / 全画面を終了'], ['?', 'キー操作']]) keys.append(el('kbd', null, k), el('span', null, v));
  help.append(el('h4', null, 'キー操作'), keys);
  controls.append(playBtn, vol, time, seekBar, ccBtn, speedBtn, trBtn, helpBtn, fsBtn, help);
  const tr = el('aside', 'ev-tr'), trButtons = [];
  chapters.forEach((c, i) => {
    tr.append(el('h2', null, `${i + 1}. ${c.title}`));
    lines.forEach((ln, j) => { if (ln.chapter !== c.id) return;
      const b = el('button'), who = castById.get(ln.who);
      if (who) { const n = el('b', 'ev-tr-who', who.name || who.id); n.style.color = who.color; b.append(n, ' '); }
      b.append(ln.text);
      b.addEventListener('click', () => seek(ln.start + 0.01)); trButtons[j] = b; tr.append(b); });
  });
  for (const c of chapters) { const s = el('i'); s.style.setProperty('--w', String(c.end - c.start)); segs.append(s); }
  // 概要欄: description, chapters and credits live under the player, not in the picture
  const credits = data.credits?.length ? data.credits : data.credit ? [data.credit] : [];
  const desc = el('details', 'ev-desc'), descSum = el('summary'), descBody = el('div', 'ev-desc-body');
  descSum.append(el('b', null, '概要'), el('span', 'ev-desc-line', credits.join(' ・ ')));
  const assumes = (Array.isArray(data.assumes) ? data.assumes : []).filter((a) => typeof a === 'string' && a.trim());
  if (assumes.length) {
    const ul = el('ul', 'ev-desc-assumes'); for (const a of assumes) ul.append(el('li', null, a));
    descBody.append(el('h3', null, '前提'), ul);
  }
  if (data.description) descBody.append(el('p', 'ev-desc-text', data.description));
  const chList = el('ol', 'ev-desc-ch');
  for (const c of chapters) {
    const b = el('button'); b.append(el('span', 'ev-desc-time', fmt(c.start)), el('span', null, c.title));
    b.addEventListener('click', () => { start.hidden = true; end.hidden = true; seek(c.start + 0.01); });
    const li = el('li'); li.append(b); chList.append(li);
  }
  descBody.append(el('h3', null, 'チャプター'), chList);
  const sources = (Array.isArray(data.sources) ? data.sources : []).filter((s) => {
    if (!s || typeof s.title !== 'string' || !s.title.trim() || typeof s.url !== 'string') return false;
    try { return ['http:', 'https:'].includes(new URL(s.url).protocol); } catch { return false; }
  });
  if (sources.length) {
    const ul = el('ul', 'ev-desc-sources');
    for (const s of sources) {
      const a = el('a', null, s.title); a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
      const li = el('li'); li.append(a); if (typeof s.note === 'string' && s.note) li.append(el('span', 'ev-desc-note', s.note)); ul.append(li);
    }
    descBody.append(el('h3', null, '出典'), ul);
  }
  if (credits.length) {
    const ul = el('ul', 'ev-desc-credits'); for (const c of credits) ul.append(el('li', null, c));
    descBody.append(el('h3', null, 'クレジット'), ul);
  }
  const terms = data.usageTerms;
  if (terms && typeof terms.text === 'string' && terms.text) {
    const section = el('section', 'ev-desc-terms');
    section.append(el('h3', null, '音声・素材の利用条件'), el('p', null, terms.text));
    const ul = el('ul');
    for (const link of Array.isArray(terms.links) ? terms.links : []) {
      if (!link || typeof link.title !== 'string' || typeof link.url !== 'string') continue;
      try { if (!['http:', 'https:'].includes(new URL(link.url).protocol)) continue; } catch { continue; }
      const a = el('a', null, link.title); a.href = link.url; a.target = '_blank'; a.rel = 'noopener';
      const li = el('li'); li.append(a);
      if (typeof link.note === 'string' && link.note) li.append(el('p', null, link.note));
      ul.append(li);
    }
    section.append(ul); descBody.append(section);
  }
  desc.append(descSum, descBody);
  const audio = new Audio(); audio.preload = 'metadata'; audio.src = data.audio;
  root.append(viewport, capOut, controls, desc, tr, audio);
  const sceneEls = new Map([...stage.querySelectorAll('.scene')].map((e) => [e.dataset.scene, e]));

  // ---------- state ----------
  let t = 0, started = false, active = false, curScene = null, curChapter = null, curLine = -1, capHTML = null, capWho = null, lastCT = null;
  // continue counting from what the host already recorded for this unit
  let watched = (host.saved?.frac || 0) * TL.duration, done = !!host.saved?.done;
  let speedIdx = Math.max(0, SPEEDS.indexOf(+host.prefs.get('speed') || 1));

  // ---------- render(t): the stage is a function of t ----------
  function render(x) {
    t = Math.max(0, Math.min(TL.duration, x));
    const li = lastStartAtOrBefore(lines, t);
    const sc = scenes[Math.max(0, lastStartAtOrBefore(scenes, t))], se = sceneEls.get(sc.id);
    if (curScene !== sc.id) { for (const [id, e] of sceneEls) e.classList.toggle('active', id === sc.id); curScene = sc.id; }
    const line = li >= 0 ? lines[li] : null;
    const idx = line && line.scene === sc.id ? line.idx : -1;
    if (se) {
      se.dataset.line = String(idx);
      for (const b of se.querySelectorAll('[data-at]')) {
        const at = +b.dataset.at, out = b.dataset.out != null ? +b.dataset.out : Infinity;
        b.classList.toggle('on', idx >= at && idx < out);
      }
      let anyFocus = false;
      for (const f of se.querySelectorAll('[data-focus]')) {
        const on = f.dataset.focus.split(',').map(Number).includes(idx);
        f.classList.toggle('focus', on); anyFocus ||= on;
      }
      se.classList.toggle('has-focus', anyFocus);
      const next = lines[li + 1];
      const lp = line ? clamp01((t - line.start) / Math.max(0.01, line.end - line.start)) : 0;
      const gp = line && next ? clamp01((t - line.end) / Math.max(0.01, next.start - line.end)) : 0;
      const p = clamp01((t - sc.start) / Math.max(0.01, sc.end - sc.start));
      se.style.setProperty('--p', p.toFixed(4)); se.style.setProperty('--lp', lp.toFixed(4)); se.style.setProperty('--gp', gp.toFixed(4));
      const hook = window.EV.hooks[sc.id];
      if (hook) hook(se, { t: t - sc.start, line: idx, lp, gp, p });
    }
    // captions (quiz scenes already show their text on screen)
    let html = '';
    if (line && sc.kind !== 'quiz') {
      const hold = Math.min(0.6, (lines[li + 1]?.start ?? TL.duration) - line.end);
      if (t < line.end + hold) {
        const cue = line.cues.find((q) => t >= q.start && t < q.end) || (t >= line.end ? line.cues[line.cues.length - 1] : null);
        html = cue ? cue.html : '';
      }
    }
    const capColor = cast ? castById.get(line?.who)?.color || '#fff' : null;
    if (html !== capHTML) { for (const s of capSpans) s.innerHTML = html; capHTML = html; }
    if (capColor !== capWho) { cap.style.setProperty('--who', capColor); capWho = capColor; }
    if (renderCast) renderCast(lines, li, t);
    const ci = Math.max(0, lastStartAtOrBefore(chapters, t));
    if (curChapter !== ci) {
      curChapter = ci; chname.textContent = '';
      chname.append(el('b', null, `${ci + 1}/${chapters.length}`), document.createTextNode(chapters[ci].title));
    }
    [...segs.children].forEach((s, i) => s.style.setProperty('--f', String(i < ci ? 1 : i > ci ? 0 : clamp01((t - chapters[i].start) / (chapters[i].end - chapters[i].start)))));
    const f = (t / TL.duration) * 100;
    fill.style.width = `${f}%`; knob.style.left = `${f}%`;
    time.textContent = `${fmt(t)} / ${fmt(TL.duration)}`;
    if (li !== curLine) {
      trButtons[curLine]?.classList.remove('now'); trButtons[li]?.classList.add('now');
      if (tr.classList.contains('open')) trButtons[li]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      curLine = li;
    }
  }

  // ---------- playback ----------
  function loop() {
    if (audio.paused) return;
    const ct = audio.currentTime;
    // "watched" counts content actually played forward, so seeking to the end does not complete the unit
    if (lastCT != null && ct > lastCT && ct - lastCT < 1.5) {
      watched += ct - lastCT;
      host.progress(Math.min(1, watched / TL.duration));
      if (!done && watched >= DONE_RATIO * TL.duration) { done = true; host.complete(); }
    }
    lastCT = ct;
    render(ct);
    requestAnimationFrame(loop);
  }
  function play() {
    cancelAuto();
    started = true; start.hidden = true; end.hidden = true;
    if (audio.ended || t >= TL.duration - 0.05) seek(0);
    lastCT = null; audio.playbackRate = SPEEDS[speedIdx];
    audio.play().then(() => requestAnimationFrame(loop)).catch(() => {});
  }
  function toggle() { if (audio.paused) play(); else audio.pause(); }
  function seek(x) { x = Math.max(0, Math.min(TL.duration, x)); try { audio.currentTime = x; } catch {} lastCT = null; render(x); }
  audio.addEventListener('play', () => { setIcon(playBtn, 'pause'); });
  audio.addEventListener('pause', () => {
    setIcon(playBtn, 'play'); wake();
    if (started) { const r = `t=${t.toFixed(1)}`; if (active) host.setRest(r); host.position(r); }
  });
  audio.addEventListener('ended', () => {
    render(TL.duration);
    if (!done) { done = true; host.complete(); }
    cancelAuto(); endMain.textContent = ''; endActs.textContent = '';
    // a host action leaves this unit (next video, quiz, home): drop out of the maximized player first
    const actions = [...host.endActions().map((a) => ({ ...a, run: () => { exitFull(); a.run(); } })),
      { label: 'もう一度見る', run: () => { seek(0); play(); } }];
    const main = actions.find((a) => a.primary) || actions.at(-1);   // nothing next: replay is the main action
    for (const a of actions) {
      const b = el('button', a === main ? 'ev-end-go' : '', a.label);
      b.addEventListener('click', () => { cancelAuto(); a.run(); });
      (a === main ? endMain : endActs).append(b);
    }
    endTitle.textContent = main?.title || data.endTitle || 'おしまい';
    endNote.textContent = main?.note || ''; endNote.hidden = !main?.note;
    end.hidden = false; fit();
    if (main?.auto > 0 && active && !document.documentElement.classList.contains('ev-shot')) {
      let left = Math.round(main.auto);
      const say = () => { endCount.textContent = `${left} 秒後に自動で始まります`; const stay = el('button', null, 'とどまる');
        stay.addEventListener('click', cancelAuto); endCount.append(' ・ ', stay); };
      end.style.setProperty('--auto', `${main.auto}s`); end.classList.add('ev-counting'); say();
      autoTick = setInterval(() => { left -= 1; if (left > 0) say(); }, 1000);
      autoTimer = setTimeout(() => { cancelAuto(); if (active && !end.hidden) main.run(); }, main.auto * 1000);
    }
  });
  const playOrToggle = () => { if (started) toggle(); else play(); };
  playBtn.addEventListener('click', playOrToggle);
  playBig.addEventListener('click', play);
  stage.addEventListener('click', (e) => { if (swallowTap) { swallowTap = false; return; } if (!e.target.closest('button')) playOrToggle(); });

  const lineStep = (d) => { const i = lastStartAtOrBefore(lines, t + 0.05);
    const j = Math.max(0, Math.min(lines.length - 1, (d < 0 && t - lines[Math.max(i, 0)].start > 1.2) ? i : i + d)); seek(lines[j].start + 0.01); };
  const chapterStep = (d) => { const i = Math.max(0, lastStartAtOrBefore(chapters, t + 0.05));
    seek(chapters[Math.max(0, Math.min(chapters.length - 1, i + d))].start + 0.01); };
  const seekFromEvent = (e) => { const r = seekBar.getBoundingClientRect(); seek(clamp01((e.clientX - r.left) / r.width) * TL.duration); };
  let dragging = false;
  seekBar.addEventListener('pointerdown', (e) => { seekBar.setPointerCapture(e.pointerId); dragging = true; seekFromEvent(e); });
  seekBar.addEventListener('pointermove', (e) => { if (dragging) seekFromEvent(e); });
  seekBar.addEventListener('pointerup', () => { dragging = false; });

  const setCC = (on) => { root.classList.toggle('nocap', !on); ccBtn.setAttribute('aria-pressed', String(on)); setIcon(ccBtn, on ? 'captions' : 'captionsOff'); host.prefs.set('cc', on); };
  setCC(host.prefs.get('cc') !== false);
  ccBtn.addEventListener('click', () => setCC(root.classList.contains('nocap')));
  const setSpeed = (i) => { speedIdx = Math.max(0, Math.min(SPEEDS.length - 1, i)); audio.playbackRate = SPEEDS[speedIdx]; speedBtn.textContent = `${SPEEDS[speedIdx]}×`; host.prefs.set('speed', SPEEDS[speedIdx]); };
  setSpeed(speedIdx);
  speedBtn.addEventListener('click', () => setSpeed((speedIdx + 1) % SPEEDS.length));
  const storedVolume = () => { const v = host.prefs.get('volume'); return typeof v === 'number' && v >= 0 && v <= 1 ? v : null; };
  function setVolume(v, muted) {
    if (CAN_SET_VOLUME) { audio.volume = Math.round(clamp01(v) * 20) / 20; volRange.value = String(audio.volume); host.prefs.set('volume', audio.volume); }
    // dragging the slider to 0 reads as muted; raising it again unmutes
    audio.muted = muted || (CAN_SET_VOLUME && audio.volume === 0);
    host.prefs.set('muted', audio.muted);
    vol.style.setProperty('--v', String(audio.muted ? 0 : audio.volume));
    setIcon(muteBtn, audio.muted ? 'volumeOff' : 'volume'); muteBtn.setAttribute('aria-pressed', String(audio.muted));
    const label = audio.muted ? 'ミュート解除 (M)' : 'ミュート (M)'; muteBtn.setAttribute('aria-label', label); muteBtn.title = label;
  }
  setVolume(storedVolume() ?? 1, host.prefs.get('muted') === true);
  // unmuting at 0 would stay silent, so it comes back at an audible level
  muteBtn.addEventListener('click', () => setVolume(audio.muted && audio.volume === 0 ? 0.5 : audio.volume, !audio.muted));
  volRange.addEventListener('input', () => setVolume(+volRange.value, false));
  // ---------- maximize: the Fullscreen API on the player, else the page's viewport (position: fixed) ----------
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const isFull = () => root.classList.contains('ev-full');
  let idleTimer = null, swallowTap = false;
  // maximized and playing, the controls fade after a still moment unless the key help is open; a move, tap or key brings them back
  function wake() {
    root.classList.remove('ev-idle'); clearTimeout(idleTimer);
    if (isFull()) idleTimer = setTimeout(() => { if (isFull() && !audio.paused && help.hidden) root.classList.add('ev-idle'); }, 2500);
  }
  const setHelp = (open) => { help.hidden = !open; wake(); };
  helpBtn.addEventListener('click', () => setHelp(help.hidden));
  document.addEventListener('pointerdown', (e) => { if (!help.hidden && !help.contains(e.target) && !helpBtn.contains(e.target)) setHelp(false); });
  function setFull(on, pseudo) {
    root.classList.toggle('ev-full', on); root.classList.toggle('ev-pseudo', on && pseudo);
    fsBtn.setAttribute('aria-label', on ? '全画面を終了' : '全画面'); fsBtn.title = on ? '全画面を終了 (F)' : '全画面 (F)'; setIcon(fsBtn, on ? 'restore' : 'maximize');
    wake(); fit();
  }
  function enterFull() {
    if (isFull() || document.documentElement.classList.contains('ev-shot')) return;
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    const enabled = document.fullscreenEnabled ?? document.webkitFullscreenEnabled;
    if (!req || enabled === false) { setFull(true, true); return; }
    // fullscreenchange marks the real one; a refusal falls back to filling the page
    try { Promise.resolve(req.call(root)).catch(() => { if (!isFull()) setFull(true, true); }); } catch { setFull(true, true); }
  }
  function exitFull() {
    if (!isFull()) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (fsEl() === root && exit) Promise.resolve(exit.call(document)).catch(() => {});
    setFull(false, false);
  }
  const toggleFull = () => { if (isFull()) exitFull(); else enterFull(); };
  const onFsChange = () => {
    if (fsEl() === root) setFull(true, false);
    else if (isFull() && !root.classList.contains('ev-pseudo')) setFull(false, false);
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  fsBtn.addEventListener('click', toggleFull);
  root.addEventListener('pointermove', () => { if (isFull()) wake(); });
  // a tap that only reveals the faded controls does not also pause
  root.addEventListener('pointerdown', (e) => { swallowTap = root.classList.contains('ev-idle') && e.pointerType !== 'mouse'; if (isFull()) wake(); });

  const toggleTr = () => { tr.classList.toggle('open'); if (tr.classList.contains('open')) trButtons[curLine]?.scrollIntoView({ block: 'center' }); };
  trBtn.addEventListener('click', toggleTr);

  document.addEventListener('keydown', (e) => {
    if (active && autoTimer) cancelAuto();
    if (!active || e.metaKey || e.ctrlKey || e.altKey) return;
    if (isFull()) wake();
    const k = e.key;
    if (k === 'Escape') { if (!help.hidden) { e.preventDefault(); setHelp(false); } else if (isFull()) { e.preventDefault(); exitFull(); } }
    else if (k === '?') setHelp(help.hidden);
    else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFull(); }
    else if (k === ' ' || k === 'k') { e.preventDefault(); playOrToggle(); }
    else if (k === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) chapterStep(1); else lineStep(1); }
    else if (k === 'ArrowLeft') { e.preventDefault(); if (e.shiftKey) chapterStep(-1); else lineStep(-1); }
    else if (k === 'l') seek(t + 5);
    else if (k === 'j') seek(t - 5);
    else if (k === 'c') ccBtn.click();
    else if (k === 't') toggleTr();
    else if (k === '>' || k === '.') setSpeed(speedIdx + 1);
    else if (k === '<' || k === ',') setSpeed(speedIdx - 1);
    else if (k === 'm' || k === 'M') muteBtn.click();
    else if ((k === 'ArrowUp' || k === 'ArrowDown') && CAN_SET_VOLUME) {
      e.preventDefault(); setVolume((audio.muted ? 0 : audio.volume) + (k === 'ArrowUp' ? 0.1 : -0.1), false);
    }
  });
  // A pointer interaction with controls or the transcript also cancels navigation.
  root.addEventListener('pointerdown', () => { if (active) cancelAuto(); }, { capture: true });

  // ---------- layout: scale the 1280x720 stage into whatever box the host gives ----------
  function fit() {
    const box = root.getBoundingClientRect();
    if (!box.width) return;
    const portrait = box.width < 720 && box.height > box.width;
    root.classList.toggle('narrow', box.width < 860);
    root.classList.toggle('portrait', portrait);
    root.classList.toggle('ev-float', isFull() && !portrait);
    if (portrait && cap.parentElement !== capOut) capOut.append(cap);
    if (!portrait && cap.parentElement !== stage) stage.append(cap);
    // on a portrait phone the scaled stage would shrink the end screen's buttons; it sits below at real size
    if (portrait && end.parentElement !== root) viewport.after(end);
    if (!portrait && end.parentElement !== stage) stage.append(end);
    const shot = document.documentElement.classList.contains('ev-shot');
    const pad = shot || isFull() ? 0 : box.width < 860 ? 8 : 20;
    viewport.style.flex = portrait ? 'none' : '';
    viewport.style.height = portrait ? `${(720 * (box.width - pad * 2)) / 1280 + pad * 2}px` : '';
    const vp = viewport.getBoundingClientRect();
    const scale = Math.max(0.1, Math.min((vp.width - pad * 2) / 1280, (vp.height - pad * 2) / 720)), barTop = controls.getBoundingClientRect().top;
    root.style.setProperty('--scale', String(scale));
    root.style.setProperty('--ev-lift', `${Math.max(0, stage.getBoundingClientRect().bottom - barTop) / scale}px`);
    tr.style.bottom = `${Math.max(0, box.bottom - barTop)}px`;
  }
  new ResizeObserver(fit).observe(root);
  desc.addEventListener('toggle', fit);

  // a position as (chapter, scene in chapter, line in scene) indices: versions of one video share the shape, not the times
  const chapterScenes = (c) => scenes.filter((s) => s.chapter === chapters[c]?.id);
  function locate() {
    const li = Math.max(0, lastStartAtOrBefore(lines, t)), line = lines[li];
    const c = chapters.findIndex((x) => x.id === line.chapter), s = chapterScenes(c).findIndex((x) => x.id === line.scene);
    // a deep link past the start screen is a position too, though nothing has played yet
    return { at: `at=${c}.${s}.${line.idx}`, t, started: started || start.hidden, playing: !audio.paused };
  }
  // the line's head, or the chapter's head when this version has no such line
  function timeOfAt(c, s, l) {
    const sc = chapterScenes(c)[s], line = sc && lines.find((x) => x.scene === sc.id && x.idx === l);
    return line ? line.start : chapters[c] ? chapters[c].start : 0;
  }

  // rest: "" | "t=12.3" | "t=12.3&shot" | "<chapter id>" | "at=<chapter>.<scene>.<line>"
  return {
    locate,
    play,
    show(rest) {
      active = true; root.hidden = false; fit();
      if (host.saved) { watched = Math.max(watched, (host.saved.frac || 0) * TL.duration); done ||= !!host.saved.done; }
      // another version of this unit may have changed speed or captions since; only a stored value overrides
      const sp = SPEEDS.indexOf(+host.prefs.get('speed'));
      if (sp >= 0 && sp !== speedIdx) setSpeed(sp);
      const v = storedVolume(), mu = host.prefs.get('muted');
      if ((v != null && CAN_SET_VOLUME && v !== audio.volume) || (typeof mu === 'boolean' && mu !== audio.muted)) setVolume(v ?? audio.volume, mu === true);
      const cc = host.prefs.get('cc');
      if (typeof cc === 'boolean' && cc === root.classList.contains('nocap')) setCC(cc);
      const a = /^at=(\d+)\.(\d+)\.(\d+)$/.exec(rest || '');
      if (a) {
        started = true; start.hidden = true; end.hidden = true;
        seek(timeOfAt(+a[1], +a[2], +a[3]) + 0.01); return;
      }
      const m = /^t=(\d+(?:\.\d+)?)(&shot)?$/.exec(rest || '');
      if (m) {
        if (m[2]) { document.documentElement.classList.add('ev-shot'); fit(); }
        start.hidden = !!m[2] || +m[1] > 0;
        seek(+m[1]); return;
      }
      const ch = chapters.find((x) => x.id === rest);
      start.hidden = !!ch || started; end.hidden = true;
      seek(ch ? ch.start + 0.01 : started ? t : 0);
    },
    hide() { setHelp(false); exitFull(); active = false; cancelAuto(); audio.pause(); tr.classList.remove('open'); root.hidden = true; },
  };
};
}
