function toggle(hdr) {
  var b = hdr.nextElementSibling, c = hdr.querySelector('.chev');
  b.classList.toggle('open'); c.classList.toggle('open');
}
function toggleBP(hdr) {
  var b = hdr.nextElementSibling, c = hdr.querySelector('.chev');
  b.classList.toggle('open'); c.classList.toggle('open');
}

function isImport(line) {
  var s = line.replace(/^[+ -]/, '').trim();
  return s.startsWith('import ') || s.startsWith('import{') || s.startsWith('} from ');
}

function isWhitespaceOnly(del, add) {
  // Collapse whitespace runs instead of stripping all whitespace, so only
  // true whitespace changes compare equal ("a b" vs "ab" must differ).
  return del.replace(/^-/, '').replace(/\s+/g, ' ').trim() ===
    add.replace(/^\+/, '').replace(/\s+/g, ' ').trim();
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normWs(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function toLines(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') return input.split('\n');
  return [];
}

function loadPrDiffs() {
  var el = document.getElementById('pr-diffs-json');
  if (!el) return null;
  try {
    return JSON.parse(el.textContent || '');
  } catch (err) {
    console.error('Failed to parse PR diff JSON payload', err);
    return null;
  }
}

function detectMoves(dels, adds) {
  var TH = 3;
  var md = {}, ma = {};
  for (var di = 0; di < dels.length; di++) {
    if (md[di]) continue;
    var db = [di];
    for (var d2 = di+1; d2 < dels.length && d2-di < 40; d2++) {
      if (dels[d2].consecutive && !md[d2]) db.push(d2); else break;
    }
    if (db.length < TH) continue;
    var dn = db.map(function(i){ return normWs(dels[i].code); });
    for (var ai = 0; ai < adds.length; ai++) {
      if (ma[ai]) continue;
      var ab = [ai];
      for (var a2 = ai+1; a2 < adds.length && a2-ai < 40; a2++) {
        if (adds[a2].consecutive && !ma[a2]) ab.push(a2); else break;
      }
      if (ab.length < TH) continue;
      var an = ab.map(function(i){ return normWs(adds[i].code); });
      var ml = Math.min(dn.length, an.length), mc = 0;
      for (var m = 0; m < ml; m++) { if (dn[m] === an[m]) mc++; }
      if (mc >= TH && mc >= ml * 0.7) {
        for (var k = 0; k < ml; k++) {
          md[db[k]] = { exact: dn[k] === an[k] };
          ma[ab[k]] = { exact: dn[k] === an[k] };
        }
        break;
      }
    }
  }
  return { movedDels: md, movedAdds: ma };
}

/**
 * renderDiff(target, diffInput, options)
 *   target: DOM element, string ID, or CSS selector
 *   diffInput: array of diff lines, OR a single string (will be split on \n)
 *   options: { showImports: boolean } — when true, import lines render like
 *     any other line. Otherwise they collapse into a visible "N import lines
 *     hidden" row, so filtering is never silent. Either way, line numbers
 *     always come from the full raw diff.
 */
function renderDiff(target, diffInput, options) {
  var el;
  if (typeof target === 'string') {
    el = document.getElementById(target) || document.querySelector(target);
  } else {
    el = target;
  }
  if (!el) return;
  var showImports = !!(options && options.showImports);

  var lines = toLines(diffInput);
  if (!lines.length) { el.innerHTML = '<div style="padding:12px;color:#777;font-size:12px;">No diff data</div>'; return; }

  // Phase 1: parse and number the FULL raw diff first, so hunk headers drive
  // every line number even when some lines are hidden at render time.
  var parsed = [];
  var oL = 0, nL = 0, pD = false, pA = false;
  for (var pi = 0; pi < lines.length; pi++) {
    var line = lines[pi];
    if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('diff ')) continue;
    if (line.startsWith('@@')) {
      var hm = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/);
      if (hm) { oL = parseInt(hm[1]); nL = parseInt(hm[2]); }
      parsed.push({ type: 'hunk', text: line }); pD = false; pA = false; continue;
    }
    if (line.startsWith('+')) {
      parsed.push({ type: 'add', raw: line, code: line.slice(1), newLine: nL, consecutive: pA });
      nL++; pA = true; pD = false;
    } else if (line.startsWith('-')) {
      parsed.push({ type: 'del', raw: line, code: line.slice(1), oldLine: oL, consecutive: pD });
      oL++; pD = true; pA = false;
    } else {
      var c = line.startsWith(' ') ? line.slice(1) : line;
      parsed.push({ type: 'ctx', raw: line, code: c, oldLine: oL, newLine: nL });
      oL++; nL++; pD = false; pA = false;
    }
  }

  // Phase 2: merge whitespace-only del/add pairs into context lines. The merge
  // consumes the same old/new counters as the pair did, so numbering is kept.
  // Pairs merge independently: an import edit in the same replacement block
  // must not stop a whitespace-only pair from merging (the import pair itself
  // stays a del/add and is hidden with a marker at render time).
  var merged = [];
  for (var mi = 0; mi < parsed.length; mi++) {
    var e = parsed[mi];
    if (e.type === 'del') {
      var dr = [e], mj = mi + 1;
      while (mj < parsed.length && parsed[mj].type === 'del') { dr.push(parsed[mj]); mj++; }
      var ar = [], mk = mj;
      while (mk < parsed.length && parsed[mk].type === 'add') { ar.push(parsed[mk]); mk++; }
      if (ar.length === dr.length && dr.length > 0) {
        var mergeFlags = [];
        for (var wc = 0; wc < dr.length; wc++) {
          mergeFlags.push(isWhitespaceOnly('-' + dr[wc].code, '+' + ar[wc].code));
        }
        var anyWs = mergeFlags.some(function (f) { return f; });
        if (anyWs) {
          for (var wx = 0; wx < ar.length; wx++) {
            if (mergeFlags[wx]) {
              merged.push({ type: 'ctx', raw: ' ' + ar[wx].code, code: ar[wx].code,
                oldLine: dr[wx].oldLine, newLine: ar[wx].newLine });
            } else {
              merged.push(dr[wx]);
            }
          }
          for (var ax = 0; ax < ar.length; ax++) {
            if (!mergeFlags[ax]) merged.push(ar[ax]);
          }
          mi = mk - 1; continue;
        }
      }
    }
    merged.push(e);
  }
  parsed = merged;

  var dels = [], adds = [];
  for (var di = 0; di < parsed.length; di++) {
    parsed[di].idx = di;
    if (parsed[di].type === 'del') dels.push(parsed[di]);
    else if (parsed[di].type === 'add') adds.push(parsed[di]);
  }

  var mv = detectMoves(dels, adds);
  var rows = [];
  var hiddenImports = 0;
  var flushImports = function() {
    if (hiddenImports > 0) {
      rows.push('<tr class="diff-imports-hidden"><td class="diff-ln"></td><td class="diff-ln"></td><td class="diff-code">' +
        hiddenImports + (hiddenImports === 1 ? ' import line hidden' : ' import lines hidden') + '</td></tr>');
      hiddenImports = 0;
    }
  };
  for (var ri = 0; ri < parsed.length; ri++) {
    var p = parsed[ri];
    if (p.type !== 'hunk' && !showImports && isImport(p.raw)) { hiddenImports++; continue; }
    flushImports();
    if (p.type === 'hunk') {
      rows.push('<tr class="diff-hunk"><td class="diff-ln"></td><td class="diff-ln"></td><td class="diff-code">' + esc(p.text) + '</td></tr>');
    } else if (p.type === 'add') {
      var ai2 = -1; for (var fa=0;fa<adds.length;fa++) if(adds[fa].idx===p.idx){ai2=fa;break;}
      var cls = (mv.movedAdds[ai2]) ? (mv.movedAdds[ai2].exact ? 'diff-moved-add' : 'diff-moved-add-edited') : 'diff-add';
      rows.push('<tr class="'+cls+'"><td class="diff-ln"></td><td class="diff-ln">'+p.newLine+'</td><td class="diff-code">'+esc(p.code)+'</td></tr>');
    } else if (p.type === 'del') {
      var di2 = -1; for(var fd=0;fd<dels.length;fd++) if(dels[fd].idx===p.idx){di2=fd;break;}
      var cls2 = (mv.movedDels[di2]) ? (mv.movedDels[di2].exact ? 'diff-moved-del' : 'diff-moved-del-edited') : 'diff-del';
      rows.push('<tr class="'+cls2+'"><td class="diff-ln">'+p.oldLine+'</td><td class="diff-ln"></td><td class="diff-code">'+esc(p.code)+'</td></tr>');
    } else {
      rows.push('<tr class="diff-ctx"><td class="diff-ln">'+p.oldLine+'</td><td class="diff-ln">'+p.newLine+'</td><td class="diff-code">'+esc(p.code)+'</td></tr>');
    }
  }
  flushImports();
  el.innerHTML = '<table class="diff-table"><tbody>' + rows.join('') + '</tbody></table>';
}

/* Auto-discovery: after DOM loads, find all [data-diff] elements and render diffs from pr-diffs-json. */
document.addEventListener('DOMContentLoaded', function() {
  var prDiffs = loadPrDiffs();
  if (!prDiffs) return;
  var els = document.querySelectorAll('[data-diff]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-diff');
    if (key && Object.prototype.hasOwnProperty.call(prDiffs, key)) {
      renderDiff(els[i], prDiffs[key]);
    }
  }
});
