import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function findUpCandidates(startDir, relSubpath) {
  const out = [];
  if (!startDir) return out;
  let cur = path.resolve(startDir);
  for (let i = 0; i < 6; i += 1) {
    out.push(path.join(cur, relSubpath));
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return out;
}

function loadParseSync(repoRoot) {
  const viteRel = path.join("node_modules", "vite", "dist", "node", "index.js");
  const candidates = [
    ...findUpCandidates(repoRoot, viteRel),
    ...findUpCandidates(process.cwd(), viteRel),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      const mod = require(cand);
      if (typeof mod.parseSync === "function") {
        return { kind: "vite", parseSync: mod.parseSync };
      }
    }
  }
  try {
    const mod = require("vite");
    if (typeof mod.parseSync === "function") {
      return { kind: "vite", parseSync: mod.parseSync };
    }
  } catch {
    // Fallback below checks TypeScript compiler API before degrading.
  }

  const tsRel = path.join("node_modules", "typescript", "lib", "typescript.js");
  for (const cand of [...findUpCandidates(repoRoot, tsRel), ...findUpCandidates(process.cwd(), tsRel)]) {
    if (fs.existsSync(cand)) {
      const ts = require(cand);
      if (typeof ts.createSourceFile === "function") {
        return { kind: "typescript", ts };
      }
    }
  }
  try {
    const ts = require("typescript");
    if (typeof ts.createSourceFile === "function") {
      return { kind: "typescript", ts };
    }
  } catch {
    return null;
  }
  return null;
}

function buildLineStarts(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i += 1) {
    if (src.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
}

function lineAtOffset(starts, offset) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= offset) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return hi + 1;
}

function splitCommentLinesWithOffsets(rawVal) {
  const re = /\r\n|[\n\r\u2028\u2029]/g;
  const segs = [];
  let lastIdx = 0;
  let m = re.exec(rawVal);
  while (m !== null) {
    segs.push({ text: rawVal.slice(lastIdx, m.index), offset: lastIdx });
    lastIdx = m.index + m[0].length;
    m = re.exec(rawVal);
  }
  segs.push({ text: rawVal.slice(lastIdx), offset: lastIdx });
  return segs;
}

function unwrapExpr(node) {
  let cur = node;
  while (
    cur !== null &&
    cur !== undefined &&
    typeof cur === "object" &&
    (cur.type === "ParenthesizedExpression" ||
      cur.type === "TSAsExpression" ||
      cur.type === "TSTypeAssertion" ||
      cur.type === "TSSatisfiesExpression" ||
      cur.type === "TSNonNullExpression" ||
      cur.type === "ChainExpression")
  ) {
    cur = cur.expression;
  }
  return cur;
}

function isAnyTypeNode(typeNode) {
  let cur = typeNode;
  while (cur !== null && cur !== undefined && cur.type === "TSParenthesizedType") {
    cur = cur.typeAnnotation;
  }
  return Boolean(cur !== null && cur !== undefined && cur.type === "TSAnyKeyword");
}

function isEmptyOrFalsyReturnArg(argNode) {
  if (argNode === null || argNode === undefined) {
    return true;
  }
  const a = unwrapExpr(argNode);
  if (a === null || a === undefined || typeof a !== "object") {
    return false;
  }
  if (a.type === "Literal") {
    if (a.regex) {
      return false;
    }
    return a.value === null || a.value === false || a.value === "";
  }
  if (a.type === "TemplateLiteral") {
    return (
      Array.isArray(a.expressions) &&
      a.expressions.length === 0 &&
      Array.isArray(a.quasis) &&
      a.quasis.length === 1 &&
      a.quasis[0] &&
      a.quasis[0].value &&
      a.quasis[0].value.raw === ""
    );
  }
  if (a.type === "Identifier") {
    return a.name === "undefined";
  }
  if (a.type === "ArrayExpression") {
    return Array.isArray(a.elements) && a.elements.length === 0;
  }
  if (a.type === "ObjectExpression") {
    return Array.isArray(a.properties) && a.properties.length === 0;
  }
  return false;
}

