function toggle(hdr) {
  var b = hdr.nextElementSibling, c = hdr.querySelector('.chev');
  b.classList.toggle('open'); c.classList.toggle('open');
}
function toggleBP(hdr) {
  var b = hdr.nextElementSibling, c = hdr.querySelector('.chev');
  b.classList.toggle('open'); c.classList.toggle('open');
}

/* Expand/collapse the "N import lines hidden" summary row (#472). */
function toggleHidden(row) {
  var open = row.classList.toggle('open');
  var c = row.querySelector('.chev');
  if (c) c.classList.toggle('open');
  var t = row.nextElementSibling;
  while (t && t.classList && t.classList.contains('diff-hidden-import')) {
    t.style.display = open ? '' : 'none';
    t = t.nextElementSibling;
  }
}

function isImport(line) {
  var s = line.replace(/^[+ -]/, '').trim();
  return s.startsWith('import ') || s.startsWith('import{') || s.startsWith('} from ');
}

function isWhitespaceOnly(del, add) {
  // Compare after trimming leading/trailing whitespace only. Internal
  // whitespace (string literals, significant indentation) is meaningful
  // and must never be collapsed away (#472).
  var d = del.replace(/^-/, '').replace(/^\s+|\s+$/g, '');
  var a = add.replace(/^\+/, '').replace(/^\s+|\s+$/g, '');
  return d === a;
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
 * renderDiff(target, diffInput)
 *   target: DOM element, string ID, or CSS selector
 *   diffInput: array of diff lines, OR a single string (will be split on \n)
 */
function renderDiff(target, diffInput) {
  var el;
  if (typeof target === 'string') {
    el = document.getElementById(target) || document.querySelector(target);
  } else {
    el = target;
  }
  if (!el) return;

  var lines = toLines(diffInput);
  if (!lines.length) { el.innerHTML = '<div style="padding:12px;color:#777;font-size:12px;">No diff data</div>'; return; }

  // Parse and number the FULL raw diff first. Import lines are tagged `hidden`
  // instead of deleted, so line numbers always come from the original hunk
  // headers and filtering can never shift them (#472).
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
      parsed.push({ type:'add', code:line.slice(1), newLine:nL, consecutive:pA, hidden:isImport(line) });
      nL++; pA = true; pD = false;
    } else if (line.startsWith('-')) {
      parsed.push({ type:'del', code:line.slice(1), oldLine:oL, consecutive:pD, hidden:isImport(line) });
      oL++; pD = true; pA = false;
    } else {
      var c = line.startsWith(' ') ? line.slice(1) : line;
      parsed.push({ type:'ctx', code:c, oldLine:oL, newLine:nL, hidden:isImport(line) });
      oL++; nL++; pD = false; pA = false;
    }
  }

  // Collapse whitespace-only del/add pairs into context lines. Line numbers
  // were already assigned above, so the rewritten rows keep the del's old
  // line and the add's new line.
  var collapsed = [];
  for (var ci = 0; ci < parsed.length; ci++) {
    if (parsed[ci].type === 'del') {
      var dj = ci;
      while (dj < parsed.length && parsed[dj].type === 'del') dj++;
      var ak = dj;
      while (ak < parsed.length && parsed[ak].type === 'add') ak++;
      if (dj > ci && ak === dj + (dj - ci)) {
        var allWs = true;
        for (var wc = 0; wc < dj - ci; wc++) {
          if (!isWhitespaceOnly('-' + parsed[ci + wc].code, '+' + parsed[dj + wc].code)) { allWs = false; break; }
        }
        if (allWs) {
          for (var wx = 0; wx < dj - ci; wx++) {
            collapsed.push({ type:'ctx', code:parsed[dj + wx].code,
              oldLine:parsed[ci + wx].oldLine, newLine:parsed[dj + wx].newLine });
          }
          ci = ak - 1; continue;
        }
      }
    }
    collapsed.push(parsed[ci]);
  }
  parsed = collapsed;

  var dels = [], adds = [];
  for (var bi = 0; bi < parsed.length; bi++) {
    if (parsed[bi].type === 'del') { parsed[bi].idx = dels.length; dels.push(parsed[bi]); }
    else if (parsed[bi].type === 'add') { parsed[bi].idx = adds.length; adds.push(parsed[bi]); }
  }

  var mv = detectMoves(dels, adds);
  var rows = [];
  for (var ri = 0; ri < parsed.length; ri++) {
    var p = parsed[ri];
    if (p.type === 'hunk') {
      rows.push('<tr class="diff-hunk"><td class="diff-ln"></td><td class="diff-ln"></td><td class="diff-code">' + esc(p.text) + '</td></tr>');
    } else if (p.hidden) {
      // Group consecutive hidden import lines into one visibly-marked,
      // expandable row instead of silently deleting them (#472).
      var grp = [];
      while (ri < parsed.length && parsed[ri].hidden) grp.push(parsed[ri++]);
      ri--;
      var label = grp.length + (grp.length === 1 ? ' import line' : ' import lines') + ' hidden';
      rows.push('<tr class="diff-hidden" onclick="toggleHidden(this)"><td class="diff-ln"></td><td class="diff-ln"></td><td class="diff-code"><span class="chev">&#9654;</span> ' + esc(label) + '</td></tr>');
      for (var gi = 0; gi < grp.length; gi++) {
        var g = grp[gi];
        rows.push('<tr class="diff-hidden-import" style="display:none"><td class="diff-ln">' + (g.oldLine != null ? g.oldLine : '') + '</td><td class="diff-ln">' + (g.newLine != null ? g.newLine : '') + '</td><td class="diff-code">' + esc(g.code) + '</td></tr>');
      }
    } else if (p.type === 'add') {
      var ma2 = mv.movedAdds[p.idx];
      var cls = ma2 ? (ma2.exact ? 'diff-moved-add' : 'diff-moved-add-edited') : 'diff-add';
      rows.push('<tr class="'+cls+'"><td class="diff-ln"></td><td class="diff-ln">'+p.newLine+'</td><td class="diff-code">'+esc(p.code)+'</td></tr>');
    } else if (p.type === 'del') {
      var md2 = mv.movedDels[p.idx];
      var cls2 = md2 ? (md2.exact ? 'diff-moved-del' : 'diff-moved-del-edited') : 'diff-del';
      rows.push('<tr class="'+cls2+'"><td class="diff-ln">'+p.oldLine+'</td><td class="diff-ln"></td><td class="diff-code">'+esc(p.code)+'</td></tr>');
    } else {
      rows.push('<tr class="diff-ctx"><td class="diff-ln">'+p.oldLine+'</td><td class="diff-ln">'+p.newLine+'</td><td class="diff-code">'+esc(p.code)+'</td></tr>');
    }
  }
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
