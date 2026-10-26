// Hostinger Headless — logo kit (step 05-design).
//
// Primitives for building a designed logo as outlined SVG: the letters become vector paths, so the
// logo needs no web font and renders identically everywhere. The agent composes the design; this
// file only does the parts that are easy to get wrong.
//
// Workflow (from ~/.hostinger/<domain>/brand/, so packages and this kit sit next to the build):
//   cp <installed skill>/steps/05-design/logo-kit.mjs .
//   npm init -y && npm i opentype.js @fontsource/<display-family-slug>
//   node logo-build.mjs          // your script: import { … } from './logo-kit.mjs'
//   rm -rf node_modules          // package.json keeps the deps; a redesign runs `npm i` again
//
// Packages resolve from the current working directory, so run the build from brand/.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const requireFromCwd = createRequire(join(process.cwd(), 'logo-build.js'));
const opentype = requireFromCwd('opentype.js');

// @fontsource splits each weight into unicode subsets; `latin` alone has no ą č ę ė į š ų ū ž,
// ő, ł, đ… so load every subset that exists and look each character up across them.
const SUBSETS = ['latin', 'latin-ext', 'vietnamese', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext'];

function parseWoff(file) {
  const buf = readFileSync(file);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

/**
 * Load a static @fontsource weight (the static packages ship .woff, which opentype.js reads;
 * variable packages ship only .woff2, which it can't). The returned font is the `latin` subset
 * with `charToGlyph` widened to every other subset in the package, so accented letters resolve.
 * @param {string} slug  family slug, e.g. "unbounded"
 * @param {number} weight e.g. 900
 */
export function loadFont(slug, weight = 400, style = 'normal') {
  const fonts = [];
  for (const subset of SUBSETS) {
    let file;
    try {
      file = requireFromCwd.resolve(`@fontsource/${slug}/files/${slug}-${subset}-${weight}-${style}.woff`);
    } catch {
      continue;
    }
    fonts.push(parseWoff(file));
  }
  if (!fonts.length) throw new Error(`logo-kit: @fontsource/${slug} has no ${weight} ${style} .woff files`);
  const [primary] = fonts;
  const own = primary.charToGlyph.bind(primary);
  primary.charToGlyph = (ch) => {
    for (const font of fonts) {
      const glyph = font === primary ? own(ch) : font.charToGlyph(ch);
      if (glyph.index) {
        glyph.kitFont = font;
        return glyph;
      }
    }
    return own(ch);
  };
  return primary;
}

const num = (v) => {
  if (!Number.isFinite(v)) throw new Error(`logo-kit: non-finite coordinate ${v}`);
  return +v.toFixed(2);
};

/**
 * Serialize an opentype Path to SVG path data. Use this instead of path.toPathData():
 * opentype.js 2.0 emits "NaN" when a coordinate's fraction is a tiny float residue
 * (its roundDecimal builds strings like "5.6e-14e+2"), and the browser silently stops drawing
 * the path at the first NaN.
 */
export function toD(path) {
  return path.commands
    .map((c) => {
      switch (c.type) {
        case 'Z':
          return 'Z';
        case 'Q':
          return `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`;
        case 'C':
          return `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`;
        default:
          return `${c.type}${num(c.x)} ${num(c.y)}`;
      }
    })
    .join('');
}

/**
 * Lay out a string with kerning. Positions are relative to x = 0 on the baseline.
 * One glyph per character: no ligatures or other substitutions, so `char` always matches its glyph
 * (and fonts whose substitution tables opentype.js can't run still work).
 * @returns {{ glyphs: { glyph, char: string, x: number, width: number }[], width: number, ascent: number, capHeight: number, xHeight: number }}
 */
export function layout(font, text, size, { tracking = 0 } = {}) {
  const scale = size / font.unitsPerEm;
  const chars = [...text];
  const glyphs = chars.map((ch) => font.charToGlyph(ch));
  glyphs.forEach((glyph, i) => {
    if (!glyph.index && chars[i].trim()) {
      throw new Error(`logo-kit: "${chars[i]}" is not in this font (it would render as an empty box); pick a font that has it`);
    }
  });
  let x = 0;
  const out = glyphs.map((glyph, i) => {
    // Kerning pairs only exist inside one subset file; across subsets the indexes don't match.
    if (i && (glyphs[i - 1].kitFont ?? font) === (glyph.kitFont ?? font)) {
      const kern = font.getKerningValue(glyphs[i - 1], glyph);
      x += (Number.isFinite(kern) ? kern : 0) * scale + tracking;
    }
    const item = { glyph, char: chars[i] ?? '', x, width: glyph.advanceWidth * scale };
    x += item.width;
    return item;
  });
  const capHeight = (font.tables.os2?.sCapHeight || font.ascender * 0.7) * scale;
  const xHeight = (font.tables.os2?.sxHeight || font.ascender * 0.5) * scale;
  return { glyphs: out, width: x, ascent: font.ascender * scale, capHeight, xHeight };
}

/**
 * Tight bounding box of a word's outlines at (x, baselineY), before any transform. Use it to size
 * the viewBox; add room for outlines, shadows and rotations yourself.
 * @returns {{ x1: number, y1: number, x2: number, y2: number }}
 */
export function pathBox(font, text, x, baselineY, size, opts) {
  const path = new opentype.Path();
  for (const g of layout(font, text, size, opts).glyphs) path.extend(g.glyph.getPath(x + g.x, baselineY, size));
  return path.getBoundingBox();
}

/** Path data for one glyph with its origin at (x, baselineY). */
export const glyphPath = (glyph, x, baselineY, size) => toD(glyph.getPath(x, baselineY, size));

/** Path data for a whole string starting at (x, baselineY). */
export function textPath(font, text, x, baselineY, size, opts) {
  return layout(font, text, size, opts)
    .glyphs.map((g) => glyphPath(g.glyph, x + g.x, baselineY, size))
    .join('');
}

/**
 * Set text around a circle (seals, badges). Each glyph is centred on its arc position and rotated
 * to stand on the circle. `fill: true` stretches the spacing so the text closes the full ring.
 * @returns {{ d: string, transform: string, char: string }[]} style each glyph however you like
 */
export function arcText(font, text, { cx, cy, r, size, startDeg = -90, fill = true }) {
  const { glyphs, width, capHeight } = layout(font, text, size);
  const k = fill ? (2 * Math.PI * r) / width : 1;
  const offset = fill ? 0 : -width / 2; // centred on startDeg when not filling
  return glyphs.map((g) => {
    const along = (g.x + g.width / 2 + offset) * k;
    const angle = along / r + (startDeg * Math.PI) / 180;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    const deg = (angle * 180) / Math.PI + 90;
    return {
      d: glyphPath(g.glyph, -g.width / 2, capHeight / 2, size),
      transform: `translate(${num(px)} ${num(py)}) rotate(${num(deg)})`,
      char: g.char,
    };
  });
}

/**
 * The outlined "cut-out" treatment: an ink outline drawn behind the fill (paint-order) plus an
 * optional hard offset shadow. `shadowColor` defaults to the ink; set it separately on dark
 * backgrounds, where a dark ink outline vanishes but a coloured shadow still reads.
 * Returns SVG markup.
 */
export function sticker(d, { fill, ink = '#000', strokeWidth = 8, shadow = 8, shadowColor = ink, transform = '' }) {
  const t = transform ? ` transform="${transform}"` : '';
  const shade = shadow
    ? `<path d="${d}" fill="${shadowColor}" stroke="${shadowColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" transform="translate(${shadow} ${shadow})"/>`
    : '';
  return `<g${t}>${shade}<path d="${d}" fill="${fill}" stroke="${ink}" stroke-width="${strokeWidth}" stroke-linejoin="round" paint-order="stroke"/></g>`;
}

/** Root SVG with an accessible name. Pass a distinct `id` if two logos are inlined on one page. */
export function svgDoc({ width, height, title, body, id = 'logo-title' }) {
  const esc = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-labelledby="${id}"><title id="${id}">${esc}</title>${body}</svg>`;
}

/**
 * Validate a finished SVG string before writing it. Throws on: NaN/undefined/Infinity in the
 * markup, live <text> (the logo must be outlined), a missing <title>, or a missing viewBox.
 * @returns {{ bytes: number }}
 */
export function check(svg) {
  const problems = [];
  if (/NaN|undefined|Infinity/.test(svg)) problems.push('contains NaN/undefined/Infinity');
  if (/<text[\s>]/.test(svg)) problems.push('contains <text>; outline the letters with textPath/glyphPath');
  if (!/<title[^>]*>[^<]+<\/title>/.test(svg)) problems.push('missing <title>');
  if (!/viewBox="0 0 [\d.]+ [\d.]+"/.test(svg)) problems.push('missing or invalid viewBox');
  if (problems.length) throw new Error(`logo-kit check failed: ${problems.join('; ')}`);
  return { bytes: Buffer.byteLength(svg) };
}
