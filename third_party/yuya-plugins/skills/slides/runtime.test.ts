import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const DIR = __dirname;
const read = (name: string) => readFileSync(path.join(DIR, name), 'utf8');
// Both files end with a single newline; the HTML embeds them as
// <tag>\n<file without its final newline>\n</tag>.
const runtimeJs = read('runtime.js').trimEnd();
const runtimeCss = read('runtime.css').trimEnd();
const example = read('example.html');

type Loc = { pathname: string; protocol: string };
interface Internals {
  parseSize(text: string | null): { w: number; h: number };
  parseHash(hash: string): { slide: number | string; step: number } | null;
  formatHash(slide: number, step: number): string;
  fitScale(vw: number, vh: number, w: number, h: number, pad: number): number;
  pageHref(loc: Loc, id: string, hash: string, framed: boolean): { href: string; target: string } | null;
  buildRange(el: Element): { from: number; until: number };
  start(): void;
  api: {
    scene(name: string, def: Record<string, unknown>): void;
    go(slide: number | string, step?: number): void;
    next(): void;
    prev(): void;
    sfx(name: string, n?: number): boolean;
    readonly state: { slide: number; step: number; steps: number; count: number; mode: string };
  };
}

// Load a deck into happy-dom (scripts inside innerHTML are inert), evaluate the
// runtime as the inline copy would run, register scenes, then start it.
function boot(html: string, hash = '', scenes: (api: Internals['api']) => void = () => {}): Internals {
  history.replaceState(null, '', location.pathname + hash);
  // drop <link>s: happy-dom would fetch the Google Fonts stylesheet
  const doc = html.replace(/^<!doctype html>\s*/i, '').replace(/<link\b[^>]*>/gi, '');
  document.documentElement.innerHTML = doc.replace(/^<html[^>]*>/i, '').replace(/<\/html>\s*$/i, '');
  new Function(runtimeJs)();
  const ss = (window as unknown as { __yesSlides: Internals }).__yesSlides;
  scenes(ss.api);
  // the deck's own scripts (scene registrations) run after the runtime, as in the page
  for (const sc of document.querySelectorAll('script:not([data-slides])')) new Function(sc.textContent ?? '')();
  ss.start();
  return ss;
}
const web = (pathname: string): Loc => ({ pathname, protocol: 'https:' });
const deck = (slides: string, attrs = '') => `<main class="deck"${attrs}>${slides}</main>`;
const plain = (n: number) => Array.from({ length: n }, (_, i) => `<section class="slide"><h2>S${i + 1}</h2></section>`).join('');

// Each boot adds a deck whose listeners live on document and window; drop the previous ones so only
// the deck under test reacts to keys and fullscreen changes.
const listeners: [EventTarget, string, EventListenerOrEventListenerObject, unknown][] = [];
for (const t of [document, window] as EventTarget[]) {
  const add = t.addEventListener.bind(t);
  t.addEventListener = (type: string, fn: EventListenerOrEventListenerObject, o?: unknown) => {
    listeners.push([t, type, fn, o]);
    add(type, fn, o as AddEventListenerOptions);
  };
}
beforeEach(() => {
  for (const [t, type, fn, o] of listeners.splice(0)) t.removeEventListener(type, fn, o as EventListenerOptions);
  document.documentElement.innerHTML = '<head></head><body></body>';
  for (const a of [...document.documentElement.attributes]) document.documentElement.removeAttribute(a.name);
});

