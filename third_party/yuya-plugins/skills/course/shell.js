/* oxlint-disable unicorn/consistent-function-scoping -- every runtime is inlined into one shared <script>; the surrounding block keeps these helpers private instead of global */
// course shell: outline, home, routing, progress, review. Knows nothing about unit kinds except
// that a quiz unit can be re-instantiated with collected questions for the review.
{
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const clean = (v) => ({ frac: +v.frac || 0, done: !!v.done, score: v.score == null ? undefined : +v.score,
                      total: v.total == null ? undefined : +v.total, wrong: Array.isArray(v.wrong) ? v.wrong.map(Number) : [] });
  const DATA = JSON.parse(document.getElementById('cs-data').textContent);
  // build.py stores each data: URI that several units embed (立ち絵 layers) once, as {"$blob": n}
  const unblob = (v) => {
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = unblob(v[i]); return v; }
    if (!v || typeof v !== 'object') return v;
    if (typeof v.$blob === 'number' && Object.keys(v).length === 1) return DATA.blobs[v.$blob];
    for (const k of Object.keys(v)) v[k] = unblob(v[k]);
    return v;
  };
  if (DATA.blobs) unblob(DATA.unitData);
  const META = DATA.meta, LESSONS = DATA.lessons;
  const UNITS = LESSONS.flatMap((l) => l.units.map((u) => ({ ...u, lesson: l })));
  const byUnit = new Map(UNITS.map((u) => [u.id, u]));
  const byLesson = new Map(LESSONS.map((l) => [l.id, l]));
  // a unit with `variants` is one unit to the learner, shown as one of several versions (each its own instance,
  // node and unitData under `<unit>~<key>`); progress is the unit's, so watching either version completes it
  const byVariant = new Map(UNITS.flatMap((u) => (u.variants || []).map((v) => [v.id, { unit: u, v }])));
  const root = document.documentElement;

  // ---------- persistence: localStorage, plus the host's store when the page defines window.YESHost.storage ----------
  const state = { units: {}, resume: null, variant: null };   // units[uid] = {frac, done, score, total, wrong}; variant = preferred key
  const local = { get(k) { try { return JSON.parse(localStorage.getItem('cs:' + location.pathname + ':' + k)); } catch { return null; } },
                  set(k, v) { try { localStorage.setItem('cs:' + location.pathname + ':' + k, JSON.stringify(v)); } catch {} } };
  const hostStore = window.YESHost?.storage || null;
  const put = (key, value) => {
    local.set(key, value);
    if (hostStore) { try { Promise.resolve(hostStore.set(key, value)).catch(() => {}); } catch {} }
  };
  const timers = {};
  const pending = new Map();
  function save(key, value, delay = 0) {
    clearTimeout(timers[key]);
    pending.delete(key);
    if (!delay) { put(key, value); return; }
    pending.set(key, value);
    timers[key] = setTimeout(() => { pending.delete(key); put(key, value); }, delay);
  }
  addEventListener('pagehide', () => {
    for (const [key, value] of pending) { clearTimeout(timers[key]); put(key, value); }
    pending.clear();
  });
  const cleanResume = (v) => (v && byUnit.has(v.unit) ? { unit: v.unit, rest: String(v.rest || ''), ...(typeof v.variant === 'string' ? { variant: v.variant } : {}) } : null);
  // a second source (the host's store) never takes progress back: the furthest watch and any finish win
  const merge = (a, b) => {
    if (!a) return b;
    const taken = b.score != null ? b : a;
    return { frac: Math.max(a.frac, b.frac), done: a.done || b.done, score: taken.score, total: taken.total, wrong: taken.wrong };
  };
  function load(key, v) {
    if (!v || typeof v !== 'object') return;
    if (key.startsWith('u:') && byUnit.has(key.slice(2))) state.units[key.slice(2)] = merge(state.units[key.slice(2)], clean(v));
    else if (key === 'resume') state.resume = cleanResume(v) || state.resume;
    else if (key === 'variant' && typeof v.key === 'string') state.variant = v.key;
  }
  for (const u of UNITS) load(`u:${u.id}`, local.get(`u:${u.id}`));
  load('resume', local.get('resume'));
  load('variant', local.get('variant'));
  if (hostStore) {
    (async () => {
      try {
        for (const r of await hostStore.list()) if (r && typeof r.key === 'string') load(r.key, r.value);
      } catch { return; }
      // a stored preference for another version reopens the unit on screen in it; otherwise just redraw
      const u = byUnit.get(current);
      if (u?.variants && shownId(u) !== shown) route(); else refresh();
    })();
  }
  const st = (uid) => (state.units[uid] ||= { frac: 0, done: false, wrong: [] });
  const lessonDone = (l) => l.units.every((u) => state.units[u.id]?.done);
  // memory first: where localStorage throws, versions of a unit still share speed and captions in the session
  const prefMem = {};
  const prefs = { get: (k) => (k in prefMem ? prefMem[k] : local.get('pref:' + k)), set: (k, v) => { prefMem[k] = v; local.set('pref:' + k, v); } };
  // the version a unit opens in: the course-wide preference when the unit has it, else its first
  const variantOf = (u, want = state.variant) => u.variants ? (u.variants.find((v) => v.key === want) || u.variants[0]) : null;
  const shownId = (u, want) => variantOf(u, want)?.id || u.id;
  const durationOf = (u) => (variantOf(u)?.duration ?? u.duration) || 0;
  const outlineOf = (u) => variantOf(u)?.outline || u.outline;
  const lessonDuration = (l) => l.units.reduce((a, u) => a + durationOf(u), 0);
  function prefer(key) { if (state.variant !== key) { state.variant = key; save('variant', { key }); } }

  // ---------- unit instances, created on first visit ----------
  const instances = new Map();
  let current = null;   // uid or '_review'
  let shown = null;     // the instance id on screen: current, or current~<key> for a unit with variants
  // UNITS holds copies ({...u, lesson}), so look units up by id, never by identity
  function nextOf(u) {
    const sib = u.lesson.units, i = sib.findIndex((x) => x.id === u.id);
    if (sib[i + 1]) return byUnit.get(sib[i + 1].id);
    const nl = LESSONS[LESSONS.indexOf(u.lesson) + 1];
    return nl ? byUnit.get(nl.units[0].id) : null;
  }
  const quizOpen = (q) => q.kind === 'quiz' && state.units[q.id]?.score == null;
  // a video just watched, its lesson's quiz still untaken: the next step is the quiz, so it gets the headline
  function quizStep(n) {
    const count = DATA.unitData[n.id]?.questions?.length || 0, s = state.units[n.id];
    if (s?.score != null) return { label: '確認テストをもう一度 →', primary: true, title: '確認テストで仕上げ', note: `前回 ${s.score} / ${s.total}`, run: () => go(`#${n.id}`) };
    return { label: '確認テストに挑戦する →', primary: true, title: '次は確認テスト',
             note: `${count ? count + ' 問 ・ ' : ''}選ぶだけ ・ 見た直後に解くと記憶に残ります`, auto: 10, run: () => go(`#${n.id}`) };
  }
  function hostFor(u, vid = u.id) {
    const key = byVariant.get(vid)?.v.key;
    return {
      get saved() { return state.units[u.id] || null; },
      setRest(rest) { if (shown === vid) setHash(`#${vid}${rest ? '/' + rest : ''}`); },
      progress(frac) { const s = st(u.id); if (frac > s.frac) { s.frac = frac; save(`u:${u.id}`, s, 3000); } },
      position(rest) {
        // the version just switched away from pauses after the switch; the one on screen owns the position
        if (current === u.id && shown !== vid) return;
        state.resume = { unit: u.id, rest, ...(key ? { variant: key } : {}) }; save('resume', state.resume, 500); refresh();
      },
      complete() { const s = st(u.id); if (!s.done) { s.done = true; save(`u:${u.id}`, s); refresh(); } },
      result(r) { const s = st(u.id); Object.assign(s, { score: r.score, total: r.total, wrong: r.wrong }); save(`u:${u.id}`, s); refresh(); },
      endActions() {
        const acts = [], n = nextOf(u);
        if (n && n.lesson === u.lesson) acts.push(n.kind === 'quiz' ? quizStep(n) : { label: '次へ →', primary: true, run: () => go(`#${n.id}`) });
        else if (n) acts.push({ label: '次のレッスンへ →', primary: true, run: () => go(`#${n.id}`) });
        if (u.kind === 'quiz' && u.lesson.units[0].id !== u.id) acts.push({ label: '動画を見直す', run: () => go(`#${u.lesson.units[0].id}`) });
        acts.push({ label: 'コースのトップへ', run: () => go('#home') });
        return acts;
      },
      prefs,
    };
  }
  function instance(vid) {
    if (!instances.has(vid)) {
      const u = byVariant.get(vid)?.unit || byUnit.get(vid);
      const node = document.querySelector(`.su-unit[data-unit="${CSS.escape(vid)}"]`);
      instances.set(vid, window.YESUnits.kinds[u.kind](node, DATA.unitData[vid], hostFor(u, vid)));
    }
    return instances.get(vid);
  }
  // same (chapter, scene, line) in the other version, from that line's head; playing stays playing
  function switchVariant(u, key) {
    const to = variantOf(u, key);
    if (!to || to.id === shown) return;
    const from = instances.get(shown), pos = from?.locate?.();
    prefer(to.key);
    from?.hide();
    shown = to.id;
    const inst = instance(to.id);
    inst.show(pos?.started ? pos.at : '');
    if (pos?.playing) inst.play?.();
    const now = inst.locate?.();
    if (now?.started) {
      const rest = `t=${now.t.toFixed(1)}`;
      setHash(`#${to.id}/${rest}`);
      state.resume = { unit: u.id, rest, variant: to.key }; save('resume', state.resume, 500);
    } else setHash(`#${to.id}`);
    refresh();
  }
  function renderVariants() {
    const bar = $('cs-variants'), u = byUnit.get(current);
    bar.textContent = '';
    bar.hidden = !u?.variants;
    if (!u?.variants) return;
    const cur = variantOf(u);
    const seg = el('div', 'cs-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'バージョン');
    for (const v of u.variants) {
      const b = el('button', null, v.label); b.dataset.variant = v.key;
      b.setAttribute('aria-pressed', String(v.key === cur.key));
      b.addEventListener('click', () => switchVariant(u, v.key));
      seg.append(b);
    }
    bar.append(el('span', 'cs-seg-label', 'バージョン'), seg);
  }

  // ---------- review: one quiz instance over every question still marked wrong ----------
  function wrongItems() {
    const items = [];
    for (const u of UNITS) if (u.kind === 'quiz') for (const qi of state.units[u.id]?.wrong || []) {
      const q = DATA.unitData[u.id].questions[qi];
      if (q) items.push({ ...q, from: u.lesson.title, ref: { unit: u.id, idx: qi } });
    }
    return items;
  }
  function openReview() {
    const items = wrongItems();
    if (!items.length) { go('#home'); return; }
    const node = $('cs-review'); node.textContent = '';
    const inst = window.YESUnits.kinds.quiz(node, { title: '間違えた問題の復習', sub: `${items.length} 問`, questions: items }, {
      saved: null, setRest() {}, progress() {}, position() {}, complete() {}, prefs,
      result(r) {
        // a question answered right here leaves its unit's wrong list; the unit's score stays as first taken
        for (const a of r.answers) if (a.correct && a.ref) { const s = st(a.ref.unit); s.wrong = s.wrong.filter((q) => q !== a.ref.idx); save(`u:${a.ref.unit}`, s); }
        refresh();
      },
      endActions() { const left = wrongItems().length;
        return left ? [{ label: `残り ${left} 問をもう一度`, primary: true, run: openReview }, { label: 'コースのトップへ', run: () => go('#home') }]
                    : [{ label: 'コースのトップへ', primary: true, run: () => go('#home') }]; },
    });
    current = '_review';
    inst.show('');
  }

  // ---------- chrome ----------
  function badge(u) {
    const s = state.units[u.id];
    if (u.kind === 'quiz') {
      if (s?.score == null) {
        const ready = byUnit.get(u.id).lesson.units.every((x) => x.id === u.id || x.kind === 'quiz' || state.units[x.id]?.done);
        return ready ? el('span', 'cs-badge next', '▶ 次は確認テスト') : el('span', 'cs-badge none', 'テスト未受験');
      }
      return s.score === s.total ? el('span', 'cs-badge crown', `★ 全問正解 ${s.score}/${s.total}`) : el('span', 'cs-badge part', `テスト ${s.score}/${s.total}`);
    }
    if (s?.done) return el('span', 'cs-badge done', '✓ 視聴済み');
    if (s?.frac) return el('span', 'cs-badge none', `${Math.round(s.frac * 100)}%`);
    return null;
  }
  function refresh() {
    const doneN = LESSONS.filter(lessonDone).length;
    const side = $('cs-side'); side.textContent = '';
    const head = el('button', 'cs-side-title', META.title); head.addEventListener('click', () => go('#home')); side.append(head);
    const pr = el('div', 'cs-prog'), pb = el('div', 'cs-prog-bar'), pi = el('i');
    pi.style.width = `${(doneN / LESSONS.length) * 100}%`; pb.append(pi);
    pr.append(pb, el('div', 'cs-prog-txt', `完了 ${doneN} / ${LESSONS.length} レッスン`)); side.append(pr);
    const curU = byUnit.get(current);
    const ol = el('ol');
    LESSONS.forEach((l, i) => {
      const li = el('li', 'cs-lesson'); if (lessonDone(l)) li.classList.add('done');
      const isNow = curU && curU.lesson === l; if (isNow) li.classList.add('now');
      const b = el('button'); b.addEventListener('click', () => go(`#${l.id}`));
      b.append(el('span', 'cs-num', lessonDone(l) ? '✓' : String(i + 1)), el('span', 'cs-name', l.title), el('span', 'cs-meta', lessonDuration(l) ? fmt(lessonDuration(l)) : ''));
      li.append(b);
      if (isNow) {
        const sub = el('div', 'cs-sub');
        for (const u of l.units) {
          const outline = outlineOf(u);
          if (outline.length) for (const o of outline) { const ob = el('button', null, o.title); ob.addEventListener('click', () => go(`#${shownId(u)}/${o.rest}`)); sub.append(ob); }
          else { const ub = el('button', null, u.kind === 'quiz' ? '確認テスト' : u.title); ub.addEventListener('click', () => go(`#${u.id}`));
                 if (u.id === current) ub.classList.add('now'); const bd = badge(u); if (bd) ub.append(' ', bd); sub.append(ub); }
        }
        li.append(sub);
      }
      ol.append(li);
    });
    side.append(ol);
    renderVariants();
    if (root.dataset.view === 'home') renderHome();
  }
  function renderHome() {
    const box = $('cs-home-in'); box.textContent = '';
    const head = el('div', 'cs-home-head'); head.append(el('h1', null, META.title));
    if (META.subtitle) head.append(el('p', null, META.subtitle));
    const total = LESSONS.reduce((a, l) => a + lessonDuration(l), 0);
    head.append(el('p', null, `${LESSONS.length} レッスン ・ 合計 ${Math.round(total / 60)} 分 ・ 完了 ${LESSONS.filter(lessonDone).length} / ${LESSONS.length}`));
    box.append(head);
    const acts = el('div', 'cs-acts');
    let r = state.resume && byUnit.get(state.resume.unit), rest = state.resume?.rest || '';
    if (r && state.units[r.id]?.done) {
      const n = nextOf(r), quiz = n && n.lesson === r.lesson && quizOpen(n);
      if (quiz) { r = n; rest = ''; }
    }
    const firstOpen = LESSONS.find((l) => !lessonDone(l));
    const label = r ? (quizOpen(r) && !rest ? `続きから: 確認テスト(${r.lesson.title})` : `続きから: ${r.lesson.title}`)
                    : firstOpen ? `はじめる: ${firstOpen.title}` : '最初から見直す';
    const main = el('button', 'cs-act primary', label);
    // a position is a time in the version it was saved in, so 続きから reopens that version
    const at = r && (r.id === state.resume?.unit ? shownId(r, state.resume.variant) : shownId(r));
    main.addEventListener('click', () => go(r ? `#${at}${rest ? '/' + rest : ''}` : `#${(firstOpen || LESSONS[0]).id}`));
    acts.append(main);
    const wrong = wrongItems().length;
    if (wrong) { const rb = el('button', 'cs-act', `間違えた問題を復習 (${wrong})`); rb.addEventListener('click', () => go('#review')); acts.append(rb); }
    box.append(acts);
    const cards = el('div', 'cs-cards');
    LESSONS.forEach((l, i) => {
      const c = el('button', 'cs-card'); if (lessonDone(l)) c.classList.add('done');
      c.addEventListener('click', () => go(`#${l.id}`));
      const mid = el('div'); mid.append(el('h3', null, `${i + 1}. ${l.title}`)); if (l.summary) mid.append(el('p', null, l.summary));
      const stc = el('div', 'cs-card-st'); if (lessonDuration(l)) stc.append(el('span', null, fmt(lessonDuration(l))));
      for (const u of l.units) { const bd = badge(u); if (bd) stc.append(bd); }
      c.append(el('span', 'cs-num', lessonDone(l) ? '✓' : String(i + 1)), mid, stc);
      cards.append(c);
    });
    box.append(cards);
    const credits = META.credits || (META.credit ? [META.credit] : []);
    const voices = credits.filter((c) => c.startsWith('VOICEVOX:'));
    const credit = [voices.length ? `音声: ${voices.join('、')}` : '', ...credits.filter((c) => !c.startsWith('VOICEVOX:'))]
      .filter(Boolean).join(' / ');
    if (credit) box.append(el('p', 'cs-credit', credit));
  }

  // ---------- routing: #home  #review  #<lesson>  #<unit>[~<variant>][/<rest>] ----------
  function setHash(h) { if (location.hash !== h) history.replaceState(null, '', h); }
  function go(h) { if (location.hash !== h) history.pushState(null, '', h); route(); }
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const [key, rest = ''] = h.split(/\/(.*)/s);
    // a version key the course no longer has opens the unit in the preferred version
    let target = byUnit.get(key) || byVariant.get(key)?.unit || byUnit.get(key.split('~')[0]) || null;
    if (!target && byLesson.has(key)) {
      const l = byLesson.get(key);
      target = l.units.find((u) => !state.units[u.id]?.done) || l.units[0];
    }
    // opening a version (link, 続きから, outline) makes it the preference; a bare unit id opens the preferred one
    if (byVariant.has(key)) prefer(byVariant.get(key).v.key);
    const vid = target ? shownId(target) : null;
    for (const [id, inst] of instances) if (id !== vid) inst.hide();
    $('cs-review').hidden = key !== 'review';
    root.classList.remove('cs-side-open');
    if (key === 'review') { shown = null; root.dataset.view = 'unit'; openReview(); refresh(); return; }
    if (!target) { current = shown = null; root.dataset.view = 'home'; refresh(); return; }
    current = target.id; shown = vid; root.dataset.view = 'unit';
    if (rest.endsWith('&shot')) root.classList.add('ev-shot');
    refresh();
    instance(vid).show(rest);
  }
  $('cs-menu').addEventListener('click', (e) => { e.stopPropagation(); root.classList.toggle('cs-side-open'); });
  document.querySelector('.cs-main').addEventListener('click', (e) => {
    if (root.classList.contains('cs-side-open')) { root.classList.remove('cs-side-open'); e.stopPropagation(); }
  }, true);
  addEventListener('popstate', route);
  addEventListener('hashchange', route);
  route();
}
