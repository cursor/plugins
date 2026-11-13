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

function isWhitespaceOnly(delCode, addCode) {
  return delCode.replace(/\s/g, '') === addCode.replace(/\s/g, '');
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

  // Number every line first so hidden imports still advance the counters;
  // filtering before numbering shifted every gutter number after a hidden line.
  var numbered = [];
  var oL = 0, nL = 0;
  for (var pi = 0; pi < lines.length; pi++) {
    var line = lines[pi];
    if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('diff ')) continue;
    if (line.startsWith('@@')) {
      var hm = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/);
      if (hm) { oL = parseInt(hm[1]); nL = parseInt(hm[2]); }
      numbered.push({ type: 'hunk', text: line }); continue;
    }
    var hidden = isImport(line);
    if (line.startsWith('+')) {
      numbered.push({ type:'add', code:line.slice(1), newLine:nL, hidden:hidden }); nL++;
    } else if (line.startsWith('-')) {
      numbered.push({ type:'del', code:line.slice(1), oldLine:oL, hidden:hidden }); oL++;
    } else {
      var c = line.startsWith(' ') ? line.slice(1) : line;
      numbered.push({ type:'ctx', code:c, oldLine:oL, newLine:nL, hidden:hidden }); oL++; nL++;
    }
  }

  var visible = numbered.filter(function(e) { return !e.hidden; });

  // Collapse a run of deletions followed by an equal run of additions when
  // every pair differs only in whitespace; the context row keeps both numbers.
  var wsOut = [];
  for (var wi = 0; wi < visible.length; wi++) {
    if (visible[wi].type === 'del') {
      var dr = [visible[wi]], wj = wi+1;
      while (wj < visible.length && visible[wj].type === 'del') { dr.push(visible[wj]); wj++; }
      var ar = [], wk = wj;
      while (wk < visible.length && visible[wk].type === 'add') { ar.push(visible[wk]); wk++; }
      if (dr.length === ar.length && dr.length > 0) {
        var allWs = true;
        for (var wc = 0; wc < dr.length; wc++) { if (!isWhitespaceOnly(dr[wc].code, ar[wc].code)) { allWs = false; break; } }
        if (allWs) {
          for (var wx = 0; wx < ar.length; wx++) wsOut.push({ type:'ctx', code:ar[wx].code, oldLine:dr[wx].oldLine, newLine:ar[wx].newLine });
          wi = wk-1; continue;
        }
      }
    }
    wsOut.push(visible[wi]);
  }

  var dels = [], adds = [], parsed = [];
  var pD = false, pA = false;
  for (var qi = 0; qi < wsOut.length; qi++) {
    var e = wsOut[qi];
    if (e.type === 'hunk') { parsed.push(e); pD = false; pA = false; continue; }
    if (e.type === 'add') {
      var ae = { type:'add', code:e.code, newLine:e.newLine, consecutive:pA, idx:parsed.length };
      adds.push(ae); parsed.push(ae); pA = true; pD = false;
    } else if (e.type === 'del') {
      var de = { type:'del', code:e.code, oldLine:e.oldLine, consecutive:pD, idx:parsed.length };
      dels.push(de); parsed.push(de); pD = true; pA = false;
    } else {
      parsed.push({ type:'ctx', code:e.code, oldLine:e.oldLine, newLine:e.newLine }); pD = false; pA = false;
    }
  }

  var mv = detectMoves(dels, adds);
  var rows = [];
  for (var ri = 0; ri < parsed.length; ri++) {
    var p = parsed[ri];
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