describe('control icons', () => {
  // each runtime stays self-contained, so the bars match only while the shared path data does
  const icons = (src: string) => Object.fromEntries(
    [...(/const ICONS = \{([\s\S]*?)\n\s*\};/.exec(src)?.[1] ?? '').matchAll(/(\w+): '([^']+)'/g)].map((m) => [m[1], m[2]]));
  it('draws every icon both bars use from the same path data', () => {
    const slides = icons(runtimeJs), video = icons(readFileSync(path.join(DIR, '../video/runtime.js'), 'utf8'));
    const shared = Object.keys(slides).filter((k) => k in video);
    expect(shared).toEqual(expect.arrayContaining(['play', 'pause', 'toc', 'help', 'maximize', 'restore']));
    for (const k of shared) expect([k, video[k]]).toEqual([k, slides[k]]);
  });
});

describe('template and example embed the runtime verbatim', () => {
  it.each(['template.html', 'example.html'])('%s', (name) => {
    const html = read(name);
    expect(html).toContain(`<style data-slides>\n${runtimeCss}\n</style>`);
    expect(html).toContain(`<script data-slides>\n${runtimeJs}\n</script>`);
    expect(html).toContain('<!-- slides runtime v1 -->');
  });

  it.each(['template.html', 'example.html'])('%s links out only with target=_blank', (name) => {
    const doc = new DOMParser().parseFromString(read(name).replace(/<link\b[^>]*>/gi, ''), 'text/html');
    for (const a of doc.querySelectorAll('a[href^="http"]')) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });
});

describe('runtime.css', () => {
  it('hides every build attribute until its step, not only data-step', () => {
    expect(runtimeCss).toContain(':is([data-step], [data-only], [data-until]):not(.on)');
    expect(runtimeCss).not.toMatch(/(^|[\s,])\[data-step\]:not\(\.on\)/);
  });
});

describe('runtime.css specificity', () => {
  it('keeps element defaults at zero specificity so deck classes win', () => {
    expect(runtimeCss).not.toMatch(/(^|[\s,])\.slide (h1|h2|h3|p|ul|ol|code|pre|table|th|td|svg)\b/m);
    expect(runtimeCss).toContain(':where(.slide) table');
  });
});

describe('pure helpers', () => {
  const ss = () => boot(deck(plain(1)));

  it('parses slide numbers, slide ids and steps from the fragment, and nothing else', () => {
    const { parseHash } = ss();
    expect(parseHash('#5')).toEqual({ slide: 4, step: 0 });
    expect(parseHash('#5.2')).toEqual({ slide: 4, step: 2 });
    expect(parseHash('#intro.3')).toEqual({ slide: 'intro', step: 3 });
    expect(parseHash('')).toBeNull();
    expect(parseHash('#<img src=x>')).toBeNull();
    expect(parseHash('#5.')).toBeNull();
  });

  it('writes the opening state as no fragment and step 0 as the bare slide number', () => {
    const { formatHash } = ss();
    expect(formatHash(0, 0)).toBe('');
    expect(formatHash(0, 1)).toBe('#1.1');
    expect(formatHash(1, 0)).toBe('#2');
    expect(formatHash(2, 3)).toBe('#3.3');
  });

  it('reads the design size and falls back to 1280x720', () => {
    const { parseSize, fitScale } = ss();
    expect(parseSize('1920x1080')).toEqual({ w: 1920, h: 1080 });
    expect(parseSize('huge')).toEqual({ w: 1280, h: 720 });
    expect(fitScale(1312, 752, 1280, 720, 16)).toBeCloseTo(1);
  });

  it('keeps relative links and rejects executable URLs', () => {
    const { pageHref } = ss();
    expect(pageHref(web('/docs/slides.html'), 'other.html', '#3.2', false)).toEqual({href:'other.html#3.2',target:''});
    expect(pageHref(web('/docs/'), 'https://example.com/', '', false)).toEqual({href:'https://example.com/',target:'_blank'});
    expect(pageHref(web('/'), 'javascript:alert(1)', '', false)).toBeNull();
    expect(pageHref(web('/'), '//example.com', '', false)).toBeNull();
    expect(pageHref(web('/'), 'data:text/html,x', '', false)).toBeNull();
  });
});

describe('navigation', () => {
  const stepped = deck(
    `<section class="slide"><h2>A</h2></section>
     <section class="slide" id="b"><h2>B</h2><p data-step="1">one</p><p data-step="2" data-until="2">two</p><p data-only="3">three</p></section>
     <section class="slide"><h2>C</h2></section>`,
  );

  it('walks steps before slides and mirrors the position in the fragment', () => {
    const { api } = boot(stepped);
    expect(api.state).toMatchObject({ slide: 0, step: 0, count: 3 });
    expect(location.hash).toBe('');
    api.next();
    expect(api.state).toMatchObject({ slide: 1, step: 0, steps: 3 });
    expect(location.hash).toBe('#2');
    api.next(); api.next();
    expect(location.hash).toBe('#2.2');
    const [one, two, three] = [...document.querySelectorAll('#b p')];
    expect(one.classList.contains('on')).toBe(true);
    expect(one.classList.contains('past')).toBe(true);
    expect(two.classList.contains('now')).toBe(true);
    expect(three.classList.contains('on')).toBe(false);
    api.next();
    expect(two.classList.contains('on')).toBe(false);
    expect(three.classList.contains('on')).toBe(true);
    api.next();
    expect(api.state).toMatchObject({ slide: 2, step: 0 });
    api.prev();
    expect(api.state).toMatchObject({ slide: 1, step: 3 });
  });

  it('drops the fragment on the opening state and returns there when it is cleared', () => {
    const { api } = boot(stepped, '#2.1');
    api.go(0);
    expect(location.hash).toBe('');
    api.go(2);
    expect(location.hash).toBe('#3');
    history.replaceState(null, '', location.pathname);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(api.state).toMatchObject({ slide: 0, step: 0 });
  });

  it('opens at the step named in the fragment, by number or by slide id', () => {
    expect(boot(stepped, '#2.2').api.state).toMatchObject({ slide: 1, step: 2 });
    expect(boot(stepped, '#b.1').api.state).toMatchObject({ slide: 1, step: 1 });
    expect(boot(stepped, '#2.99').api.state).toMatchObject({ slide: 1, step: 3 });
    expect(boot(stepped, '#nope').api.state).toMatchObject({ slide: 0, step: 0 });
  });

  it('shows dots up to 12 slides and a number input beyond', () => {
    boot(deck(plain(12)));
    expect(document.querySelectorAll('.ss-dots button')).toHaveLength(12);
    expect(document.querySelector('.ss-jump input')).toBeNull();
    const { api } = boot(deck(plain(13)));
    expect(document.querySelector('.ss-dots')).toBeNull();
    const input = document.querySelector<HTMLInputElement>('.ss-jump input')!;
    expect(input.value).toBe('1');
    input.value = '9';
    input.dispatchEvent(new Event('change'));
    expect(api.state.slide).toBe(8);
  });

  it('jumps with typed digits and Enter', () => {
    const { api } = boot(deck(plain(20)));
    for (const key of ['1', '5', 'Enter']) document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    expect(api.state.slide).toBe(14);
  });

  it('lists every slide title in the table of contents', () => {
    boot(deck(`<section class="slide" data-title="Custom"><h2>Ignored</h2></section><section class="slide"><h3>Heading</h3></section>`));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
    expect([...document.querySelectorAll('.ss-toc li span')].map((e) => e.textContent)).toEqual(['Custom', 'Heading']);
  });
});

describe('scenes', () => {
  it('count toward the steps and redraw the target step without animation on a jump', () => {
    const calls: [number, boolean][] = [];
    const { api } = boot(deck(`${plain(1)}<section class="slide" data-scene="s"><h2>S</h2></section>`), '#2.2', (a) =>
      a.scene('s', { steps: 3, step: (ctx: { animate: boolean }, k: number) => calls.push([k, ctx.animate]) }),
    );
    expect(api.state).toMatchObject({ slide: 1, step: 2, steps: 3 });
    expect(calls).toEqual([[2, false]]);
    api.next();
    expect(calls.at(-1)).toEqual([3, true]);
  });
});

// A stand-in AudioContext that counts the oscillators it starts.
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const node = () => ({ connect() {}, gain: param(), frequency: param() });
function fakeAudio() {
  const started: number[] = [];
  class FakeAC {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    createGain = node;
    createDynamicsCompressor = node;
    createBiquadFilter = () => ({ ...node(), type: '' });
    createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
    createBufferSource = () => ({ connect() {}, start() {}, stop() {} });
    createOscillator = () => ({ ...node(), type: '', start: (t: number) => started.push(t), stop() {} });
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAC;
  return started;
}
const soundDeck = (attr = ' data-sound') =>
  deck(`<section class="slide"><h2>A</h2><p data-step="1">x</p></section><section class="slide"><h2>B</h2></section>`, attr);

describe('sound', () => {
  it('offers no toggle unless the deck asks for sound', () => {
    boot(deck(plain(2)));
    expect(document.querySelector('.ss-bar [aria-label="効果音 (S)"]')).toBeNull();
  });

  it('starts muted and stays silent until the viewer turns it on', () => {
    const started = fakeAudio();
    const { api } = boot(soundDeck());
    const toggle = document.querySelector<HTMLButtonElement>('.ss-bar [aria-label="効果音 (S)"]')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    api.next();
    expect(api.sfx('correct')).toBe(false);
    expect(started).toHaveLength(0);
    toggle.click();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const afterToggle = started.length;
    expect(afterToggle).toBeGreaterThan(0);
    api.next();
    expect(started.length).toBeGreaterThan(afterToggle);
    const beforeBack = started.length;
    api.prev();
    expect(started.length).toBe(beforeBack);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(api.sfx('correct')).toBe(false);
  });

  it('leaves navigation quiet with data-sound="manual"', () => {
    const started = fakeAudio();
    const { api } = boot(soundDeck(' data-sound="manual"'));
    document.querySelector<HTMLButtonElement>('.ss-bar [aria-label="効果音 (S)"]')!.click();
    const n = started.length;
    api.next(); api.next();
    expect(started.length).toBe(n);
    expect(api.sfx('xp')).toBe(true);
  });
});

const key = (k: string, target: EventTarget = document.body) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
const maxOf = (el: Element) => el.getAttribute('data-ss-max') || 'off';
const fsButton = (root: ParentNode = document) => root.querySelector<HTMLButtonElement>('.ss-bar .ss-fs')!;

// A stand-in Fullscreen API: requestFullscreen makes the element the fullscreen one; exitFullscreen clears it.
function fakeFullscreen() {
  let el: Element | null = null;
  const change = () => document.dispatchEvent(new Event('fullscreenchange'));
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const doc = document as unknown as Record<string, unknown>;
  Object.defineProperty(doc, 'fullscreenElement', { get: () => el, configurable: true });
  Object.defineProperty(doc, 'fullscreenEnabled', { value: true, configurable: true });
  doc.exitFullscreen = () => { el = null; change(); return Promise.resolve(); };
  proto.requestFullscreen = function (this: Element) { el = this; change(); return Promise.resolve(); };
  return {
    browserExit() { el = null; change(); },
    restore() { delete proto.requestFullscreen; delete doc.exitFullscreen; delete doc.fullscreenElement; delete doc.fullscreenEnabled; },
  };
}

describe('maximize', () => {
  it('without the Fullscreen API fills the window: F and the button toggle it, Esc leaves it', () => {
    boot(deck(plain(2)));
    const root = document.documentElement, b = fsButton();
    expect(b.getAttribute('aria-label')).toBe('全画面');
    key('f');
    expect(maxOf(root)).toBe('pseudo');
    expect(root.hasAttribute('data-ss-immersive')).toBe(true);
    expect(b.getAttribute('aria-label')).toBe('全画面を終了');
    expect(b.title).toBe('全画面を終了 (F)');
    key('Escape');
    expect(maxOf(root)).toBe('off');
    expect(b.title).toBe('全画面 (F)');
    b.click();
    expect(maxOf(root)).toBe('pseudo');
    b.click();
    expect(maxOf(root)).toBe('off');
  });

  it('uses the Fullscreen API when there is one, and follows the browser leaving it', async () => {
    const fs = fakeFullscreen();
    try {
      boot(deck(plain(2)));
      const root = document.documentElement;
      key('f');
      await Promise.resolve();
      expect(document.fullscreenElement).toBe(root);
      expect(maxOf(root)).toBe('api');
      fs.browserExit();
      expect(maxOf(root)).toBe('off');
      expect(fsButton().getAttribute('aria-label')).toBe('全画面');
      key('f');
      key('f');
      expect(document.fullscreenElement).toBeNull();
      expect(maxOf(root)).toBe('off');
    } finally { fs.restore(); }
  });

  it('Esc first closes an open popover, and F does nothing while typing a slide number', () => {
    boot(deck(plain(20)));
    const root = document.documentElement;
    key('f'); key('t');
    key('Escape');
    expect(document.querySelector<HTMLElement>('.ss-pop')!.hidden).toBe(true);
    expect(maxOf(root)).toBe('pseudo');
    key('Escape');
    expect(maxOf(root)).toBe('off');
    key('f', document.querySelector('.ss-jump input')!);
    expect(maxOf(root)).toBe('off');
  });
});

describe('a deck as a course unit', () => {
  function unit() {
    const root = document.createElement('div');
    root.className = 'su-unit';
    root.innerHTML = deck(plain(2));
    document.body.appendChild(root);
    new Function(runtimeJs)();
    const ran: string[] = [];
    const host = { saved: null, progress() {}, complete() {}, setRest() {}, position() {},
      endActions: () => [{ label: 'next', primary: true, run: () => ran.push(maxOf(root)) }] };
    const kinds = (window as unknown as { YESUnits: { kinds: Record<string, Function> } }).YESUnits.kinds;
    const u = kinds.slides(root, {}, host) as { show(rest?: string): void; hide(): void };
    return { root, u, ran };
  }

  it('maximizes its own unit, only while it is the one shown, and leaves before moving on', () => {
    const { root, u, ran } = unit();
    key('f');
    expect(maxOf(root)).toBe('off');
    u.show();
    expect(fsButton(root).getAttribute('aria-label')).toBe('全画面');
    key('f');
    expect(maxOf(root)).toBe('pseudo');
    expect(maxOf(document.documentElement)).toBe('off');
    u.hide();
    expect(maxOf(root)).toBe('off');
    u.show('2');
    fsButton(root).click();
    root.querySelector<HTMLButtonElement>('.ss-unit-end button')!.click();
    expect(ran).toEqual(['off']);
  });
});

describe('links to other documents', () => {
  it('fills href from data-page', () => {
    boot(deck(`<section class="slide"><a data-page="other.html#3.1">x</a></section>`));
    const a = document.querySelector('a')!;
    expect(a.getAttribute('href')).toMatch(/other\.html#3\.1$/);
  });

  it('lets a host page resolve data-page links, and falls back when it declines or throws', () => {
    const w = window as unknown as { YESHost?: unknown };
    w.YESHost = { resolveLink: (id: string, hash: string) => (id === 'host' ? { href: `/hosted/${id}${hash}`, target: '_blank' } : null) };
    try {
      boot(deck(`<section class="slide"><a id="h" data-page="host#2">x</a><a id="p" data-page="plain.html">y</a></section>`));
      expect(document.getElementById('h')!.getAttribute('href')).toBe('/hosted/host#2');
      expect(document.getElementById('h')!.getAttribute('target')).toBe('_blank');
      expect(document.getElementById('p')!.getAttribute('href')).toBe('plain.html');
      w.YESHost = { resolveLink: () => { throw new Error('boom'); } };
      boot(deck(`<section class="slide"><a id="t" data-page="plain.html">y</a></section>`));
      expect(document.getElementById('t')!.getAttribute('href')).toBe('plain.html');
    } finally {
      delete w.YESHost;
    }
  });
});

describe('example.html', () => {
  it('boots with every slide titled and the scene registered', () => {
    const { api } = boot(example);
    expect(api.state.count).toBeGreaterThanOrEqual(8);
    api.go('scene', 2);
    expect(api.state.steps).toBe(3);
    expect(document.querySelector('#scene .readout')!.textContent).toContain('step 2');
  });
});
