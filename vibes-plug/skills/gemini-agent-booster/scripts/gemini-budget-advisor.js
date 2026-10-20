#!/usr/bin/env node
/**
 * skills/gemini-agent-booster/scripts/gemini-budget-advisor.js
 * Gemini 4.x & Frontier Model Budget & Context Caching Advisor (2026 Edition)
 * Fast, zero-dependency analyzer for repository token footprint, task-entropy evaluation,
 * dynamic thinking budget allocation, and native context caching threshold detection.
 *
 * Author: Roedy Rustam
 * Part of: vibes-plug / gemini-agent-booster
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// CLI Arguments Parser
const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');
const isJson = args.includes('--json');
const isVerbose = args.includes('--verbose');
const isDiff = args.includes('--diff');

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  const prefix = `${flag}=`;
  const match = args.find(a => a.startsWith(prefix));
  if (match) {
    return match.substring(prefix.length);
  }
  return null;
}

const valueFlags = new Set(['--task', '--path', '-p', '-t']);
const positionalArgs = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (valueFlags.has(arg)) {
    i++; // Skip the value of this flag
  } else if (!arg.startsWith('-')) {
    positionalArgs.push(arg);
  }
}

const taskArg = getArgValue('--task') || '';
const pathArg = getArgValue('--path') || positionalArgs[0] || '.';
const targetDir = path.resolve(process.cwd(), pathArg);

if (isHelp) {
  console.log(`
Gemini Budget & Context Caching Advisor (gemini-agent-booster)
Usage:
  node gemini-budget-advisor.js [options] [path]

Options:
  --path <dir>     Target repository or directory to scan (default: current directory)
  --task "<text>"  Describe the coding task to evaluate dynamic thinking budget
  --diff           Inspect active git diff to factor uncommitted changes into complexity
  --json           Output results in machine-readable JSON format
  --verbose        Print individual file metrics
  -h, --help       Show this help message

Examples:
  node gemini-budget-advisor.js
  node gemini-budget-advisor.js --task "Refactor multi-tenant database migration and RLS policies"
  node gemini-budget-advisor.js --diff --task "Formal verification of lock-free queue concurrency"
  node gemini-budget-advisor.js --path ./src --json
`);
  process.exit(0);
}

// Ignore Filters
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  '.next',
  '.turbo',
  '.output',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor',
  '.idea',
  '.vscode',
  '.agents',
  'tmp',
  'temp',
  'venv',
  '.venv',
  '__pycache__'
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'composer.lock',
  'Cargo.lock',
  '.DS_Store',
  'Thumbs.db'
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
  '.mp4', '.webm', '.mov', '.avi', '.mp3', '.wav', '.ogg',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.pdf', '.exe', '.dll', '.so', '.dylib', '.wasm',
  '.woff', '.woff2', '.ttf', '.eot', '.otf'
]);

// Helper: Estimate tokens from character count (standard heuristic: ~3.8-4.0 chars/token for code)
function estimateTokens(charCount) {
  return Math.ceil(charCount / 3.85);
}

// Scanner Engine
function scanDirectory(dir, fileList = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return fileList;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scanDirectory(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      if (IGNORED_FILES.has(entry.name)) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;

      try {
        const stats = fs.statSync(fullPath);
        // Exclude files > 2.5MB to avoid runaway minified bundles
        if (stats.size > 2.5 * 1024 * 1024) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        const chars = content.length;
        const tokens = estimateTokens(chars);

        fileList.push({
          path: path.relative(targetDir, fullPath) || entry.name,
          chars,
          tokens,
          bytes: stats.size
        });
      } catch (e) {
        // Skip unreadable files gracefully
      }
    }
  }

  return fileList;
}

// Git Diff Ingestion (Optional)
function getGitDiffText(dir) {
  try {
    const diff = execSync('git diff --stat -p HEAD', { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return diff || '';
  } catch (err) {
    return '';
  }
}

// Task Entropy & Complexity Evaluator
function evaluateComplexity(taskText, diffText, totalTokens) {
  const combinedText = `${taskText} ${diffText}`.toLowerCase();

  const CRITICAL_KEYWORDS = [
    'formal verification', 'smt', 'z3', 'dafny', 'theorem', 'cryptograph',
    'pqc', 'post-quantum', 'zero-day', 'cve', 'exploit', 'kernel',
    'consensus', 'double-spend', 'invariant proof', 'financial clearing'
  ];

  const ARCHITECTURE_KEYWORDS = [
    'architecture', 'refactor', 'migration', 'database schema', 'state machine',
    'race condition', 'distributed', 'concurrency', 'deadlock', 'lock-free',
    'microservice', 'memory leak', 'multi-tenant', 'tenancy', 'rbac', 'abac',
    'zero-to-prod', 'system design', 'event-driven', 'cache invalidation'
  ];

  const STANDARD_DEV_KEYWORDS = [
    'feature', 'endpoint', 'component', 'service', 'crud', 'route', 'api',
    'hook', 'store', 'view', 'form', 'query', 'mutation', 'test', 'spec',
    'workflow', 'integration', 'styling', 'tailwind', 'ui-ux'
  ];

  const QUICK_FIX_KEYWORDS = [
    'fix typo', 'typo', 'formatting', 'lint', 'cleanup', 'comment', 'readme',
    'docs update', 'rename', 'minor tweak', 'bump version'
  ];

  let complexityLevel = 'STANDARD';
  let matchedRule = 'Default standard task threshold';
  let suggestedBudget = 8192;
  let reason = 'Standard software feature implementation or test flow.';

  // Check from highest complexity down
  if (CRITICAL_KEYWORDS.some(k => combinedText.includes(k))) {
    complexityLevel = 'EXTREME_CRITICAL';
    matchedRule = 'Critical system / formal verification / cryptographic security detected';
    suggestedBudget = 65536;
    reason = 'Tasks with high blast radius, formal verification, or cryptography require maximum test-time compute (64k).';
  } else if (ARCHITECTURE_KEYWORDS.some(k => combinedText.includes(k))) {
    complexityLevel = 'ARCHITECTURE_SYSTEM';
    matchedRule = 'Core architectural refactoring or distributed invariant detected';
    suggestedBudget = 32768;
    reason = 'High-order architectural planning, schema migrations, and concurrency debugging benefit from 32k thinking budget.';
  } else if (QUICK_FIX_KEYWORDS.some(k => combinedText.includes(k)) && combinedText.length < 150) {
    complexityLevel = 'QUICK_FIX';
    matchedRule = 'Simple bugfix, typo, or minor linting edit';
    suggestedBudget = 2048;
    reason = 'Low-entropy tasks require minimal reasoning budget (2k) for fastest response latency.';
  } else if (STANDARD_DEV_KEYWORDS.some(k => combinedText.includes(k)) || taskText.trim().length > 0) {
    complexityLevel = 'STANDARD_DEV';
    matchedRule = 'Standard feature development / component flow';
    suggestedBudget = 8192;
    reason = 'Standard development balance between thinking depth and token turnaround (8k).';
  } else {
    // If no task text provided, derive suggestion from repo size
    if (totalTokens > 500000) {
      complexityLevel = 'LARGE_CODEBASE_ANALYSIS';
      matchedRule = 'Massive codebase analysis without specific task scope';
      suggestedBudget = 32768;
      reason = 'Whole-repo synthesis across >500k tokens requires deep cross-file reasoning.';
    } else {
      complexityLevel = 'STANDARD_DEV';
      suggestedBudget = 8192;
      matchedRule = 'Standard codebase exploration';
      reason = 'Default standard thinking budget for daily interactive pair programming.';
    }
  }

  return {
    level: complexityLevel,
    budgetTokens: suggestedBudget,
    matchedRule,
    reason
  };
}

// Caching Evaluator
function evaluateCaching(totalTokens) {
  const CACHE_THRESHOLD = 32768; // Gemini Context Caching activates at 32k tokens
  const shouldCache = totalTokens >= CACHE_THRESHOLD;

  if (shouldCache) {
    const estimatedSavingsPercent = Math.min(90, Math.max(75, Math.round(75 + (totalTokens / 1000000) * 10)));
    return {
      recommended: true,
      threshold: CACHE_THRESHOLD,
      discountEstimate: `${estimatedSavingsPercent}%`,
      recommendedTtl: totalTokens > 200000 ? '7200s' : '3600s',
      rationale: `Repository size (${totalTokens.toLocaleString()} tokens) exceeds the 32k caching threshold. Using cachedContent reduces token costs by ~${estimatedSavingsPercent}% and cuts TTFT by up to 90%.`
    };
  }

  return {
    recommended: false,
    threshold: CACHE_THRESHOLD,
    discountEstimate: 'N/A (Below threshold)',
    recommendedTtl: null,
    rationale: `Repository size (${totalTokens.toLocaleString()} tokens) is within the monolithic zero-shot window (< 32k tokens). Direct ingestion without caching offers optimal simplicity.`
  };
}

// Model Tier Recommendation
function recommendModel(complexity, caching) {
  if (complexity.budgetTokens >= 32768 || caching.recommended) {
    return {
      primary: 'Gemini 4 Pro',
      role: 'Master System Architect & Critical Reasoning',
      reason: 'Deep System-2 reasoning (32k–64k thinking budget) and native context caching (>32k tokens).'
    };
  }

  return {
    primary: 'Gemini 3.8 Flash / Gemini 4 Flash',
    role: 'Agile Interactive Pair Programming & High-Throughput Agentic Loops',
    reason: 'Ultra-low latency (<100ms), agile thinking mode, and optimal token cost efficiency for standard dev loops.'
  };
}

// Execution
const files = scanDirectory(targetDir);
const totalChars = files.reduce((acc, f) => acc + f.chars, 0);
const totalTokens = estimateTokens(totalChars);
const totalBytes = files.reduce((acc, f) => acc + f.bytes, 0);

const diffText = isDiff ? getGitDiffText(targetDir) : '';
const complexity = evaluateComplexity(taskArg, diffText, totalTokens);
const caching = evaluateCaching(totalTokens);
const modelRecommendation = recommendModel(complexity, caching);

// Top 5 largest files
const largestFiles = [...files].sort((a, b) => b.tokens - a.tokens).slice(0, 5);

// Output Construction
const resultPayload = {
  scanTarget: targetDir,
  summary: {
    scannedFiles: files.length,
    totalCharacters: totalChars,
    estimatedTokens: totalTokens,
    totalSizeBytes: totalBytes,
    totalSizeFormatted: `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
  },
  taskComplexity: {
    taskPrompt: taskArg || '(None provided)',
    isGitDiffIncluded: isDiff && diffText.length > 0,
    complexityLevel: complexity.level,
    suggestedThinkingBudget: complexity.budgetTokens,
    matchedRule: complexity.matchedRule,
    reason: complexity.reason
  },
  contextCaching: caching,
  modelRecommendation,
  topFiles: largestFiles.map(f => ({ path: f.path, tokens: f.tokens, bytes: f.bytes }))
};

if (isJson) {
  console.log(JSON.stringify(resultPayload, null, 2));
  process.exit(0);
}

// Formatted Terminal Output (ANSI Colors)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

console.log(`\n${c.bold}${c.cyan}======================================================================${c.reset}`);
console.log(`${c.bold}${c.cyan}   GEMINI AGENT BOOSTER — BUDGET & CONTEXT CACHING ADVISOR (2026)    ${c.reset}`);
console.log(`${c.bold}${c.cyan}======================================================================${c.reset}\n`);

console.log(`${c.bold}📂 Scan Target:${c.reset}  ${targetDir}`);
console.log(`${c.bold}📄 Total Files:${c.reset}  ${files.length.toLocaleString()} readable source files`);
console.log(`${c.bold}💾 Total Size:${c.reset}   ${resultPayload.summary.totalSizeFormatted}`);
console.log(`${c.bold}📊 Est. Tokens:${c.reset} ${c.yellow}${totalTokens.toLocaleString()}${c.reset} tokens (Ring Attention capacity)\n`);

console.log(`${c.bold}${c.magenta}--- [1] TASK COMPLEXITY & THINKING BUDGET ---${c.reset}`);
console.log(`• Task Prompt:      ${taskArg ? `"${taskArg}"` : `${c.dim}(None provided — evaluated from codebase footprint)${c.reset}`}`);
console.log(`• Complexity Tier:  ${c.bold}${complexity.level}${c.reset}`);
console.log(`• Matched Rule:     ${complexity.matchedRule}`);
console.log(`• Suggested Budget: ${c.bold}${c.green}${complexity.budgetTokens.toLocaleString()} tokens${c.reset} (${c.dim}thinkingConfig.thinkingBudget${c.reset})`);
console.log(`• Architectural Why:${c.dim} ${complexity.reason}${c.reset}\n`);

console.log(`${c.bold}${c.blue}--- [2] NATIVE CONTEXT CACHING STRATEGY ---${c.reset}`);
if (caching.recommended) {
  console.log(`• Status:           ${c.bold}${c.green}RECOMMENDED${c.reset} (${totalTokens.toLocaleString()} > ${caching.threshold.toLocaleString()} threshold)`);
  console.log(`• Expected Savings: ${c.bold}${c.green}${caching.discountEstimate} token discount${c.reset} on subsequent turns`);
  console.log(`• Recommended TTL:  ${c.yellow}${caching.recommendedTtl}${c.reset}`);
  console.log(`• Recommendation:   ${caching.rationale}`);
  console.log(`• Code Pattern:
  ${c.dim}const cache = await ai.caches.create({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: fullCodebaseDump }] }],
    ttl: '${caching.recommendedTtl}',
  });${c.reset}`);
} else {
  console.log(`• Status:           ${c.bold}${c.dim}NOT REQUIRED${c.reset} (${totalTokens.toLocaleString()} <= ${caching.threshold.toLocaleString()} threshold)`);
  console.log(`• Recommendation:   ${caching.rationale}`);
}
console.log();

console.log(`${c.bold}${c.green}--- [3] RECOMMENDED MODEL ARCHITECTURE ---${c.reset}`);
console.log(`• Primary Model:    ${c.bold}${c.cyan}${modelRecommendation.primary}${c.reset}`);
console.log(`• Agentic Role:     ${modelRecommendation.role}`);
console.log(`• Selection Why:    ${c.dim}${modelRecommendation.reason}${c.reset}\n`);

if (largestFiles.length > 0) {
  console.log(`${c.bold}--- [4] TOP 5 TOKEN CONSUMERS ---${c.reset}`);
  largestFiles.forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${c.yellow}${file.tokens.toLocaleString().padStart(7)} tokens${c.reset} | ${file.path}`);
  });
  console.log();
}

if (isVerbose) {
  console.log(`${c.bold}--- ALL SCANNED FILES ---${c.reset}`);
  files.forEach(f => {
    console.log(`  • ${f.tokens.toLocaleString().padStart(6)} tkn | ${f.path}`);
  });
  console.log();
}

console.log(`${c.dim}Tip: Run with --task "<description>" to calibrate thinking compute for specific tasks.${c.reset}`);
console.log(`${c.cyan}======================================================================${c.reset}\n`);
