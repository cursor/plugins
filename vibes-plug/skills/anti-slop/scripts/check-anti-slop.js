#!/usr/bin/env node
/**
 * skills/anti-slop/scripts/check-anti-slop.js
 * Sovereign Anti-AI Slop Validator Engine (2026 Edition)
 * Fast, zero-dependency AST/Regex scanner for catching AI slop, lazy placeholders,
 * obvious narration comments, zombie code, and sycophantic artifacts.
 */

const fs = require('fs');
const path = require('path');

// CLI Arguments
const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const isFix = args.includes('--fix');
const isJson = args.includes('--json');
const isSummary = args.includes('--summary');
const targetPathArg = args.find(a => !a.startsWith('--'));
const rootDir = targetPathArg ? path.resolve(targetPathArg) : process.cwd();

// Patterns Definition
const CODE_ERROR_PATTERNS = [
  {
    id: 'LAZY_TRUNCATION',
    name: 'Lazy Truncation / Ellipsis Placeholder',
    regex: /\/\/\s*(\.\.\.|…)\s*(rest|code|implement|logic|remain|existing|unchanged|here)/i,
    description: 'Never truncate code with ellipses; output complete implementation.'
  },
  {
    id: 'UNFINISHED_TODO',
    name: 'Unfinished AI Stub or TODO',
    regex: /\/\/\s*(TODO|FIXME|HACK|XXX):\s*(implement|add logic|fill in|later|placeholder|write here)/i,
    description: 'Unfinished stubs left by lazy model generations.'
  },
  {
    id: 'NOT_IMPLEMENTED_THROW',
    name: 'Unimplemented Exception Throw',
    regex: /throw\s+new\s+(Error|NotImplementedError|UnsupportedOperationException)\s*\(\s*['"`](Not implemented|TODO|stub|WIP)['"`]\s*\)/i,
    description: 'Code throwing stubbed "Not implemented" exceptions.'
  },
  {
    id: 'MOCK_DATA_LEFTOVER',
    name: 'Mock Data Leftover in Production',
    regex: /\/\/\s*(mock data for now|dummy data|placeholder for real api)/i,
    description: 'Hardcoded fake data comment instead of real database/API queries.'
  },
  {
    id: 'SILENT_ERROR_SUPPRESSION',
    name: 'Silent Catch Block (Swallowed Error)',
    regex: /catch\s*(\([a-zA-Z0-9_]*\))?\s*\{\s*(\/\/[^\n]*)?\s*\}/,
    description: 'Empty catch block that silently suppresses errors without handling or logging.'
  },
  {
    id: 'PYTHON_PASS_STUB',
    name: 'Python Pass / Ellipsis Stub',
    regex: /^\s*(def|class)\s+[a-zA-Z0-9_]+.*:\s*(#\s*TODO.*)?\n\s*(pass|\.\.\.)\s*$/m,
    description: 'Unfinished Python function or class stubbed with pass/...'
  },
  {
    id: 'UI_LOREM_IPSUM',
    name: 'Lorem Ipsum Placeholder in Code',
    regex: /(Lorem\s+ipsum\s+dolor\s+sit\s+amet|consectetur\s+adipiscing\s+elit)/i,
    description: 'Never use Lorem Ipsum text in production code; use domain-authentic mock content.'
  }
];

const CODE_WARN_PATTERNS = [
  {
    id: 'DECORATIVE_SEPARATOR_BANNER',
    name: 'Decorative Banner / Separator Box Comment (R-31)',
    regex: /\/\/\s*([=*-]{5,}|#\s*={5,})/i,
    description: 'Decorative box-drawing and separator banners signal AI-generated code. Use clean single-line comments or code structure.'
  },
  {
    id: 'AI_MARKETING_BUZZWORDS',
    name: 'AI Copywriting Buzzwords (R-16)',
    regex: /\b(unlock(ing)?\s+the\s+power|game-changer|delve|testament\s+to|revolutionary\s+new\s+era|seamless(ly)?\s+elevat(e|ing))\b/i,
    description: 'Generic AI marketing buzzwords detected. Replace with direct, plain factual statements.'
  },
  {
    id: 'SYNTAX_NARRATION',
    name: 'Syntax-Narrating Obvious Comment',
    regex: /\/\/\s*(increment\s+\w+|return\s+(the\s+)?\w+|import\s+\w+\s+from|set\s+\w+\s+to\s+\w+|initialize\s+\w+|define\s+\w+|call\s+\w+)/i,
    description: 'Comments narrating obvious code mechanics rather than explaining business/architectural rationale.'
  },
  {
    id: 'CONSOLE_LOG_DEBRIS',
    name: 'Console Debugging Debris',
    regex: /(?<!\/\/\s*)console\.(log|debug|warn)\s*\(/,
    description: 'Unstructured console.log call left in production code (use structured logger like Pino).'
  },
  {
    id: 'FOCUS_OUTLINE_STRIPPED',
    name: 'Stripped Focus Outline Without Ring Replacement',
    regex: /focus:outline-none(?!\s.*focus-visible:ring)/,
    description: 'Stripping focus outline without focus-visible replacement breaks accessibility (WCAG 2.2).'
  },
  {
    id: 'UI_GENERIC_GRADIENT',
    name: 'Generic AI Blue-Purple/Neon Gradient',
    regex: /(bg-gradient-to-[trbl]+\s+from-(blue|indigo|cyan)-[456]00\s+(via-[a-z]+-[456]00\s+)?to-(purple|pink|violet)-[456]00)/i,
    description: 'Generic AI blue-purple gradient detected. Pull palette from DESIGN.md (antislop-ui).'
  },
  {
    id: 'UI_DECORATIVE_EMOJI',
    name: 'Decorative Emoji in UI Component',
    regex: /<(h[1-6]|button|span|p)[^>]*>[^<]*[🚀✨🔥🎉💡][^<]*<\/(h[1-6]|button|span|p)>/u,
    description: 'Decorative emojis in headings or buttons scream AI slop. Remove or replace with real icons (antislop-ui).'
  },
  {
    id: 'UI_NEON_GLOW_ORB',
    name: 'Generic AI Blurred Neon Radial Orb',
    regex: /(bg-(purple|blue|cyan|fuchsia|violet|indigo)-[456]00\/[0-9]+\s+rounded-full\s+blur-[23]xl|blur-[23]xl\s+bg-(purple|blue|cyan|fuchsia|violet|indigo)-[456]00)/i,
    description: 'Blurred neon radial orb detected. AI slop hero backdrop; use purposeful lighting or clean solid surfaces (antislop-ui).'
  },
  {
    id: 'UI_PILL_ADDICTION',
    name: 'Pill Button Gradient Slop',
    regex: /<button[^>]*className="[^"]*\brounded-full\b[^"]*(bg-gradient|from-)[^"]*"/i,
    description: 'Pill button with gradient detected. Use structured 3-tier radius scale (6px/8px/12px) without generic gradient (antislop-ui).'
  },
  {
    id: 'UI_FAKE_PING_DOT',
    name: 'Decorative Pulsing Status Ping',
    regex: /<span[^>]*className="[^"]*\banimate-ping\b[^"]*"\s*(?:\/>|>[^<]*<\/span>)/i,
    description: 'Decorative pulsing status ping detected. Only use status dots for verified real-time telemetry (antislop-ui).'
  },
  {
    id: 'UI_ZERO_GRAVITY_SHADOW',
    name: 'Zero-Gravity Colored Drop-Shadow',
    regex: /\bshadow-2xl\s+shadow-(purple|indigo|blue|violet)-[456]00/i,
    description: 'Zero-gravity colored drop-shadow detected. Use crisp 1px borders and subtle physical elevation (antislop-ui).'
  },
  {
    id: 'UI_UNSTYLED_CLICKABLE_DIV',
    name: 'Clickable Div Without Keyboard/Button Role',
    regex: /<div[^>]+onClick=(?!.*(role=["']button["']|onKeyDown|tabIndex|aria-))/i,
    description: 'Clickable <div> without keyboard accessibility or button role. Use semantic <button type="button"> (antislop-ui).'
  }
];

const DOC_ERROR_PATTERNS = [
  {
    id: 'CONVERSATIONAL_PREAMBLE',
    name: 'Conversational AI Preamble / Sycophancy',
    regex: /^(Certainly!|I'd be happy to|Sure thing!|Of course!|As requested,|Here is the updated|I hope this helps!|Let me know if you need anything else!)/i,
    description: 'Conversational fluff and sycophantic pleasantries in documentation.'
  },
  {
    id: 'AI_DISCLAIMER_SLOP',
    name: 'Generic AI Disclaimer Slop',
    regex: /^(?!.*(No generic|Forbidden|Dilarang|prohibit|Standard|Avoid|Eliminate|Rule)).*(As an AI language model|As an artificial intelligence|Note: In a real-world scenario|Note: For production, you should consult)/i,
    description: 'Unhelpful generic disclaimer slop.'
  }
];

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'artifacts',
  '.gemini',
  '.turbo',
  'coverage',
  '.cache'
];

const CLI_SCRIPT_DIRS = ['scripts', 'bin', 'cli'];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs'];
const DOC_EXTENSIONS = ['.md', '.mdx', '.txt'];

let totalFilesScanned = 0;
let violations = [];
let fixesApplied = 0;

function isTestFile(filePath) {
  return /(__tests__|__mocks__|\.test\.|\.spec\.|test\/|tests\/)/i.test(filePath);
}

function isCliScript(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return CLI_SCRIPT_DIRS.some(dir => normalized.includes(`/${dir}/`) || normalized.startsWith(`${dir}/`));
}

function scanFile(filePath) {
  totalFilesScanned++;
  const ext = path.extname(filePath).toLowerCase();
  const isCode = CODE_EXTENSIONS.includes(ext);
  const isDoc = DOC_EXTENSIONS.includes(ext);

  if (!isCode && !isDoc) return;
  if (filePath.includes('check-anti-slop') || filePath.includes('anti-slop\\SKILL.md') || filePath.includes('anti-slop/SKILL.md')) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let fileModified = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (isCode) {
      CODE_ERROR_PATTERNS.forEach(pattern => {
        if (pattern.regex.test(line)) {
          violations.push({
            severity: 'ERROR',
            file: filePath,
            line: lineNum,
            ruleId: pattern.id,
            name: pattern.name,
            snippet: trimmed,
            description: pattern.description
          });
        }
      });

      CODE_WARN_PATTERNS.forEach(pattern => {
        if (pattern.id === 'CONSOLE_LOG_DEBRIS' && (isTestFile(filePath) || isCliScript(filePath))) {
          return;
        }

        if (pattern.regex.test(line)) {
          violations.push({
            severity: isStrict ? 'ERROR' : 'WARN',
            file: filePath,
            line: lineNum,
            ruleId: pattern.id,
            name: pattern.name,
            snippet: trimmed,
            description: pattern.description
          });

          if (isFix && pattern.id === 'SYNTAX_NARRATION' && trimmed.startsWith('//')) {
            lines[index] = '';
            fileModified = true;
            fixesApplied++;
          }
        }
      });
    }

    if (isDoc) {
      DOC_ERROR_PATTERNS.forEach(pattern => {
        if (pattern.regex.test(trimmed)) {
          violations.push({
            severity: 'ERROR',
            file: filePath,
            line: lineNum,
            ruleId: pattern.id,
            name: pattern.name,
            snippet: trimmed,
            description: pattern.description
          });
        }
      });
    }
  });

  if (fileModified && isFix) {
    fs.writeFileSync(filePath, lines.filter(l => l !== '').join('\n'), 'utf8');
  }
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

// Execution
if (!isJson) {
  console.log(`\n🛡️  [Vibes-Plug] Sovereign Anti-Slop Validator (2026 Edition)`);
  console.log(`📁 Scanning: ${rootDir}`);
  console.log(`⚙️  Mode: ${isStrict ? 'STRICT (All warnings treated as errors)' : 'STANDARD'}${isFix ? ' | AUTO-FIX ENABLED' : ''}\n`);
}

scanDir(rootDir);

const errors = violations.filter(v => v.severity === 'ERROR');
const warnings = violations.filter(v => v.severity === 'WARN');

if (isJson) {
  console.log(JSON.stringify({
    totalFilesScanned,
    errorCount: errors.length,
    warningCount: warnings.length,
    fixesApplied,
    violations
  }, null, 2));
} else {
  if (violations.length > 0) {
    violations.forEach(v => {
      const colorTag = v.severity === 'ERROR' ? '\x1b[31m[ERROR]\x1b[0m' : '\x1b[33m[WARN]\x1b[0m';
      const relPath = path.relative(rootDir, v.file);
      console.log(`${colorTag} \x1b[1m${relPath}:${v.line}\x1b[0m — \x1b[36m${v.name}\x1b[0m`);
      console.log(`       \x1b[90mSnippet:\x1b[0m ${v.snippet}`);
      console.log(`       \x1b[90mRule:\x1b[0m    ${v.description}\n`);
    });
  }

  console.log(`------------------------------------------------------------`);
  console.log(`📊 Scan Summary:`);
  console.log(`   • Files scanned:   ${totalFilesScanned}`);
  console.log(`   • Slop Errors:     ${errors.length > 0 ? `\x1b[31m${errors.length}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
  console.log(`   • Slop Warnings:   ${warnings.length > 0 ? `\x1b[33m${warnings.length}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
  if (fixesApplied > 0) {
    console.log(`   • Fixes applied:   \x1b[32m${fixesApplied}\x1b[0m`);
  }
  console.log(`------------------------------------------------------------`);

  if (errors.length > 0) {
    console.error(`\x1b[31m❌ Anti-Slop Audit Failed: Purge placeholders, stubs, and slop before proceeding.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✅ Anti-Slop Audit Passed: Clean code, zero AI slop detected.\x1b[0m\n`);
    process.exit(0);
  }
}
