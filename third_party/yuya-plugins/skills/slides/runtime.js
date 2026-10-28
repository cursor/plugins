/* slides runtime v1 — copied verbatim into every deck; never edit per deck.
   Deck API (window.YESSlides): scene(name, def), go(slide, step), next(), prev(), sfx(name, n), pageUrl(id, hash), state.
   One page may hold several decks (course units): each is a createDeck() instance; the API acts on the one last shown. */
(() => {
  'use strict';
  const DOTS_MAX = 12;       // more slides than this: a number input instead of dots
  const FLOW_BELOW = 0.45;   // fit scale under which the deck reflows (phones)
  const PAD = 16;

  /* ---------- pure helpers (exported for tests) ---------- */
  function px(v) { return parseFloat(v) || 0; }
  function parseSize(text) {
    const m = /^\s*(\d{3,4})\s*x\s*(\d{3,4})\s*$/.exec(text || '');
    return m ? { w: +m[1], h: +m[2] } : { w: 1280, h: 720 };
  }
  // "#5" | "#5.2" | "#intro" | "#intro.2" → { slide, step } (slide may be an id); anything else → null
  function parseHash(hash) {
    const m = /^#(?:(\d{1,4})|([A-Za-z][\w-]{0,63}))(?:\.(\d{1,3}))?$/.exec(hash || '');
    if (!m) return null;
    return { slide: m[1] ? +m[1] - 1 : m[2], step: m[3] ? +m[3] : 0 };
  }
  // the opening state (slide 1, no step) is the bare URL, so the plain link stays clean
  function formatHash(slide, step) { return slide === 0 && step === 0 ? '' : '#' + (slide + 1) + (step > 0 ? '.' + step : ''); }
  function fitScale(vw, vh, w, h, pad) { return Math.max(0.05, Math.min((vw - 2 * pad) / w, (vh - 2 * pad) / h)); }
  // Links are regular relative, fragment, or HTTP(S) URLs on any static host.
  function pageHref(loc, id, hash, framed) {
    if (!id || /[\x00-\x20<>"'\\]/.test(id) || id.startsWith('//')) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(id) && !/^https?:/i.test(id)) return null;
    const frag = hash && /^#[\w.~!$&*+,;=:@/?%-]{1,255}$/.test(hash) ? hash : '';
    return { href: id + frag, target: /^https?:/i.test(id) || framed ? '_blank' : '' };
  }
  // A build element is shown at `step` when from <= step <= until.
  function buildRange(el) {
    const only = el.getAttribute('data-only');
    if (only != null) return { from: +only || 0, until: +only || 0 };
    const from = +el.getAttribute('data-step') || 0;
    const u = el.getAttribute('data-until');
    return { from, until: u == null ? Infinity : +u };
  }

  /* ---------- page-wide: scene registry, sound, deck instances ---------- */
  const scenes = Object.create(null);
  const decks = [];
  let current = null, started = false;

  /* ---------- sound: opt-in per deck (data-sound), off until the viewer turns it on ---------- */
  // Synthesized one-shots (no audio files). The AudioContext is created by the tap that turns sound on,
  // so browsers never block it; while off every call is a no-op. Sound only doubles what the slide shows.
  const PENTA = [0, 2, 4, 7, 9];
  const snd = { on: false, ac: null, out: null, noise: null };
  function audio() {
    if (snd.ac) { if (snd.ac.state === 'suspended' && snd.ac.resume) snd.ac.resume(); return snd.ac; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      const ac = new AC(), comp = ac.createDynamicsCompressor(), out = ac.createGain();
      out.gain.value = 0.4; out.connect(comp); comp.connect(ac.destination);
      const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      Object.assign(snd, { ac, out, noise: buf });
      return ac;
    } catch { return null; }
  }
  function tone(f, dur, type, vol, at, f2) {
    const ac = snd.ac, t = ac.currentTime + (at || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(snd.out); o.start(t); o.stop(t + dur + 0.03);
  }
  function hiss(dur, vol, f1, f2) {
    const ac = snd.ac, t = ac.currentTime, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = snd.noise; fl.type = 'bandpass'; fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(snd.out); s.start(t); s.stop(t + dur + 0.05);
  }
  const note = k => 523.25 * Math.pow(2, (PENTA[k % 5] + 12 * Math.floor(k / 5)) / 12);
  const SFX = {
    tap: () => tone(880, 0.05, 'square', 0.06),
    step: n => { const f = note(Math.min(Math.max(0, (n | 0) - 1), 14)); tone(f, 0.12, 'triangle', 0.14); tone(f * 2, 0.06, 'sine', 0.04); },
    slide: () => { hiss(0.22, 0.25, 600, 4000); tone(330, 0.18, 'sine', 0.08, 0, 990); },
    pop: () => tone(500, 0.09, 'sine', 0.14, 0, 1300),
    correct: () => [0, 4, 7, 12].forEach((s, k) => tone(523.25 * Math.pow(2, s / 12), 0.14, 'square', 0.08, k * 0.07)),
    wrong: () => tone(170, 0.2, 'sawtooth', 0.09, 0, 110),
    xp: () => { tone(988, 0.07, 'square', 0.07); tone(1319, 0.2, 'square', 0.07, 0.07); },
    levelup: () => [0, 4, 7, 11, 14].forEach((s, k) => tone(392 * Math.pow(2, s / 12), 0.3, 'sawtooth', 0.05, k * 0.06)),
    finale: () => {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, k) => tone(f, 0.16, 'square', 0.08, k * 0.1));
      [1047, 1319, 1568, 2093].forEach(f => tone(f, 1.4, 'sawtooth', 0.03, 0.75));
      for (let k = 0; k < 12; k++) tone(1800 + Math.random() * 2400, 0.08, 'sine', 0.03, 0.8 + k * 0.08);
    },
  };
  function sfx(name, n) {
    if (!snd.on || !SFX[name] || !audio()) return false;
    try { SFX[name](n); return true; } catch { return false; }
  }

  // control icons: path data shared byte for byte with video/runtime.js (runtime.test.ts compares them)
  const ICONS = {
    play: 'M7 4.8v14.4L19 12z',
    pause: 'M8 5v14M16 5v14',
    prev: 'M15 5l-7 7 7 7',
    next: 'M9 5l7 7-7 7',
    replay: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9M4.5 4.5V9H9',
    toc: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    sound: 'M4 9h3l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
    soundOff: 'M4 9h3l5-4v14l-5-4H4zM16 9.5l5 5M21 9.5l-5 5',
    help: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.4M12 17h.01',
    maximize: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
    restore: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
  };
  const setIcon = (b, name) => { b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + `<path d="${ICONS[name]}"/></svg>`; };

  function mk(tag, attrs, text) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  /* ---------- links to other documents ---------- */
  function isFramed() { try { return window.self !== window.top; } catch { return true; } }
  // A host page may resolve data-page links itself (window.YESHost.resolveLink); otherwise the plain rules apply.
  function resolveLink(id, hash) {
    const host = window.YESHost;
    if (host && typeof host.resolveLink === 'function') {
      try {
        const r = host.resolveLink(id, hash, { framed: isFramed() });
        if (r && typeof r.href === 'string') return { href: r.href, target: typeof r.target === 'string' ? r.target : '' };
      } catch { /* fall back to the plain rules */ }
    }
    return pageHref(location, id, hash, isFramed());
  }
  function wireLinks(root) {
    root.querySelectorAll('a[data-page]').forEach(a => {
      const v = a.getAttribute('data-page') || '', i = v.indexOf('#');
      const r = resolveLink(i < 0 ? v : v.slice(0, i), i < 0 ? '' : v.slice(i));
      if (!r) return;
      a.setAttribute('href', r.href);
      if (r.target) { a.setAttribute('target', r.target); a.setAttribute('rel', 'noopener'); } else { a.removeAttribute('target'); }
    });
  }

  /* ---------- deck-independent helpers ---------- */
  function makeCtx(root, bucket, animate) {
    const ctx = {
      root, animate,
      $: sel => root.querySelector(sel), $$: sel => [...root.querySelectorAll(sel)],
      later(ms, fn) { const t = setTimeout(fn, animate ? ms : 0); bucket.push(['t', t]); return t; },
      every(ms, fn) { const t = setInterval(fn, ms); bucket.push(['i', t]); return t; },
    };
    return ctx;
  }
  function clearBucket(b) { b.forEach(([k, t]) => (k === 't' ? clearTimeout(t) : clearInterval(t))); b.length = 0; }
  // Jumps land on end states: finish one-shot CSS keyframe animations too (looping ones keep running).
  function settle(s) {
    if (!s.getAnimations) return;
    s.getAnimations({ subtree: true }).forEach(a => {
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
      if (t && isFinite(t.endTime)) { try { a.finish(); } catch { /* not finishable */ } }
    });
  }
  function editable(t) { return t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'); }

  /* ---------- one deck ---------- */
  // opts.frame: the element that carries data-ss-* and the --ss-* vars (the page root for a standalone deck)
  // opts.mount: where the bar and popover go; opts.standalone: owns the URL fragment and the window
  // opts.isActive(): whether keys and swipes are this deck's; opts.onChange(state, rest): position changed
  function createDeck(deck, opts) {
    const frame = opts.frame, standalone = !!opts.standalone;
    const isActive = opts.isActive || (() => true);
    const S = { cur: -1, step: 0, n: 0, mode: 'fit', playing: null };
    let slides = [], bar, els = {}, sceneRuns = new Map(), stepTimers = [], idleTimer = null;
    function setSound(on) {
      snd.on = !!on && !!audio();
      if (els.sound) { setIcon(els.sound, snd.on ? 'sound' : 'soundOff'); els.sound.setAttribute('aria-pressed', String(snd.on)); }
      if (snd.on) sfx('pop');
    }

    function stepsOf(i) {
      const s = slides[i]; if (!s) return 0;
      if (s._ssSteps != null) return s._ssSteps;
      let max = +s.getAttribute('data-steps') || 0;
      s.querySelectorAll('[data-step],[data-only],[data-until]').forEach(el => {
        const r = buildRange(el); max = Math.max(max, r.from, isFinite(r.until) ? r.until : 0);
      });
      const sc = scenes[s.getAttribute('data-scene')];
      if (sc && sc.steps) max = Math.max(max, sc.steps);
      return (s._ssSteps = max);
    }
    function titleOf(i) {
      const s = slides[i];
      const t = s.getAttribute('data-title') || (s.querySelector('h1,h2,h3') || {}).textContent || '';
      return t.replace(/\s+/g, ' ').trim() || 'Slide ' + (i + 1);
    }
    function resolveSlide(v) {
      if (typeof v === 'number') return Math.max(0, Math.min(S.n - 1, v));
      const i = slides.findIndex(s => s.id === v);
      return i < 0 ? null : i;
    }

    /* ---------- scenes: scripted animation with timers that die with the step or slide ---------- */
    function sceneOf(i) { return slides[i] && scenes[slides[i].getAttribute('data-scene')]; }
    function sceneEnter(i, animate) {
      const sc = sceneOf(i); if (!sc) return;
      const bucket = []; sceneRuns.set(i, bucket);
      try { if (sc.enter) sc.enter(makeCtx(slides[i], bucket, animate)); } catch (e) { console.error(e); }
    }
    function sceneStep(i, k, animate) {
      const sc = sceneOf(i); clearBucket(stepTimers);
      if (!sc || !sc.step) return;
      try { sc.step(makeCtx(slides[i], stepTimers, animate), k); } catch (e) { console.error(e); }
    }
    function sceneLeave(i) {
      const sc = sceneOf(i); clearBucket(stepTimers);
      const b = sceneRuns.get(i); if (b) { clearBucket(b); sceneRuns.delete(i); }
      if (sc && sc.leave) { try { sc.leave(makeCtx(slides[i], [], false)); } catch (e) { console.error(e); } }
    }

    /* ---------- render ---------- */
    function applyBuilds(s, step) {
      s.querySelectorAll('[data-step],[data-only],[data-until]').forEach(el => {
        const r = buildRange(el), on = step >= r.from && step <= r.until;
        el.classList.toggle('on', on);
        el.classList.toggle('now', on && step === r.from);
        el.classList.toggle('past', on && step > r.from);
      });
      const total = stepsOf(S.cur);
      s.querySelectorAll('[data-step-pos]').forEach(el => { el.textContent = total ? 'ステップ ' + step + ' / ' + total : ''; });
    }
    // animate: run transitions; otherwise land on the final state at once (jumps, going back, links).
    function show(i, step, animate) {
      i = Math.max(0, Math.min(S.n - 1, i));
      step = Math.max(0, Math.min(stepsOf(i), step | 0));
      const changed = i !== S.cur;
      const s = slides[i];
      if (changed) {
        stopPlay();
        if (S.cur >= 0) { deck.style.setProperty('--ss-dir', i > S.cur ? '-1' : '1'); sceneLeave(S.cur); slides[S.cur].classList.remove('active'); slides[S.cur].setAttribute('aria-hidden', 'true'); }
        S.cur = i; S.step = step;
        s.classList.add('ss-noanim'); s.classList.remove('ss-in');
        applyBuilds(s, animate ? 0 : step);
        void s.offsetWidth;
        s.classList.add('active'); s.removeAttribute('aria-hidden');
        if (s.scrollTop) s.scrollTop = 0;
        deck.style.setProperty('--ss-dir', '1');
        sceneEnter(i, animate);
        if (animate) { s.classList.remove('ss-noanim'); void s.offsetWidth; s.classList.add('ss-in'); applyBuilds(s, step); }
        else { s.classList.add('ss-in'); void s.offsetWidth; s.classList.remove('ss-noanim'); settle(s); }
        sceneStep(i, step, animate);
      } else {
        S.step = step;
        if (!animate) s.classList.add('ss-noanim');
        applyBuilds(s, step);
        if (!animate) { void s.offsetWidth; s.classList.remove('ss-noanim'); settle(s); }
        sceneStep(i, step, animate);
      }
      current = self;
      renderChrome();
      writeHash();
      // forward moves chime (jumps, going back and links stay quiet); data-sound="manual" leaves it all to the deck
      if (animate && deck.getAttribute('data-sound') !== 'manual') sfx(changed ? 'slide' : 'step', step);
    }
    function next() { if (S.step < stepsOf(S.cur)) show(S.cur, S.step + 1, true); else if (S.cur < S.n - 1) show(S.cur + 1, 0, true); }
    function prev() { if (S.step > 0) show(S.cur, S.step - 1, false); else if (S.cur > 0) show(S.cur - 1, stepsOf(S.cur - 1), false); }
    function nextSlide() { if (S.cur < S.n - 1) show(S.cur + 1, 0, true); }
    function prevSlide() { if (S.cur > 0) show(S.cur - 1, 0, true); }
    function jump(i, step) { const k = resolveSlide(i); if (k == null) return; step = step || 0; show(k, step, step === 0); }
    function replay() { const i = S.cur; S.cur = -2; slides[i].classList.remove('active'); sceneLeave(i); show(i, 0, true); }

    /* ---------- hash ---------- */
    function writeHash() {
      const h = formatHash(S.cur, S.step);
      if (opts.onChange) opts.onChange({ slide: S.cur, step: S.step, steps: stepsOf(S.cur), count: S.n }, h.slice(1));
      if (!standalone || location.hash === h) return;
      try { history.replaceState(null, '', h || location.pathname + location.search); } catch { /* the fragment is a convenience */ }
    }
    function readHash(hash) {
      const h = parseHash(hash == null ? location.hash : hash); if (!h) return false;
      const i = resolveSlide(h.slide); if (i == null) return false;
      if (i === S.cur && Math.min(h.step, stepsOf(i)) === S.step) return true;
      show(i, h.step, false);
      return true;
    }

    /* ---------- layout ---------- */
    // Safe-area insets (notch, home indicator) as px, read from a probe padded with env().
    let probe = null;
    function insets() {
      if (!standalone && !frame.hasAttribute('data-ss-max')) return { t: 0, r: 0, b: 0, l: 0 };
      if (!probe) { probe = mk('div', { class: 'ss-probe', 'aria-hidden': 'true' }); document.body.appendChild(probe); }
      const cs = getComputedStyle(probe);
      return { t: px(cs.paddingTop), r: px(cs.paddingRight), b: px(cs.paddingBottom), l: px(cs.paddingLeft) };
    }
    function layout() {
      const size = parseSize(deck.getAttribute('data-size'));
      const root = frame;
      // clientWidth/Height: innerWidth can grow past the screen on mobile when content overflows
      const box = standalone ? null : frame.getBoundingClientRect();
      const W = box ? box.width : root.clientWidth || window.innerWidth, H = box ? box.height : root.clientHeight || window.innerHeight;
      if (!W || !H) return;
      const ins = insets();
      const landscape = W > H * 1.15;
      // short landscape screens (phones on their side) and a maximized deck give the stage every pixel;
      // the bar floats over it and hides when idle
      const immersive = root.hasAttribute('data-ss-max') || (standalone && landscape && H < 520);
      root.toggleAttribute('data-ss-immersive', immersive);
      const reserve = immersive ? ins.b : (bar.offsetHeight || 48);
      const aw = W - ins.l - ins.r, ah = H - ins.t - reserve;
      const scale = fitScale(aw, ah, size.w, size.h, immersive ? 0 : PAD);
      const flowAllowed = deck.getAttribute('data-flow') !== 'never';
      S.mode = flowAllowed && !landscape && scale < FLOW_BELOW ? 'flow' : 'fit';
      root.setAttribute('data-ss-mode', S.mode);
      const set = (k, v) => root.style.setProperty(k, v);
      set('--ss-w', size.w + 'px'); set('--ss-h', size.h + 'px'); set('--ss-scale', String(scale));
      set('--ss-cx', (ins.l + aw / 2) + 'px'); set('--ss-cy', (ins.t + ah / 2) + 'px');
      set('--ss-il', ins.l + 'px'); set('--ss-it', ins.t + 'px'); set('--ss-ir', ins.r + 'px'); set('--ss-reserve', reserve + 'px');
      // fixed slides in flow mode: scale the design size into the reflowed stage
      const fs = Math.min(aw / size.w, ah / size.h);
      set('--ss-fs', String(fs));
      set('--ss-fx', ((aw - size.w * fs) / 2) + 'px');
      set('--ss-fy', Math.max(0, (ah - size.h * fs) / 2) + 'px');
      poke();
    }

    /* ---------- maximize: the Fullscreen API on the frame, else the frame fills the window ---------- */
    // data-ss-max on the frame is the state: "api" | "pseudo", absent while off
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    const maxed = () => frame.getAttribute('data-ss-max') || 'off';
    function setMax(m) {
      if (m === 'off') frame.removeAttribute('data-ss-max'); else frame.setAttribute('data-ss-max', m);
      const label = m === 'off' ? '全画面' : '全画面を終了';
      els.full.setAttribute('aria-label', label); els.full.title = label + ' (F)'; setIcon(els.full, m === 'off' ? 'maximize' : 'restore');
      layout();
    }
    function enterMax() {
      if (maxed() !== 'off') return;
      const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
      const enabled = document.fullscreenEnabled ?? document.webkitFullscreenEnabled;
      if (!req || enabled === false) return setMax('pseudo');
      // fullscreenchange marks the real one; a refusal falls back to filling the window
      try { Promise.resolve(req.call(frame)).catch(() => { if (maxed() === 'off') setMax('pseudo'); }); } catch { setMax('pseudo'); }
    }
    function exitMax() {
      if (maxed() === 'off') return;
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (fsEl() === frame && exit) Promise.resolve(exit.call(document)).catch(() => {});
      setMax('off');
    }
    const toggleMax = () => (maxed() === 'off' ? enterMax() : exitMax());
    // the browser's own exit (its Esc, a gesture) ends "api" too
    const onFsChange = () => setMax(fsEl() === frame ? 'api' : maxed() === 'api' ? 'off' : maxed());

    /* ---------- chrome ---------- */
    function btn(icon, aria, onClick) {
      const b = mk('button', { type: 'button', 'aria-label': aria, title: aria });
      if (icon) setIcon(b, icon);
      b.addEventListener('click', e => { e.stopPropagation(); onClick(); b.blur(); });
      return b;
    }
    function buildChrome() {
      bar = mk('nav', { class: 'ss-bar', 'aria-label': 'スライド操作' });
      els.prog = mk('div', { class: 'ss-prog' });
      els.prev = btn('prev', '前へ (←)', () => { stopPlay(); prev(); });
      els.next = btn('next', '次へ (→ / Space)', () => { stopPlay(); next(); });
      els.mid = mk('div', { class: 'ss-mid' });
      if (S.n <= DOTS_MAX) {
        els.dots = mk('div', { class: 'ss-dots', role: 'group', 'aria-label': 'スライド' });
        slides.forEach((_, i) => els.dots.appendChild(btn('', (i + 1) + '. ' + titleOf(i), () => jump(i))));
        els.count = btn('', '目次 (T)', () => togglePop('toc'));
        els.count.classList.add('ss-count');
        els.mid.append(els.dots, els.count);
      } else {
        els.jump = mk('label', { class: 'ss-jump' });
        els.input = mk('input', { type: 'number', inputmode: 'numeric', min: '1', max: String(S.n), 'aria-label': 'スライド番号 (G)', title: 'スライド番号 (G)' });
        const commit = () => { const v = parseInt(els.input.value, 10); if (v >= 1 && v <= S.n) jump(v - 1); else renderChrome(); };
        els.input.addEventListener('change', commit);
        els.input.addEventListener('keydown', e => {
          e.stopPropagation();
          if (e.key === 'Enter') { commit(); els.input.blur(); }
          else if (e.key === 'Escape') { renderChrome(); els.input.blur(); }
        });
        els.input.addEventListener('focus', () => els.input.select());
        els.jump.append(els.input, mk('span', { class: 'ss-count' }, '/ ' + S.n));
        els.mid.append(els.jump);
      }
      els.pips = mk('div', { class: 'ss-pips', 'aria-label': 'ステップ' });
      els.title = mk('span', { class: 'ss-title' });
      els.mid.append(els.pips);
      els.tools = mk('div', { class: 'ss-tools' });
      els.play = btn('play', '自動再生 (P)', togglePlay);
      els.replay = btn('replay', 'アニメーションを最初から (R)', replay);
      els.toc = btn('toc', '目次 (T)', () => togglePop('toc'));
      els.help = btn('help', 'キー操作 (?)', () => togglePop('help'));
      els.tools.append(els.play, els.replay, els.toc);
      if (deck.hasAttribute('data-sound')) {
        els.sound = btn('soundOff', '効果音 (S)', () => setSound(!snd.on));
        els.sound.setAttribute('aria-pressed', 'false');
        els.tools.append(els.sound);
      }
      // it stays on narrow screens, where a tap is the only way in
      els.full = btn('maximize', '全画面', toggleMax); els.full.title = '全画面 (F)'; els.full.classList.add('ss-fs');
      els.help.classList.add('ss-opt');
      els.tools.append(els.full, els.help);
      const center = mk('div', { class: 'ss-center' });
      center.append(els.prev, els.mid, els.next);
      bar.append(els.prog, els.title, center, els.tools);
      opts.mount.appendChild(bar);

      els.pop = mk('div', { class: 'ss-pop', role: 'dialog', hidden: '' });
      opts.mount.appendChild(els.pop);
      document.addEventListener('pointerdown', e => { if (!els.pop.hidden && !els.pop.contains(e.target) && !bar.contains(e.target)) closePop(); });
    }
    function renderChrome() {
      const total = stepsOf(S.cur);
      els.prog.style.width = ((S.cur + (total ? S.step / (total + 1) : 0) + 1) / S.n * 100) + '%';
      els.prev.disabled = S.cur === 0 && S.step === 0;
      els.next.disabled = S.cur === S.n - 1 && S.step === total;
      if (els.dots) {
        [...els.dots.children].forEach((d, i) => d.setAttribute('aria-current', String(i === S.cur)));
        els.count.textContent = (S.cur + 1) + ' / ' + S.n;
      } else if (document.activeElement !== els.input) els.input.value = String(S.cur + 1);
      els.pips.replaceChildren();
      if (total > 0 && total <= 10) {
        for (let k = 1; k <= total; k++) els.pips.appendChild(mk('i', k <= S.step ? { class: 'on' } : {}));
      } else if (total > 10) els.pips.appendChild(mk('span', {}, S.step + '/' + total));
      els.pips.hidden = !total;
      els.title.textContent = titleOf(S.cur);
      const s = slides[S.cur];
      els.play.hidden = !total;
      els.replay.hidden = !(total || sceneOf(S.cur) || s.querySelector('[data-anim]'));
      if (els.pop.dataset.kind === 'toc' && !els.pop.hidden) renderToc();
    }
    function renderToc() {
      els.pop.replaceChildren(mk('h4', {}, '目次'));
      const ul = mk('ul', { class: 'ss-toc' });
      slides.forEach((_, i) => {
        const li = mk('li'), b = mk('button', { type: 'button', 'aria-current': String(i === S.cur) });
        b.append(mk('b', {}, String(i + 1)), mk('span', {}, titleOf(i)));
        b.addEventListener('click', () => { closePop(); jump(i); });
        li.appendChild(b); ul.appendChild(li);
      });
      els.pop.appendChild(ul);
      const cur = ul.children[S.cur]; if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    }
    const KEYS = [['→ / Space / PageDown', '次へ（ステップ → スライド）'], ['← / PageUp', '前へ'], ['Shift + → / ←', 'ステップを飛ばしてスライド移動'],
      ['Home / End', '最初 / 最後'], ['数字 → Enter', 'そのスライドへ'], ['G', 'スライド番号を入力 / 目次'], ['T', '目次'], ['R', 'アニメーションを最初から'],
      ['P', 'ステップを自動再生'], ['S', '効果音 オン / オフ（対応デッキ）'], ['F', '全画面 / 終了'], ['スワイプ', '左右でページ送り'], ['Esc', '閉じる / 全画面を終了']];
    function renderHelp() {
      els.pop.replaceChildren(mk('h4', {}, 'キー操作'));
      const dl = mk('div', { class: 'ss-keys' });
      KEYS.forEach(([k, v]) => dl.append(mk('kbd', {}, k), mk('span', {}, v)));
      els.pop.appendChild(dl);
    }
    function togglePop(kind) {
      if (!els.pop.hidden && els.pop.dataset.kind === kind) return closePop();
      els.pop.dataset.kind = kind; els.pop.hidden = false;
      if (kind === 'toc') renderToc(); else renderHelp();
      const first = els.pop.querySelector('[aria-current="true"]') || els.pop.querySelector('button');
      if (first) first.focus({ preventScroll: true });
    }
    function closePop() { els.pop.hidden = true; }

    function stopPlay() { if (S.playing) { clearInterval(S.playing); S.playing = null; } if (els.play) { els.play.setAttribute('aria-pressed', 'false'); setIcon(els.play, 'play'); } }
    function togglePlay() {
      if (S.playing) return stopPlay();
      const total = stepsOf(S.cur); if (!total) return;
      if (S.step >= total) show(S.cur, 0, false);
      els.play.setAttribute('aria-pressed', 'true'); setIcon(els.play, 'pause');
      const ms = +deck.getAttribute('data-autoplay') || 2600;
      S.playing = setInterval(() => { if (S.step < stepsOf(S.cur)) show(S.cur, S.step + 1, true); if (S.step >= stepsOf(S.cur)) stopPlay(); }, ms);
    }
    function poke() {
      frame.removeAttribute('data-ss-idle');
      clearTimeout(idleTimer);
      if (frame.hasAttribute('data-ss-immersive')) {
        idleTimer = setTimeout(() => { if (els.pop.hidden) frame.setAttribute('data-ss-idle', ''); }, 2600);
      }
    }

    /* ---------- input ---------- */
    let digits = '', digitsTimer = null;
    function onKey(e) {
      if (!isActive() || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (editable(e.target)) return;
      const inSlideControl = e.target.closest && e.target.closest('.slide button, .slide a[href], .slide summary');
      const k = e.key;
      if (k === 'Escape') { digits = ''; if (!els.pop.hidden) closePop(); else exitMax(); return; }
      if (/^[0-9]$/.test(k)) { digits += k; clearTimeout(digitsTimer); digitsTimer = setTimeout(() => { digits = ''; }, 1600); return; }
      if (k === 'Enter' && digits) { e.preventDefault(); const v = +digits; digits = ''; if (v >= 1 && v <= S.n) jump(v - 1); return; }
      const fitNav = S.mode === 'fit';
      const go = fn => { e.preventDefault(); stopPlay(); closePop(); fn(); };
      if (e.shiftKey && k === 'ArrowRight') return go(nextSlide);
      if (e.shiftKey && k === 'ArrowLeft') return go(prevSlide);
      if (k === ' ' && inSlideControl) return;
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey) || (fitNav && k === 'ArrowDown')) return go(next);
      if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey) || (fitNav && k === 'ArrowUp')) return go(prev);
      if (k === 'Home') return go(() => jump(0));
      if (k === 'End') return go(() => jump(S.n - 1));
      const lk = k.toLowerCase();
      if (lk === 'g') { e.preventDefault(); if (els.input) els.input.focus(); else togglePop('toc'); }
      else if (lk === 't' || lk === 'o') togglePop('toc');
      else if (lk === 'r') { stopPlay(); replay(); }
      else if (lk === 'p') togglePlay();
      else if (lk === 'f') { e.preventDefault(); toggleMax(); }
      else if (lk === 's' && els.sound) setSound(!snd.on);
      else if (k === '?') togglePop('help');
    }
    let tx = null, ty = null;
    function onTouchStart(e) {
      const t = e.touches[0];
      if (!isActive() || e.touches.length > 1 || (e.target.closest && e.target.closest('input, textarea, select, pre, [data-no-swipe], .ss-bar, .ss-pop'))) { tx = null; return; }
      tx = t.clientX; ty = t.clientY;
    }
    function onTouchEnd(e) {
      if (tx == null) return;
      const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = ty = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { stopPlay(); if (dx < 0) next(); else prev(); }
    }


    /* ---------- init ---------- */
    slides = [...deck.querySelectorAll(':scope > .slide')];
    S.n = slides.length; if (!S.n) return null;
    slides.forEach(s => { s.setAttribute('aria-hidden', 'true'); s.setAttribute('role', 'group'); s.setAttribute('aria-roledescription', 'slide'); });
    // stagger: children of [data-stagger] enter one after another
    deck.querySelectorAll('[data-stagger]').forEach(p => [...p.children].forEach((c, i) => { c.style.setProperty('--i', String(i)); if (!c.hasAttribute('data-anim') && !c.hasAttribute('data-step')) c.setAttribute('data-anim', p.getAttribute('data-stagger') || 'up'); }));
    wireLinks(standalone ? document : deck);
    buildChrome();
    layout();
    if (standalone) {
      window.addEventListener('resize', layout);
      // a fragment cleared from the address bar (or by the viewer) means the opening state
      window.addEventListener('hashchange', () => { if (!readHash() && location.hash === '') show(0, 0, false); });
    } else if (window.ResizeObserver) new ResizeObserver(layout).observe(frame);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('pointermove', poke, { passive: true });
    document.addEventListener('pointerdown', poke, { passive: true });

    const self = {
      deck, show, next, prev, jump, replay, layout, stepsOf, readHash, setSound, stopPlay, closePop, exitMax,
      resetSteps() { slides.forEach(s => { delete s._ssSteps; }); },
      get state() { return { slide: S.cur, step: S.step, steps: stepsOf(S.cur), count: S.n, mode: S.mode }; },
    };
    decks.push(self);
    return self;
  }

  /* ---------- boot: the page's own deck (decks inside course units are created by their unit) ---------- */
  function start() {
    if (started) return; started = true;
    const deck = [...document.querySelectorAll('.deck')].find(d => !d.closest('.su-unit'));
    if (!deck) return;
    const d = createDeck(deck, { frame: document.documentElement, mount: document.body, standalone: true });
    if (!d) return;
    if (!d.readHash()) d.show(0, 0, true);
    try { window.focus(); } catch { /* ignore */ }
  }

  const NONE = { slide: -1, step: 0, steps: 0, count: 0, mode: 'fit' };
  const api = {
    scene(name, def) { scenes[name] = def || {}; decks.forEach(d => d.resetSteps()); },
    go(slide, step) { if (current) current.jump(slide, step); },
    next() { if (current) current.next(); },
    prev() { if (current) current.prev(); },
    replay() { if (current) current.replay(); },
    // play a built-in sound; does nothing (returns false) unless the deck has data-sound and the viewer turned it on
    sfx,
    get sound() { return snd.on; },
    pageUrl(id, hash) { const r = resolveLink(id, hash || ''); return r && r.href; },
    get state() { return current ? current.state : NONE; },
  };
  window.YESSlides = api;
  window.__yesSlides = { parseSize, parseHash, formatHash, fitScale, pageHref, buildRange, start, api, createDeck };

  /* ---------- a deck as a course unit (YESUnits contract: see video/runtime.js) ---------- */
  (window.YESUnits = window.YESUnits || { kinds: {} }).kinds.slides = function slidesUnit(root, data, host) {
    root.classList.add('ss-frame');
    let active = false, opened = false, best = (host.saved && host.saved.frac) || 0, done = !!(host.saved && host.saved.done);
    const endRow = mk('div', { class: 'ss-unit-end', hidden: '' });
    const d = createDeck(root.querySelector('.deck'), {
      frame: root, mount: root, isActive: () => active,
      onChange(st, rest) {
        if (!active) return;
        // progress = furthest position reached, counting every step of every slide
        let total = 0, at = 0;
        for (let i = 0; i < st.count; i++) { const n = d.stepsOf(i) + 1; if (i < st.slide) at += n; total += n; }
        const frac = Math.min(1, (at + st.step + 1) / total);
        if (frac > best) { best = frac; host.progress(frac); }
        const end = st.slide === st.count - 1 && st.step === st.steps;
        if (end && !done) { done = true; host.complete(); }
        endRow.replaceChildren();
        if (end) for (const a of host.endActions()) {
          const b = mk('button', a.primary ? { type: 'button', class: 'primary' } : { type: 'button' }, a.label);
          // the next step leaves this unit: drop out of the maximized deck first
          b.addEventListener('click', () => { d.exitMax(); a.run(); }); endRow.appendChild(b);
        }
        endRow.hidden = !end;
        host.setRest(rest);
        host.position(rest);
      },
    });
    root.appendChild(endRow);
    return {
      show(rest) {
        active = true; root.hidden = false; d.layout();
        if (!(rest && d.readHash('#' + rest))) { if (!opened) d.show(0, 0, true); else d.show(d.state.slide, d.state.step, false); }
        opened = true;
      },
      hide() { d.exitMax(); active = false; d.stopPlay(); d.closePop(); root.hidden = true; },
    };
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);
})();