function extractDomainIdentName(node) {
  let cur = unwrapExpr(node);
  while (cur !== null && cur !== undefined && typeof cur === "object") {
    if (cur.type === "Identifier" && typeof cur.name === "string") {
      return cur.name;
    }
    if (cur.type === "MemberExpression") {
      if (!cur.computed && cur.property && cur.property.type === "Identifier" && typeof cur.property.name === "string") {
        return cur.property.name;
      }
      if (cur.computed && cur.property && cur.property.type === "Literal" && typeof cur.property.value === "string") {
        return cur.property.value;
      }
      cur = unwrapExpr(cur.object);
      continue;
    }
    break;
  }
  return "";
}

const DOMAIN_WORD_RE = /(?:quota|cost|price|amount|balance|credit|points|limit)/i;

function analyzeWithVite(parseSync, rel, src, wantedLines) {
  const starts = buildLineStarts(src);
  let parseOpts = undefined;
  if (/\.cjs$/i.test(rel)) {
    parseOpts = { lang: "jsx", sourceType: "commonjs" };
  } else if (/\.(?:js|mjs)$/i.test(rel)) {
    parseOpts = { lang: "jsx" };
  }
  const parsed = parseSync(rel, src, parseOpts);
  if (parsed.errors && parsed.errors.length > 0) {
    const err = parsed.errors[0];
    const lblOffset =
      err.labels && err.labels.length > 0 && typeof err.labels[0].start === "number"
        ? err.labels[0].start
        : 0;
    return {
      syntax_error: {
        line: lineAtOffset(starts, lblOffset),
        message: String(err.message || "Syntax error"),
      },
    };
  }

  const lineFilter = Array.isArray(wantedLines) ? new Set(wantedLines) : null;
  const commentsByLine = {};
  const addComment = (ln, body, isMultiline) => {
    if (lineFilter !== null && !lineFilter.has(ln)) {
      return;
    }
    const key = String(ln);
    if (!Object.prototype.hasOwnProperty.call(commentsByLine, key)) {
      commentsByLine[key] = [];
    }
    commentsByLine[key].push([body, isMultiline]);
  };

  const hb = parsed.program && parsed.program.hashbang ? parsed.program.hashbang : null;
  for (const c of parsed.comments || []) {
    const isHashbang = hb !== null && c.start === hb.start && c.end === hb.end;
    if (!isHashbang) {
      if (c.type === "Line") {
        const startLine = lineAtOffset(starts, c.start);
        const body = String(c.value || "").replace(/^\/+/, "").trim();
        addComment(startLine, body, false);
      } else {
        const rawVal = String(c.value || "");
        const segs = splitCommentLinesWithOffsets(rawVal);
        if (segs.length === 1) {
          const startLine = lineAtOffset(starts, c.start);
          const body = segs[0].text.trim().replace(/^\*+\s*/, "").trim();
          addComment(startLine, body, false);
        } else {
          for (const seg of segs) {
            const segLn = lineAtOffset(starts, c.start + 2 + seg.offset);
            const partClean = seg.text.trim().replace(/^\*+\s*/, "").trim();
            addComment(segLn, partClean, true);
          }
        }
      }
    }
  }

  const asAnySet = new Set();
  const earlyFalsySet = new Set();
  const silentCatchSet = new Set();
  const domainZeroSet = new Set();

  const markLine = (targetSet, ln) => {
    if (lineFilter === null || lineFilter.has(ln)) {
      targetSet.add(ln);
    }
  };

  const markRange = (targetSet, fromOffset, toOffset) => {
    const startLn = lineAtOffset(starts, fromOffset);
    const endLn = lineAtOffset(starts, Math.max(fromOffset, toOffset));
    for (let ln = startLn; ln <= endLn; ln += 1) {
      markLine(targetSet, ln);
    }
  };

  const stack = [parsed.program];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === null || cur === undefined || typeof cur !== "object") {
      continue;
    }
    if (Array.isArray(cur)) {
      for (let idx = cur.length - 1; idx >= 0; idx -= 1) {
        stack.push(cur[idx]);
      }
      continue;
    }

    if (cur.type === "TSAsExpression" && isAnyTypeNode(cur.typeAnnotation)) {
      const fromOff = cur.expression && typeof cur.expression.end === "number" ? cur.expression.end : cur.start;
      markRange(asAnySet, fromOff, cur.typeAnnotation.end);
    } else if (cur.type === "TSTypeAssertion" && isAnyTypeNode(cur.typeAnnotation)) {
      markRange(asAnySet, cur.start, cur.typeAnnotation.end + 1);
    } else if (cur.type === "IfStatement" && (cur.alternate === null || cur.alternate === undefined)) {
      const test = unwrapExpr(cur.test);
      const isUnaryNot = test !== null && test !== undefined && test.type === "UnaryExpression" && test.operator === "!";
      const arg = isUnaryNot ? unwrapExpr(test.argument) : null;
      const validTarget =
        arg !== null &&
        arg !== undefined &&
        (arg.type === "Identifier" || arg.type === "MemberExpression" || arg.type === "ChainExpression");
      if (validTarget) {
        let ret = null;
        if (cur.consequent && cur.consequent.type === "ReturnStatement") {
          ret = cur.consequent;
        } else if (
          cur.consequent &&
          cur.consequent.type === "BlockStatement" &&
          Array.isArray(cur.consequent.body) &&
          cur.consequent.body.length === 1 &&
          cur.consequent.body[0] &&
          cur.consequent.body[0].type === "ReturnStatement"
        ) {
          ret = cur.consequent.body[0];
        }
        if (
          ret !== null &&
          lineAtOffset(starts, cur.start) === lineAtOffset(starts, ret.start) &&
          isEmptyOrFalsyReturnArg(ret.argument)
        ) {
          markLine(earlyFalsySet, lineAtOffset(starts, cur.start));
        }
      }
    } else if (
      cur.type === "CatchClause" &&
      cur.body &&
      cur.body.type === "BlockStatement" &&
      Array.isArray(cur.body.body) &&
      cur.body.body.length === 0
    ) {
      markRange(silentCatchSet, cur.start, cur.body.end);
    } else if (cur.type === "LogicalExpression" && (cur.operator === "??" || cur.operator === "||")) {
      const right = unwrapExpr(cur.right);
      const isZero =
        right !== null &&
        right !== undefined &&
        right.type === "Literal" &&
        !right.regex &&
        typeof right.value === "number" &&
        right.value === 0;
      if (isZero && DOMAIN_WORD_RE.test(extractDomainIdentName(cur.left))) {
        markRange(domainZeroSet, cur.left.start, cur.right.end);
      }
    }

    for (const val of Object.values(cur)) {
      if (val !== null && typeof val === "object") {
        stack.push(val);
      }
    }
  }

  return {
    comments_by_line: commentsByLine,
    as_any_lines: Array.from(asAnySet).sort((a, b) => a - b),
    early_falsy_lines: Array.from(earlyFalsySet).sort((a, b) => a - b),
    silent_catch_lines: Array.from(silentCatchSet).sort((a, b) => a - b),
    domain_zero_lines: Array.from(domainZeroSet).sort((a, b) => a - b),
  };
}

