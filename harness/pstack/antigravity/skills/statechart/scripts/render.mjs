import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { GROUP_PALETTE, PLAIN_FILL } from "./lib.mjs";

export const PACKAGES = ["pele@1.8.0", "@resvg/resvg-js@2.6.2"];
export const CACHE_NAME = PACKAGES.map((p) => p.replace(/^@[^/]+\//, "").replace("@", "-")).join(
  "-",
);
const ENTRY = 'export { render } from "pele";\nexport { Resvg } from "@resvg/resvg-js";\n';

export const cacheDir = () =>
  path.join(
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"),
    "statechart",
    CACHE_NAME,
  );

function install(dir) {
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const tmp = fs.mkdtempSync(`${dir}-`);
  try {
    fs.writeFileSync(path.join(tmp, "package.json"), '{ "private": true }\n');
    console.error(`Installing ${PACKAGES.join(" and ")} with npm in ${dir}. This happens once.`);
    const r = spawnSync(
      "npm",
      ["install", "--no-audit", "--no-fund", "--ignore-scripts", "--save-exact", ...PACKAGES],
      {
        cwd: tmp,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ""}`,
        },
        shell: process.platform === "win32",
      },
    );
    if (r.status !== 0) {
      const said =
        r.error?.message ??
        (`${r.stderr ?? ""}${r.stdout ?? ""}`.trim().split("\n").slice(-20).join("\n") ||
          `npm install exited ${r.status}, with no output`);
      throw new Error(
        `cannot install ${PACKAGES.join(" and ")} with npm:\n${said.replace(/^/gm, "  ")}`,
      );
    }
    fs.writeFileSync(path.join(tmp, "entry.mjs"), ENTRY);
    try {
      fs.renameSync(tmp, dir);
    } catch (e) {
      if (!fs.existsSync(path.join(dir, "entry.mjs"))) throw e;
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export async function loadRenderer() {
  const dir = cacheDir();
  const entry = path.join(dir, "entry.mjs");
  if (!fs.existsSync(entry)) install(dir);
  try {
    return await import(pathToFileURL(entry).href);
  } catch (e) {
    throw new Error(
      `cannot load Pele and resvg from ${dir}: ${e.message}\nDelete that folder to install them again.`,
    );
  }
}

const STYLE = { line: 1.5, text: 0.4, arrow: 1.25, zoom: 2 };
const MAX_PIXELS = 100_000_000;
const MARK = "2.5px";
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const THEMES = {
  light: {
    background: "#ffffff",
    stateFill: "#fcfcfc",
    stateBorder: "#c9c9c9",
    stateText: "#1c1c1c",
    edge: "#808080",
    edgeLabel: "#656565",
    region: { fill: "#f1f1f1", border: "#c9c9c9", text: "#1c1c1c" },
    groups: ["#c3e0ff", "#f0d3bf", "#e3d5ff", "#f0dcbf", "#bfe3df", "#e5d9ce", "#ffcbe6"],
    groupBorder: "#c9c9c9",
    wrong: { fill: "#ffecee", border: "#e72e3b", text: "#cd2834" },
    fixed: { fill: "#eaf9f2", border: "#10ab61" },
    mixed: { fill: "#fff3e6", border: "#e8730c", text: "#b85a06" },
    after: { fill: "#ffffff", border: "#9a9a9a", text: "#656565" },
    worse: { fill: "#f7edfd", border: "#9b35d6", text: "#8424b8" },
    path: "#1680f3",
  },
  dark: {
    background: "#1f1f1f",
    stateFill: "#121212",
    stateBorder: "#4e4e4e",
    stateText: "#f5f5f5",
    edge: "#939393",
    edgeLabel: "#acacac",
    region: { fill: "#2c2c2c", border: "#4e4e4e", text: "#f5f5f5" },
    groups: ["#1b3857", "#573117", "#3c2e57", "#573d17", "#174641", "#3d3127", "#57233e"],
    groupBorder: "#4e4e4e",
    wrong: { fill: "#2e2021", border: "#cf2b35", text: "#ff6463" },
    fixed: { fill: "#1e2a25", border: "#0e9f5a" },
    mixed: { fill: "#2e2619", border: "#d0700f", text: "#ffa257" },
    after: { fill: "#1f1f1f", border: "#6e6e6e", text: "#acacac" },
    worse: { fill: "#29202e", border: "#9a3fcf", text: "#d38cff" },
    path: "#116dd2",
  },
  classic: {
    background: "#ffffff",
    stateFill: PLAIN_FILL,
    stateBorder: "#566573",
    stateText: "#1b2631",
    edge: "#1f1f1f",
    edgeLabel: "#1f1f1f",
    region: { fill: "#e6e6e6", border: "#8a8a8a", text: "#1f1f1f" },
    groups: null,
    groupBorder: null,
    wrong: { fill: "#fadbd8", border: "#922b21", text: "#7b241c" },
    fixed: { fill: "#d5f5e3", border: "#196f3d" },
    mixed: { fill: "#fdebd0", border: "#d35400", text: "#7e5109" },
    after: { fill: "#ffffff", border: "#808b96", text: "#566573" },
    worse: { fill: "#ebdef0", border: "#6c3483", text: "#4a235a" },
    path: "#1f3a93",
  },
};

const hex6 = (c) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c?.trim() ?? "");
  if (!m) return null;
  const h = m[1].toLowerCase();
  return `#${h.length === 3 ? [...h].map((x) => x + x).join("") : h}`;
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lab = (hex) => {
  const [r, g, b] = rgb(hex).map((c) =>
    (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [x, y, z] = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
  ].map(f);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const deltaE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

const STATE_CLASS =
  /^(plain|group\d+|works|wrong|fixed|mixed|after|worse)(Wrong|Fixed|Mixed|After|Worse|Path)?$/;
const CLASS_DEF = /^(\s*classDef\s+)(\w+)\s+(\S+?)\s*$/gm;
const rawFill = (body) => /(?:^|,)fill:([^,]+)/.exec(body)?.[1];
const STATUSES = ["wrong", "fixed", "mixed", "after", "worse"];

function markOf(name) {
  const m = STATE_CLASS.exec(name);
  if (!m) return null;
  const [, base, mark = ""] = m;
  const own = mark.toLowerCase();
  if (STATUSES.includes(own)) return own;
  return STATUSES.includes(base) ? base : own;
}

function paletteSlots(fills) {
  const slot = new Map();
  const taken = new Set();
  for (const f of fills) {
    const k = GROUP_PALETTE.indexOf(f);
    if (k >= 0) {
      slot.set(f, k);
      taken.add(k);
    }
  }
  const all = GROUP_PALETTE.map((_, k) => k);
  for (const f of fills) {
    if (f === PLAIN_FILL || slot.has(f)) continue;
    const free = all.filter((k) => !taken.has(k));
    const [k] = (free.length ? free : all).sort(
      (a, b) => deltaE(f, GROUP_PALETTE[a]) - deltaE(f, GROUP_PALETTE[b]),
    );
    slot.set(f, k);
    taken.add(k);
  }
  return slot;
}

const marked = ({ fill, border, text }) =>
  `fill:${fill},stroke:${border},stroke-width:${MARK},color:${text}`;
const STYLES = {
  wrong: ({ wrong }) => marked(wrong),
  mixed: ({ mixed }) => marked(mixed),
  after: ({ after }) => marked(after),
  worse: ({ worse }) => marked(worse),
  fixed: ({ fixed: f, stateText }) =>
    `fill:${f.fill},stroke:${f.border},stroke-width:${MARK},color:${stateText}`,
  path: ({ path, stateText }, fill) =>
    `${fill ? `fill:${fill},` : ""}stroke:${path},stroke-width:${MARK},color:${stateText}`,
  "": ({ groups, stateFill, stateBorder, groupBorder, stateText }, fill) =>
    groups &&
    `${fill ? `fill:${fill},` : ""}stroke:${fill === stateFill ? stateBorder : groupBorder},color:${stateText}`,
};

function themed(src, theme) {
  const own = new Set();
  for (const [, , name, body] of src.matchAll(CLASS_DEF)) {
    const fill = hex6(rawFill(body));
    if (fill && (markOf(name) === "" || markOf(name) === "path")) own.add(fill);
  }
  const slot = paletteSlots([...own]);
  const fillFor = (body) => {
    const raw = rawFill(body);
    const fill = hex6(raw);
    if (!theme.groups || !fill) return raw;
    if (fill === PLAIN_FILL) return theme.stateFill;
    return slot.has(fill) ? theme.groups[slot.get(fill)] : raw;
  };
  return src.replace(CLASS_DEF, (line, head, name, body) => {
    const mark = markOf(name);
    const style = mark === null ? null : STYLES[mark](theme, fillFor(body));
    return style ? `${head}${name} ${style}` : line;
  });
}

function withRootDirection(src) {
  const lines = src.split("\n");
  let at = -1;
  let depth = 0;
  let regions = false;
  let direction = false;
  for (const [i, line] of lines.entries()) {
    const code = line
      .replace(/"[^"]*"/g, '""')
      .replace(/:.*$/, "")
      .trim();
    if (at < 0) {
      if (/^stateDiagram/.test(code)) at = i;
      continue;
    }
    if (code.startsWith("%%")) continue;
    if (code === "--") regions = true;
    if (depth === 0 && /^direction\s/.test(code)) direction = true;
    depth += (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length;
  }
  if (at < 0 || !regions || direction) return src;
  lines.splice(at + 1, 0, "  direction LR");
  return lines.join("\n");
}

const SYSTEM_KEYWORD = /^(system-ui|-apple-system|BlinkMacSystemFont|ui-sans-serif)$/i;

export function fcMatch(pattern) {
  try {
    const [file, name] = execFileSync("fc-match", ["-f", "%{file}\n%{family[0]}", pattern], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).split("\n");
    return file ? { file, name } : null;
  } catch {
    return null;
  }
}

let systemFont;
export function systemFamily() {
  if (systemFont === undefined) systemFont = fcMatch("system-ui")?.name ?? null;
  return systemFont;
}

function pngStack(sys) {
  if (!sys) return FONT;
  const names = FONT.split(",")
    .map((f) => f.trim().replace(/^'|'$/g, ""))
    .map((f) => (SYSTEM_KEYWORD.test(f) ? sys : f));
  return [...new Set(names)].map((f) => (/^[\w-]+$/.test(f) ? f : `'${f}'`)).join(", ");
}

const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const measurers = new Map();
export function fontMeasurer(Resvg, family) {
  if (measurers.has(family)) return measurers.get(family);
  const ink = (face, text, size, style) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="200"><text x="10" y="100" font-size="${size}"` +
      ` font-family="'${face.name}'"${style & 1 ? ' font-weight="bold"' : ""}${style & 2 ? ' font-style="italic"' : ""}` +
      ` xml:space="preserve">${xml(text)}</text></svg>`;
    const font = face.file
      ? { loadSystemFonts: false, fontFiles: [face.file] }
      : { loadSystemFonts: true };
    return new Resvg(svg, { font }).getBBox()?.width;
  };
  const draws = (face, style) => ink(face, "x", 16, style) > 0;
  const matchFace = (style) => {
    const name = style & 4 ? "monospace" : family;
    return fcMatch(`${name}${style & 1 ? ":bold" : ""}${style & 2 ? ":italic" : ""}`) ?? { name };
  };
  const regular = matchFace(0);
  if (!draws(regular, 0)) {
    measurers.set(family, null);
    return null;
  }
  const faces = new Map([[0, regular]]);
  const faceFor = (style) => {
    if (!faces.has(style)) {
      const face = matchFace(style);
      faces.set(style, draws(face, style) ? face : regular);
    }
    return faces.get(style);
  };
  const widths = new Map();
  const bars = new Map();
  const measurer = {
    width(text, size, style = 0) {
      const key = `${size}|${style}|${text}`;
      if (!widths.has(key)) {
        const face = faceFor(style);
        const bar = `${size}|${style}`;
        if (!bars.has(bar)) bars.set(bar, ink(face, "||", size, style));
        widths.set(key, text ? ink(face, `|${text}|`, size, style) - bars.get(bar) : 0);
      }
      return widths.get(key);
    },
  };
  measurers.set(family, measurer);
  return measurer;
}

const STATE_PAD = 16;
const DEFAULT_WRAP = 200;
const labelLines = (src) =>
  [...src.matchAll(/^\s*state "([^"]+)" as|^[^%\n]*-->[^:\n]*:\s*([^\n]+)$/gm)]
    .flatMap((m) => (m[1] ?? m[2]).split(/<br\s*\/?>/))
    .map((l) => l.trim())
    .filter((l) => l && !/["\\]/.test(l));

function widthRatio(render, src, measurer) {
  const lines = [...new Set(labelLines(src))];
  if (!lines.length) return 1;
  const probe = `---\nconfig:\n  state:\n    wrappingWidth: 2000\n---\nstateDiagram-v2\n${lines.map((l, i) => `  state "${l}" as p${i}`).join("\n")}\n`;
  const builtin = new Map(
    [...render(probe).svg.matchAll(/data-id="p(\d+)"[^>]*><rect\b[^>]*\swidth="([\d.]+)"/g)].map(
      ([, i, w]) => [lines[+i], +w - 2 * STATE_PAD],
    ),
  );
  const sum = (f) => lines.reduce((s, l) => s + f(l), 0);
  return (
    sum((l) => measurer.width(l, 16, 0)) / sum((l) => builtin.get(l) ?? measurer.width(l, 16, 0))
  );
}

function setWrap(src, width) {
  const fm = /^---\n([\s\S]*?\n)---\n/.exec(src);
  if (!fm) return `---\nconfig:\n  state:\n    wrappingWidth: ${width}\n---\n${src}`;
  let body = fm[1];
  if (/^ {4}wrappingWidth:.*$/m.test(body))
    body = body.replace(/^ {4}wrappingWidth:.*$/m, `    wrappingWidth: ${width}`);
  else if (/^ {2}state:\n/m.test(body))
    body = body.replace(/^( {2}state:\n)/m, `$1    wrappingWidth: ${width}\n`);
  else if (/^config:\n/m.test(body))
    body = body.replace(/^(config:\n)/m, `$1  state:\n    wrappingWidth: ${width}\n`);
  else body += `config:\n  state:\n    wrappingWidth: ${width}\n`;
  return `---\n${body}---\n${src.slice(fm[0].length)}`;
}
const wrapOf = (src) =>
  +(/^---\n[\s\S]*?^ {4}wrappingWidth:\s*(\d+)[\s\S]*?^---$/m.exec(src)?.[1] ?? DEFAULT_WRAP);

const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function splitTop(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function resolveCss(svg) {
  const defs = new Map();
  for (const m of svg.matchAll(/(--[\w-]+)\s*:\s*([^;"}]+)/g))
    if (!defs.has(m[1])) defs.set(m[1], m[2].trim());
  const resolve = (value) => {
    let changed = true;
    while (changed) {
      changed = false;
      value = value.replace(
        /var\((--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g,
        (_, name, fallback) => {
          changed = true;
          const d = defs.get(name);
          if (d !== undefined && d !== `var(${name})`) return resolve(d);
          return fallback !== undefined ? fallback : "currentColor";
        },
      );
      value = value.replace(/color-mix\(\s*in srgb\s*,((?:[^()]|\([^()]*\))*)\)/g, (_, args) => {
        changed = true;
        const [a, b] = splitTop(args);
        const pa = /(.*?)\s+([\d.]+)%$/.exec(a);
        const ca = hex6(pa ? pa[1] : a);
        const cb = hex6(b.replace(/\s+[\d.]+%$/, ""));
        const p = pa ? Number(pa[2]) / 100 : 0.5;
        if (!ca || !cb) return pa ? pa[1] : a;
        const [x, y] = [rgb(ca), rgb(cb)];
        return toHex(x.map((v, i) => v * p + y[i] * (1 - p)));
      });
    }
    return value;
  };
  for (const [k, v] of defs) defs.set(k, resolve(v));
  return resolve(svg.replace(/@import[^;]+;/g, ""));
}

function themeSvg(svg, theme) {
  const vars =
    `--pele-bg:${theme.background};--pele-fg:${theme.region.text};--pele-muted:${theme.edgeLabel};--pele-line:${theme.edge};` +
    `--pele-surface:${theme.stateFill};--pele-surface-alt:${theme.region.fill};--pele-border:${theme.region.border};`;
  return svg
    .replace(/(<svg\b[^>]*?\sstyle=")/, `$1${vars}`)
    .replace(
      /(<g class="pele-edge-label"[^>]*><rect[^>]*\/><text\b)/g,
      `$1 fill="${theme.edgeLabel}"`,
    );
}

const LINES =
  `<style>.pele-edges,.pele-dividers{stroke-width:${STYLE.line}px}` +
  `.pele-node rect,.pele-node path,.pele-node circle,.pele-cluster rect,.pele-cluster path,.pele-note rect,.pele-note path{stroke-width:${STYLE.line}px}</style>`;
const round = (v) => +v.toFixed(2);

function heavier(svg) {
  svg = resolveCss(svg)
    .replace(/style="([^"]*)"/g, (_, css) => `style="${css.replace(/--[\w-]+:[^;]*;?/g, "")}"`)
    .replace(/font:\s*([\d.]+px)\s+([^;"]+);/, "font-size:$1;font-family:$2;");
  const rootFill = /<svg[^>]*\sfill="([^"]+)"/.exec(svg)?.[1] ?? "#1f1f1f";
  return svg
    .replace(/(<svg[^>]*>)/, `$1${LINES}`)
    .replace(/<text\b([^>]*)>/g, (_, attrs) => {
      const fill =
        /style="[^"]*fill:\s*([^;"]+)/.exec(attrs)?.[1] ??
        /\sfill="([^"]+)"/.exec(attrs)?.[1] ??
        rootFill;
      return `<text${attrs} stroke="${fill.trim()}" stroke-width="${STYLE.text}" stroke-linejoin="round">`;
    })
    .replace(
      /(class="pele-marker" d=")M([\d.-]+),([\d.-]+)((?:L[\d.-]+,[\d.-]+)+)Z/g,
      (_, head, tx, ty, rest) => {
        const [x0, y0] = [+tx, +ty];
        const points = [...rest.matchAll(/L([\d.-]+),([\d.-]+)/g)].map(
          ([, x, y]) =>
            `L${round(x0 + (x - x0) * STYLE.arrow)},${round(y0 + (y - y0) * STYLE.arrow)}`,
        );
        return `${head}M${tx},${ty}${points.join("")}Z`;
      },
    );
}

function maskBands(svg) {
  const pad = STYLE.line / 2;
  // The holes set their own fill because mask content inherits the root <svg> fill, which is not black.
  const holes = [
    ...svg.matchAll(
      /<g class="pele-cluster\b[^"]*"[^>]*><rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)"[^>]*\/><path d="M[\d.-]+,([\d.-]+)H/g,
    ),
  ]
    .map(
      ([, x, y, w, divider]) =>
        `<rect x="${round(x - pad)}" y="${round(y - pad)}" width="${round(+w + 2 * pad)}" height="${round(divider - y + 2 * pad)}" fill="#000"/>`,
    )
    .join("");
  if (!holes) return svg;
  return svg.replace(
    /<g class="pele-edges"/,
    `<mask id="pele-bands" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="#fff"/>${holes}</mask>$& mask="url(#pele-bands)"`,
  );
}

export function renderChart(lib, src, { theme = THEMES.light, systemFont = systemFamily() } = {}) {
  let text = withRootDirection(themed(src, theme));
  const measurer = systemFont ? fontMeasurer(lib.Resvg, systemFont) : undefined;
  let wrap = wrapOf(text);
  if (measurer) {
    wrap = Math.ceil(wrap * Math.max(1, widthRatio(lib.render, text, measurer)));
    text = setWrap(text, wrap);
  }
  const r = lib.render(text, { fontFamily: FONT, measurer });
  return {
    svg: heavier(maskBands(themeSvg(r.svg, theme))),
    width: r.width,
    height: r.height,
    wrap,
  };
}

export function toPng(
  lib,
  { svg, width, height },
  { theme = THEMES.light, systemFont = systemFamily() } = {},
) {
  return new lib.Resvg(svg.split(FONT).join(pngStack(systemFont)), {
    background: theme.background,
    fitTo: { mode: "zoom", value: Math.min(STYLE.zoom, Math.sqrt(MAX_PIXELS / (width * height))) },
    font: systemFont
      ? { loadSystemFonts: true, defaultFontFamily: systemFont, sansSerifFamily: systemFont }
      : { loadSystemFonts: true },
  })
    .render()
    .asPng();
}

export function renderPng(lib, src, options = {}) {
  try {
    return toPng(lib, renderChart(lib, src, options), options);
  } catch (e) {
    if (e.code !== "limit") throw e;
    throw new Error(
      `${e.message} The chart is too big for one PNG, and the .mmd file still has all of it. A chart with fewer states fits. Run node statechart.mjs from-spec SPEC.tla --cover --png to draw a smaller overview of the spec.`,
    );
  }
}