function analyzeWithTypeScript(ts, rel, src, wantedLines) {
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true);
  const starts = buildLineStarts(src);
  const lineFilter = Array.isArray(wantedLines) ? new Set(wantedLines) : null;
  const commentsByLine = {};
  const addComment = (ln, body, isMultiline) => {
    if (lineFilter !== null && !lineFilter.has(ln)) return;
    const key = String(ln);
    if (!Object.prototype.hasOwnProperty.call(commentsByLine, key)) {
      commentsByLine[key] = [];
    }
    commentsByLine[key].push([body, isMultiline]);
  };

  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, src);
  let tok = scanner.scan();
  while (tok !== ts.SyntaxKind.EndOfFileToken) {
    if (tok === ts.SyntaxKind.SingleLineCommentTrivia) {
      const startOff = scanner.getTokenPos();
      const body = scanner.getTokenText().replace(/^\/+/, "").trim();
      const ln = lineAtOffset(starts, startOff);
      if (!(ln === 1 && body.startsWith("!"))) {
        addComment(ln, body, false);
      }
    } else if (tok === ts.SyntaxKind.MultiLineCommentTrivia) {
      const startOff = scanner.getTokenPos();
      const raw = scanner.getTokenText().slice(2, -2);
      const segs = splitCommentLinesWithOffsets(raw);
      if (segs.length === 1) {
        addComment(lineAtOffset(starts, startOff), segs[0].text.trim().replace(/^\*+\s*/, "").trim(), false);
      } else {
        for (const seg of segs) {
          addComment(lineAtOffset(starts, startOff + 2 + seg.offset), seg.text.trim().replace(/^\*+\s*/, "").trim(), true);
        }
      }
    }
    tok = scanner.scan();
  }

  const asAnySet = new Set();
  const earlyFalsySet = new Set();
  const silentCatchSet = new Set();
  const domainZeroSet = new Set();
  const markRange = (targetSet, sOff, eOff) => {
    const sLn = lineAtOffset(starts, sOff);
    const eLn = lineAtOffset(starts, Math.max(sOff, eOff));
    for (let ln = sLn; ln <= eLn; ln += 1) {
      if (lineFilter === null || lineFilter.has(ln)) targetSet.add(ln);
    }
  };
  const unwrapTs = (n) => {
    let cur = n;
    while (cur && (ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur) || ts.isTypeAssertionExpression(cur) || ts.isNonNullExpression(cur))) {
      cur = cur.expression;
    }
    return cur;
  };
  const visit = (node) => {
    if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && node.type && node.type.kind === ts.SyntaxKind.AnyKeyword) {
      markRange(asAnySet, node.type.getStart(sf), node.type.getEnd());
    } else if (ts.isCatchClause(node) && node.block && node.block.statements.length === 0) {
      markRange(silentCatchSet, node.getStart(sf), node.block.getEnd());
    } else if (ts.isIfStatement(node) && !node.elseStatement) {
      const cond = unwrapTs(node.expression);
      if (cond && ts.isPrefixUnaryExpression(cond) && cond.operator === ts.SyntaxKind.ExclamationToken) {
        let ret = null;
        if (ts.isReturnStatement(node.thenStatement)) ret = node.thenStatement;
        else if (ts.isBlock(node.thenStatement) && node.thenStatement.statements.length === 1 && ts.isReturnStatement(node.thenStatement.statements[0])) {
          ret = node.thenStatement.statements[0];
        }
        if (ret && lineAtOffset(starts, node.getStart(sf)) === lineAtOffset(starts, ret.getStart(sf))) {
          const arg = ret.expression ? unwrapTs(ret.expression) : null;
          const empty = !arg || arg.kind === ts.SyntaxKind.NullKeyword || arg.kind === ts.SyntaxKind.FalseKeyword || (ts.isIdentifier(arg) && arg.text === "undefined") || (ts.isStringLiteral(arg) && arg.text === "") || (ts.isArrayLiteralExpression(arg) && arg.elements.length === 0) || (ts.isObjectLiteralExpression(arg) && arg.properties.length === 0);
          if (empty) markRange(earlyFalsySet, node.getStart(sf), node.getStart(sf));
        }
      }
    } else if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || node.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      const right = unwrapTs(node.right);
      if (right && ts.isNumericLiteral(right) && Number(right.text) === 0 && DOMAIN_WORD_RE.test(node.left.getText(sf))) {
        markRange(domainZeroSet, node.left.getStart(sf), node.right.getEnd());
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return {
    comments_by_line: commentsByLine,
    as_any_lines: Array.from(asAnySet).sort((a, b) => a - b),
    early_falsy_lines: Array.from(earlyFalsySet).sort((a, b) => a - b),
    silent_catch_lines: Array.from(silentCatchSet).sort((a, b) => a - b),
    domain_zero_lines: Array.from(domainZeroSet).sort((a, b) => a - b),
  };
}

const rawInput = fs.readFileSync(0, "utf8");
const payload = JSON.parse(rawInput || "{}");
const engine = loadParseSync(payload.repo_root || "");
if (!engine) {
  process.stdout.write(JSON.stringify({ __parser_unavailable__: true }));
  process.exit(0);
}
const out = {};
for (const item of payload.files || []) {
  out[item.rel] =
    engine.kind === "vite"
      ? analyzeWithVite(engine.parseSync, item.rel, String(item.source || ""), item.lines || null)
      : analyzeWithTypeScript(engine.ts, item.rel, String(item.source || ""), item.lines || null);
}
process.stdout.write(JSON.stringify(out));
