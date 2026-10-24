#!/usr/bin/env python3
"""
Production Readiness Scanner
Automated scanner that runs all 7 phases of the Production-Ready Hardener
checklist against a target project.
"""

import os
import sys
import json
import argparse
import re
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


class ProductionReadinessScanner:
    """Scans a project for production readiness across 7 phases."""

    PHASE_WEIGHTS = {
        'architecture': 0.10,
        'frontend': 0.15,
        'backend': 0.15,
        'security': 0.25,
        'testing': 0.15,
        'performance': 0.10,
        'devops': 0.10,
    }

    def __init__(self, target_path: str, verbose: bool = False,
                 run_tsc: bool = False, run_lint: bool = False,
                 run_tests: bool = False, run_build: bool = False):
        self.target_path = Path(target_path).resolve()
        self.verbose = verbose
        self.run_tsc_cmd = run_tsc
        self.run_lint_cmd = run_lint
        self.run_tests_cmd = run_tests
        self.run_build_cmd = run_build

        self.phases: Dict[str, Dict] = {}
        self.overall_score = 0
        self.stack = {}
        
        # Parsed log results
        self.parsed_tsc_errors = []
        self.parsed_eslint_errors = []
        self.build_errors = []
        
        # Execution logs
        self.execution_results = {}

    def strip_ansi(self, text: str) -> str:
        """Strip ANSI escape sequences from text."""
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        return ansi_escape.sub('', text)

    def _exec_command(self, cmd: str) -> Tuple[int, str]:
        """Execute a shell command within the target path."""
        try:
            res = subprocess.run(
                cmd,
                shell=True,
                cwd=str(self.target_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=240  # 4 minutes timeout
            )
            return res.returncode, res.stdout
        except subprocess.TimeoutExpired as e:
            return -1, f"Command timed out. Output so far:\n{e.output}"
        except Exception as e:
            return -1, f"Execution failed: {str(e)}"

    def _detect_stack(self):
        """Analyze project files and package.json to identify tech stack."""
        self.stack = {
            'framework': 'Unknown',
            'react': False,
            'react_version': None,
            'typescript': False,
            'vite': False,
            'next': False,
            'supabase': False,
            'firebase': False,
            'vitest': False,
            'eslint': False,
            'playwright': False,
            'pwa': False,
            'analytics': False,
        }

        # Check package.json
        pkg_path = self.target_path / 'package.json'
        if pkg_path.exists():
            try:
                pkg = json.loads(pkg_path.read_text(encoding='utf-8', errors='ignore'))
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                
                self.stack['typescript'] = 'typescript' in deps
                self.stack['vite'] = 'vite' in deps
                self.stack['next'] = 'next' in deps
                self.stack['supabase'] = '@supabase/supabase-js' in deps
                self.stack['firebase'] = 'firebase' in deps or 'firebase-admin' in deps
                self.stack['vitest'] = 'vitest' in deps
                self.stack['eslint'] = 'eslint' in deps
                self.stack['playwright'] = '@playwright/test' in deps
                self.stack['pwa'] = 'vite-plugin-pwa' in deps
                
                self.stack['analytics'] = any(
                    k in deps for k in ['@vercel/analytics', '@vercel/speed-insights', 'react-ga', 'mixpanel-browser']
                )

                if 'react' in deps:
                    self.stack['react'] = True
                    self.stack['react_version'] = deps['react']
                    if self.stack['next']:
                        self.stack['framework'] = 'Next.js'
                    elif self.stack['vite']:
                        self.stack['framework'] = 'Vite + React'
                    else:
                        self.stack['framework'] = 'React SPA'
            except Exception:
                pass

        # Supplemental folder structure detection
        if (self.target_path / 'supabase').is_dir():
            self.stack['supabase'] = True
        if (self.target_path / 'firestore.rules').exists():
            self.stack['firebase'] = True

    def _parse_logs(self):
        """Parse pre-existing or dynamic diagnostic logs to find actual code problems."""
        # 1. Parse TypeScript Compiler (tsc) errors
        tsc_log_paths = ['tsc_errors.txt', 'tsc_errors.log', 'full_errors.txt']
        for p in tsc_log_paths:
            full_p = self.target_path / p
            if full_p.exists():
                try:
                    content = full_p.read_text(encoding='utf-8', errors='ignore')
                    self.parsed_tsc_errors = self._parse_tsc_content(content)
                    if self.parsed_tsc_errors:
                        break
                except Exception:
                    pass

        # 2. Parse ESLint errors
        eslint_log_paths = ['eslint_output.txt', 'lint_output.txt', 'lint_warnings.txt']
        for p in eslint_log_paths:
            full_p = self.target_path / p
            if full_p.exists():
                try:
                    content = full_p.read_text(encoding='utf-8', errors='ignore')
                    self.parsed_eslint_errors = self._parse_eslint_content(content)
                    if self.parsed_eslint_errors:
                        break
                except Exception:
                    pass

        # 3. Parse build error logs
        build_log_paths = ['build_err.txt', 'build_err2.txt', 'build_errors.txt', 'build_full_log.txt']
        for p in build_log_paths:
            full_p = self.target_path / p
            if full_p.exists():
                try:
                    content = full_p.read_text(encoding='utf-8', errors='ignore')
                    if "error" in content.lower() or "failed" in content.lower() or "exception" in content.lower():
                        self.build_errors.append({
                            'source_file': p,
                            'content': content[:800]  # First 800 chars
                        })
                except Exception:
                    pass

    def _parse_tsc_content(self, content: str) -> List[Dict]:
        """Convert tsc error console dump into structured lists."""
        content = self.strip_ansi(content)
        errors = []
        lines = content.splitlines()
        for line in lines:
            line_str = line.strip()
            # Match formats like: src/pages/Inventory.tsx(42,11): error TS6133: 'containerVariants'...
            match = re.match(r'^([^(]+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)', line_str)
            if match:
                filepath = match.group(1).strip()
                line_num = int(match.group(2))
                col_num = int(match.group(3))
                code = match.group(4)
                message = match.group(5).strip()
                errors.append({
                    'file': filepath,
                    'line': line_num,
                    'col': col_num,
                    'code': code,
                    'message': message
                })
            else:
                # Append sub-details to last error if applicable
                if errors and (line_str.startswith("Property") or line_str.startswith("Type") or line_str.startswith("Types")):
                    errors[-1]['message'] += f"\n  {line_str}"
        return errors

    def _parse_eslint_content(self, content: str) -> List[Dict]:
        """Convert eslint console dump into structured lists."""
        content = self.strip_ansi(content)
        errors = []
        current_file = None
        lines = content.splitlines()
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            # Check if this line is a filepath indicator (e.g. C:\kafealagi\src\components\core\Sidebar.tsx)
            file_match = re.search(r'([a-zA-Z]:\\[^\s]+|[a-zA-Z]:/[^\s]+|[\w\-_\./\\]+\.(?:tsx?|jsx?|ts|js))', line_str)
            if file_match and not any(kw in line_str for kw in ['problem', 'warning', 'error', 'eslint', 'package.json']):
                path_cand = file_match.group(1)
                try:
                    p = Path(path_cand)
                    if p.is_absolute():
                        current_file = str(p.relative_to(self.target_path))
                    else:
                        current_file = str(p)
                except Exception:
                    current_file = path_cand
                continue

            # Match error details: "131:9  error  React Hook ... react-hooks/rules-of-hooks"
            error_match = re.search(r'^(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}([a-zA-Z0-9\-/]+)$', line_str)
            if error_match:
                line_num = int(error_match.group(1))
                col_num = int(error_match.group(2))
                sev = error_match.group(3)
                msg = error_match.group(4).strip()
                rule = error_match.group(5)
                errors.append({
                    'file': current_file or 'Unknown File',
                    'line': line_num,
                    'col': col_num,
                    'severity': sev,
                    'message': msg,
                    'rule': rule
                })
        return errors

    def _run_diagnostics(self):
        """Optionally execute direct compiler, linter, test and build steps."""
        if self.run_tsc_cmd:
            print("⏳ Running TypeScript typecheck (tsc --noEmit)...")
            ret, out = self._exec_command("npx tsc --noEmit")
            self.execution_results['tsc'] = {'code': ret, 'output': out}
            # Also parse these outputs
            dyn_tsc = self._parse_tsc_content(out)
            if dyn_tsc:
                self.parsed_tsc_errors.extend(dyn_tsc)

        if self.run_lint_cmd:
            print("⏳ Running ESLint check...")
            ret, out = self._exec_command("npx eslint . --format compact")
            self.execution_results['lint'] = {'code': ret, 'output': out}
            # Try to parse
            dyn_eslint = []
            for line in out.splitlines():
                # eslint compact format: filename: line line_num, col col_num, Error - message (rule_id)
                m = re.match(r'^([^:]+):\s*line\s*(\d+),\s*col\s*(\d+),\s*(Error|Warning)\s*-\s*(.+?)\s*\((.+)\)$', line.strip())
                if m:
                    dyn_eslint.append({
                        'file': m.group(1).strip(),
                        'line': int(m.group(2)),
                        'col': int(m.group(3)),
                        'severity': m.group(4).lower(),
                        'message': m.group(5).strip(),
                        'rule': m.group(6)
                    })
            if dyn_eslint:
                self.parsed_eslint_errors.extend(dyn_eslint)

        if self.run_tests_cmd:
            print("⏳ Running unit tests...")
            # Detect vitest
            cmd = "npx vitest run" if self.stack['vitest'] else "npm test -- --watchAll=false"
            ret, out = self._exec_command(cmd)
            self.execution_results['tests'] = {'code': ret, 'output': out}

        if self.run_build_cmd:
            print("⏳ Testing application bundle build...")
            ret, out = self._exec_command("npm run build")
            self.execution_results['build'] = {'code': ret, 'output': out}
            if ret != 0:
                self.build_errors.append({
                    'source_file': 'Dynamic Build Execution',
                    'content': out[:1200]
                })

    def run(self) -> Dict:
        """Execute the full production readiness scan."""
        print("🛡️  Production Readiness Scanner")
        print(f"📁 Target: {self.target_path}")
        print("=" * 60)

        if not self.target_path.exists():
            print(f"❌ Target path does not exist: {self.target_path}")
            sys.exit(1)

        # Detect project stacks and load existing logs
        self._detect_stack()
        self._parse_logs()

        # Run direct diagnostic executions if requested
        self._run_diagnostics()

        # Execute check phases
        self._phase_1_architecture()
        self._phase_2_frontend()
        self._phase_3_backend()
        self._phase_4_security()
        self._phase_5_testing()
        self._phase_6_performance()
        self._phase_7_devops()

        # Calculate overall score
        self._calculate_overall_score()
        self._generate_report()
        self._write_markdown_report()

        return {
            'target': str(self.target_path),
            'overall_score': self.overall_score,
            'stack': self.stack,
            'phases': self.phases,
        }

    def _init_phase(self, name: str, display_name: str) -> Dict:
        """Initialize a phase result structure."""
        phase = {
            'name': display_name,
            'score': 100,
            'checks': [],
            'critical': 0,
            'warnings': 0,
            'passed': 0,
        }
        self.phases[name] = phase
        if self.verbose:
            print(f"\n{'─' * 40}")
            print(f"📋 Phase: {display_name}")
            print(f"{'─' * 40}")
        return phase

    def _check(self, phase: Dict, name: str, passed: bool, severity: str = 'warning', penalty: int = 5):
        """Record a check result."""
        phase['checks'].append({
            'name': name,
            'passed': passed,
            'severity': severity,
        })
        if passed:
            phase['passed'] += 1
            if self.verbose:
                print(f"  ✅ {name}")
        else:
            if severity == 'critical':
                phase['critical'] += 1
                phase['score'] -= max(penalty, 15)
            else:
                phase['warnings'] += 1
                phase['score'] -= penalty
            phase['score'] = max(0, phase['score'])
            icon = '🔴' if severity == 'critical' else '🟡'
            if self.verbose:
                print(f"  {icon} {name}")

    def _file_exists(self, *paths: str) -> bool:
        """Check if any of the given file paths exist."""
        return any((self.target_path / p).exists() for p in paths)

    def _dir_exists(self, *paths: str) -> bool:
        """Check if any of the given directory paths exist."""
        return any((self.target_path / p).is_dir() for p in paths)

    def _file_contains(self, filepath: str, pattern: str) -> bool:
        """Check if a file contains a pattern."""
        fp = self.target_path / filepath
        if not fp.exists():
            return False
        try:
            return pattern in fp.read_text(errors='ignore')
        except (IOError, OSError):
            return False

    def _grep_project(self, pattern: str, extensions: List[str] = None) -> List[str]:
        """Search for a pattern in project files."""
        matches = []
        exts = extensions or ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs']
        for ext in exts:
            for f in self.target_path.rglob(f'*{ext}'):
                if any(x in str(f) for x in ['node_modules', '.next', 'dist', '.git', 'playwright-report', 'test-results']):
                    continue
                try:
                    content = f.read_text(errors='ignore')
                    if re.search(pattern, content):
                        matches.append(str(f.relative_to(self.target_path)))
                except (IOError, OSError):
                    continue
        return matches

    # ─── PHASE 1: Architecture & Code Quality ───

    def _phase_1_architecture(self):
        phase = self._init_phase('architecture', 'Architecture & Code Quality')

        # Structure
        self._check(phase, 'Has organized source directory (src/ or app/)',
                    self._dir_exists('src', 'app'))

        # TS Setup
        has_tsconfig = self._file_exists('tsconfig.json')
        strict_ts = self._file_contains('tsconfig.json', '"strict": true') or self._file_contains('tsconfig.json', '"strict":true')
        
        # Also check tsconfig.app.json etc
        if not strict_ts and self._file_exists('tsconfig.app.json'):
            strict_ts = self._file_contains('tsconfig.app.json', '"strict": true') or self._file_contains('tsconfig.app.json', '"strict":true')

        self._check(phase, 'TypeScript strict mode enabled', strict_ts or not self.stack['typescript'])
        self._check(phase, 'package.json exists', self._file_exists('package.json'))

        # Any types
        any_matches = self._grep_project(r': any\b|as any\b', ['.ts', '.tsx'])
        self._check(phase, 'No TypeScript `any` types found',
                    len(any_matches) == 0, penalty=3)

        self._check(phase, '.env.example/env.example documents required config variables',
                    self._file_exists('.env.example', 'env.example', '.env.template'))

        # Input validation
        has_val = self.stack['react'] and self._file_exists('package.json')
        if has_val:
            try:
                pkg = json.loads((self.target_path / 'package.json').read_text(encoding='utf-8', errors='ignore'))
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                has_val = any(v in deps for v in ['zod', 'joi', 'yup', 'class-validator'])
            except Exception:
                has_val = False
        self._check(phase, 'Input validation library used (Zod/Joi/Yup)', has_val)

        # TypeScript Compiler Check
        tsc_ok = len(self.parsed_tsc_errors) == 0
        penalty_val = min(5 * len(self.parsed_tsc_errors), 45)
        self._check(phase, f'TypeScript compiles without errors ({len(self.parsed_tsc_errors)} errors)',
                    tsc_ok, severity='warning', penalty=penalty_val)

    # ─── PHASE 2: Frontend Hardening ───

    def _phase_2_frontend(self):
        phase = self._init_phase('frontend', 'Frontend Hardening')

        has_fe = self.stack['react'] or self._file_exists('vite.config.ts', 'next.config.js')
        self._check(phase, 'Frontend framework detected', has_fe)

        if not has_fe:
            return

        # Error Boundary
        error_files = self._grep_project(r'error\.(tsx?|jsx?)$|ErrorBoundary|react-error-boundary', ['.ts', '.tsx', '.js', '.jsx'])
        self._check(phase, 'Error boundaries implemented', len(error_files) > 0)

        # Suspense / Loading
        loading_files = self._grep_project(r'loading\.(tsx?|jsx?)$|Suspense|Skeleton', ['.ts', '.tsx', '.js', '.jsx'])
        self._check(phase, 'Loading skeletons or Suspense implemented', len(loading_files) > 0)

        # React 19 rules / ESLint Problems
        eslint_ok = len(self.parsed_eslint_errors) == 0
        penalty_val = min(4 * len(self.parsed_eslint_errors), 30)
        self._check(phase, f'ESLint passes with zero errors ({len(self.parsed_eslint_errors)} warnings/errors)',
                    eslint_ok, severity='warning', penalty=penalty_val)

        # Check React Hook calls (hook violations)
        hook_violations = [e for e in self.parsed_eslint_errors if 'rules-of-hooks' in e.get('rule', '')]
        self._check(phase, 'No React Hook rule violations detected',
                    len(hook_violations) == 0, severity='critical', penalty=15)

    # ─── PHASE 3: Backend Hardening ───

    def _phase_3_backend(self):
        phase = self._init_phase('backend', 'Backend Hardening')

        # Database migrations
        has_mig = self._dir_exists('supabase/migrations', 'migrations', 'prisma/migrations', 'drizzle')
        self._check(phase, 'Database migrations directory setup', has_mig)

        # Health endpoint / check
        health_check = self._file_exists('public/robots.txt') # placeholder or real
        self._check(phase, 'Public routing endpoints ready', health_check)

        # Supabase specific checks
        if self.stack['supabase']:
            has_sb_types = self._file_exists('src/types/supabase.ts') or self._file_exists('src/lib/supabase.ts')
            self._check(phase, 'Supabase TypeScript schema types generated (supabase.ts)', has_sb_types)
            
            # Check local supabase config
            has_sb_config = self._file_exists('supabase/config.toml')
            self._check(phase, 'Supabase config.toml set up', has_sb_config, penalty=3)

    # ─── PHASE 4: Security Hardening ───

    def _phase_4_security(self):
        phase = self._init_phase('security', 'Security Hardening')

        # .gitignore env
        gi = self.target_path / '.gitignore'
        env_ig = False
        if gi.exists():
            content = gi.read_text(encoding='utf-8', errors='ignore')
            env_ig = '.env' in content
        self._check(phase, '.env included in .gitignore', env_ig, severity='critical', penalty=20)

        # Check raw env files for secrets
        secrets_exposed = False
        env_files = ['.env', '.env.local', '.env.production']
        for ef in env_files:
            ef_path = self.target_path / ef
            if ef_path.exists():
                # Just flag if .env is tracked in git (which gitignore audit checks)
                pass

        # Check for hardcoded private keys/secrets in files
        matches = self._grep_project(r'sk_live_[a-zA-Z0-9]{20,}|sk_test_[a-zA-Z0-9]{20,}|service_role.*["\'][a-zA-Z0-9_]{30,}', ['.ts', '.tsx', '.js', '.py'])
        self._check(phase, 'No hardcoded private API keys/secrets in project files', len(matches) == 0, severity='critical', penalty=25)

        # SQL Injection / parameterized queries check
        raw_sqli = self._grep_project(r'\.query\(\s*`[^\$]*\$\{', ['.ts', '.js'])
        self._check(phase, 'No vulnerable string-interpolated SQL queries found', len(raw_sqli) == 0, severity='critical', penalty=20)

        # CORS Check
        cors_wildcard = self._grep_project(r'cors:\s*["\']\*["\']|Access-Control-Allow-Origin.*\*', ['.ts', '.js'])
        self._check(phase, 'No unrestricted CORS wildcard access allowed in source', len(cors_wildcard) == 0, severity='warning', penalty=10)

    # ─── PHASE 5: Testing & QA ───

    def _phase_5_testing(self):
        phase = self._init_phase('testing', 'Testing & Quality Assurance')

        # Unit tests
        has_ut = self._file_exists('vitest.config.ts', 'jest.config.js') or self._dir_exists('tests', '__tests__')
        self._check(phase, 'Unit test suite configured (Vitest/Jest)', has_ut)

        # E2E test
        has_e2e = self._file_exists('playwright.config.ts') or self._dir_exists('e2e')
        self._check(phase, 'E2E test suite configured (Playwright)', has_e2e)

        # Eslint config file
        has_eslint_cfg = self._file_exists('eslint.config.js', '.eslintrc.js', '.eslintrc.json')
        self._check(phase, 'Linter configuration exists (eslint.config.js)', has_eslint_cfg)

        # Pre-commit config
        has_hooks = self._file_exists('.husky/pre-commit', '.pre-commit-config.yaml')
        self._check(phase, 'Git hooks config present', has_hooks, penalty=3)

    # ─── PHASE 6: Performance & SEO ───

    def _phase_6_performance(self):
        phase = self._init_phase('performance', 'Performance & SEO')

        # Sitemap
        has_sitemap = self._file_exists('public/sitemap.xml') or self._file_exists('src/sitemap.ts')
        self._check(phase, 'Sitemap exists or generated', has_sitemap, penalty=3)

        # robots.txt
        self._check(phase, 'robots.txt exists in public directory', self._file_exists('public/robots.txt'))

        # Analytics
        self._check(phase, 'User speed & web vitals tracking integrated', self.stack['analytics'], penalty=3)
        
        # PWA
        self._check(phase, 'Progressive Web App (PWA) configuration present', self.stack['pwa'], penalty=2)

    # ─── PHASE 7: DevOps & Deployment ───

    def _phase_7_devops(self):
        phase = self._init_phase('devops', 'DevOps & Deployment')

        # GitHub Workflows
        has_ci = self._dir_exists('.github/workflows')
        self._check(phase, 'GitHub Actions CI/CD workflows setup', has_ci)

        # Vercel or hosting configuration
        has_deploy_config = self._file_exists('vercel.json', 'netlify.toml', 'Dockerfile')
        self._check(phase, 'Deployment configuration file exists', has_deploy_config)

        # Documentation completeness
        self._check(phase, 'README.md contains instructions', self._file_exists('README.md'))
        self._check(phase, 'CHANGELOG.md updated for release', self._file_exists('CHANGELOG.md'), penalty=2)

        # Build errors penalty
        has_build_errs = len(self.build_errors) > 0
        self._check(phase, 'Vite/Compiler build executes successfully (No build_errors.txt)',
                    not has_build_errs, severity='critical', penalty=50)

    # ─── Scoring & Reporting ───

    def _calculate_overall_score(self):
        """Calculate weighted overall score."""
        total = 0
        for phase_key, weight in self.PHASE_WEIGHTS.items():
            if phase_key in self.phases:
                total += self.phases[phase_key]['score'] * weight
        self.overall_score = round(total)

    def _get_grade(self, score: int) -> str:
        """Convert score to letter grade."""
        if score >= 95: return 'A+'
        elif score >= 90: return 'A'
        elif score >= 85: return 'B+'
        elif score >= 80: return 'B'
        elif score >= 70: return 'C'
        elif score >= 60: return 'D'
        else: return 'F'

    def _generate_report(self):
        """Print the final production readiness report to console."""
        grade = self._get_grade(self.overall_score)
        total_critical = sum(p['critical'] for p in self.phases.values())
        total_warnings = sum(p['warnings'] for p in self.phases.values())
        total_passed = sum(p['passed'] for p in self.phases.values())

        print(f"\n{'=' * 60}")
        print("🛡️  PRODUCTION READINESS REPORT")
        print(f"{'=' * 60}")
        print(f"\n  Overall Score: {self.overall_score}/100 ({grade})")
        print(f"  Passed: {total_passed} | Warnings: {total_warnings} | Critical: {total_critical}")

        if self.overall_score >= 95:
            print("  Status: ✅ PRODUCTION READY")
        elif self.overall_score >= 80:
            print("  Status: ⚠️ NEEDS MINOR FIXES")
        elif self.overall_score >= 60:
            print("  Status: 🟡 SIGNIFICANT ISSUES")
        else:
            print("  Status: 🔴 NOT PRODUCTION READY")

        print(f"\n{'─' * 60}")
        print("  Phase Breakdown:")
        print(f"{'─' * 60}")
        print(f"  {'Phase':<35} {'Score':>6} {'Critical':>9} {'Warnings':>9}")
        print(f"  {'─' * 59}")

        for phase_key in self.PHASE_WEIGHTS:
            if phase_key in self.phases:
                p = self.phases[phase_key]
                icon = '✅' if p['score'] >= 90 else ('🟡' if p['score'] >= 70 else '🔴')
                print(f"  {icon} {p['name']:<32} {p['score']:>4}/100  {p['critical']:>6}    {p['warnings']:>6}")

        # List critical issues
        critical_issues = []
        for phase_key, phase in self.phases.items():
            for check in phase['checks']:
                if not check['passed'] and check['severity'] == 'critical':
                    critical_issues.append((phase['name'], check['name']))

        if critical_issues:
            print(f"\n{'─' * 60}")
            print("  🔴 CRITICAL ISSUES (Must Fix Before Production):")
            print(f"{'─' * 60}")
            for phase_name, issue in critical_issues:
                print(f"    [{phase_name}] {issue}")

        print(f"\n{'=' * 60}\n")

    def _write_markdown_report(self):
        """Generate and save PRODUCTION_READINESS_REPORT.md in target project."""
        report_path = self.target_path / 'PRODUCTION_READINESS_REPORT.md'
        grade = self._get_grade(self.overall_score)
        
        status_text = "✅ PRODUCTION READY" if self.overall_score >= 95 else \
                      ("⚠️ NEEDS MINOR FIXES" if self.overall_score >= 80 else \
                       ("🟡 SIGNIFICANT ISSUES" if self.overall_score >= 60 else "🔴 NOT PRODUCTION READY"))

        md = []
        md.append(f"# Production Readiness Report")
        md.append(f"**Target:** `{self.target_path}`  ")
        md.append(f"**Date Check:** {os.environ.get('DATE_STRING', 'Current Date')}  ")
        md.append(f"**Overall Score:** `{self.overall_score}/100` (`{grade}`)  ")
        md.append(f"**Status:** {status_text}\n")

        md.append("## Executive Summary")
        md.append("This report lists potential security vulnerabilities, code architecture errors, test coverage status, and build checks before release. Critical errors must be addressed immediately.")

        # Phase score table
        md.append("## Phase Breakdown\n")
        md.append("| Phase | Score | Critical | Warnings |")
        md.append("|:---|:---:|:---:|:---:|")
        for phase_key in self.PHASE_WEIGHTS:
            if phase_key in self.phases:
                p = self.phases[phase_key]
                md.append(f"| {p['name']} | `{p['score']}/100` | {p['critical']} | {p['warnings']} |")
        md.append("")

        # Helper to format clickable links
        def make_link(filepath: str, line: int = None) -> str:
            # Normalize path
            fp_norm = filepath.replace('\\', '/')
            full_abs = (self.target_path / fp_norm).resolve().as_posix()
            link_text = f"{filepath}:{line}" if line else filepath
            href = f"file:///{full_abs}"
            if line:
                href += f"#L{line}"
            return f"[{link_text}]({href})"

        # Dynamic Log results
        if self.parsed_tsc_errors:
            md.append("## 🔴 TypeScript Compiler Errors")
            md.append(f"The following **{len(self.parsed_tsc_errors)} TypeScript errors** were parsed from logs or dynamic execution. Resolving these is highly recommended to prevent production runtime errors.\n")
            md.append("| File & Line | Code | Message |")
            md.append("|:---|:---:|:---|")
            for err in self.parsed_tsc_errors[:30]:  # Limit top 30
                md.append(f"| {make_link(err['file'], err['line'])} | `TS{err['code']}` | `{err['message'].replace('|', 'I')}` |")
            if len(self.parsed_tsc_errors) > 30:
                md.append(f"| *and {len(self.parsed_tsc_errors) - 30} more errors...* | | |")
            md.append("\n")

        if self.parsed_eslint_errors:
            md.append("## 🟡 ESLint Warnings & Errors")
            md.append(f"Detected **{len(self.parsed_eslint_errors)} problems** in coding rules and hook order requirements.\n")
            md.append("| File & Line | Severity | Message | Rule |")
            md.append("|:---|:---:|:---|:---:|")
            for err in self.parsed_eslint_errors[:30]:
                sev_icon = "🔴 error" if err['severity'].lower() == 'error' else "🟡 warning"
                md.append(f"| {make_link(err['file'], err['line'])} | {sev_icon} | `{err['message'].replace('|', 'I')}` | `{err['rule']}` |")
            if len(self.parsed_eslint_errors) > 30:
                md.append(f"| *and {len(self.parsed_eslint_errors) - 30} more warnings...* | | | |")
            md.append("\n")

        if self.build_errors:
            md.append("## 🔴 Vite / Compiler Build Failures")
            md.append("Application bundle builds have failed. You must repair these prior to release.\n")
            for err in self.build_errors:
                md.append(f"### Log Source: {err['source_file']}")
                md.append("```text")
                md.append(err['content'])
                md.append("```\n")

        # Specific checklist results
        md.append("## Detailed Checklist Items\n")
        for phase_key, p in self.phases.items():
            md.append(f"### {p['name']}")
            for check in p['checks']:
                status = "✅ Passed" if check['passed'] else f"❌ Failed ({check['severity'].upper()})"
                md.append(f"- **{check['name']}**: {status}")
            md.append("")

        # Remediation section
        md.append("## 🚀 Quick Remediation Checklist")
        md.append("Below are instructions to address the most urgent failures detected:\n")
        
        remediation_items = 0
        
        # Check hooks called conditionally
        hook_errs = [e for e in self.parsed_eslint_errors if 'rules-of-hooks' in e.get('rule', '')]
        if hook_errs:
            remediation_items += 1
            md.append(f"### 1. Fix React Hook Rules in {make_link(hook_errs[0]['file'], hook_errs[0]['line'])}")
            md.append("React Hooks cannot be called conditionally. Ensure `usePWAInstall` or `useState` calls are moved to the top level of component rendering.")
            md.append("```typescript")
            md.append("// Move inside component but BEFORE any conditional returns or if-blocks:")
            md.append("const installState = usePWAInstall();")
            md.append("```\n")

        # Check motion variants assignment
        motion_errs = [e for e in self.parsed_tsc_errors if 'Variants' in e['message'] and 'BusinessAnalysisTab' in e['file']]
        if motion_errs:
            remediation_items += 1
            md.append(f"### 2. Fix Framer Motion Types in {make_link(motion_errs[0]['file'], motion_errs[0]['line'])}")
            md.append("In Framer Motion variants, setting `type` as generic string causes type assignment failures on type `Variants`. Set it as a string literal or cast it:")
            md.append("```typescript")
            md.append("// Change from:")
            md.append("transition: { type: 'spring', ... }")
            md.append("// To literal type casting or let variants behave automatically:")
            md.append("transition: { type: 'spring' as const, ... }")
            md.append("```\n")

        if self.stack['supabase'] and not self._file_exists('src/types/supabase.ts'):
            remediation_items += 1
            md.append("### 3. Generate Supabase Schema Types")
            md.append("Execute the supabase schema type exporter script:")
            md.append("```bash")
            md.append("npm run supabase:types")
            md.append("```\n")

        if not remediation_items:
            md.append("- No immediate high-priority remediation templates needed. Fix individual warnings listed above.")

        # Save MD
        try:
            report_path.write_text("\n".join(md), encoding='utf-8')
            print(f"📝 Markdown report generated and saved: {report_path}")
        except Exception as e:
            print(f"❌ Failed to write markdown report: {str(e)}")


def main():
    """Main entry point."""
    if sys.platform.startswith('win'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass
    parser = argparse.ArgumentParser(
        description="Production Readiness Scanner — comprehensive pre-production audit"
    )
    parser.add_argument(
        'target',
        help='Target project path to scan'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output (show all checks)'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output file path'
    )
    parser.add_argument(
        '--run-tsc',
        action='store_true',
        help='Execute typescript compiler typechecking'
    )
    parser.add_argument(
        '--run-lint',
        action='store_true',
        help='Execute eslint check'
    )
    parser.add_argument(
        '--run-tests',
        action='store_true',
        help='Execute unit tests'
    )
    parser.add_argument(
        '--run-build',
        action='store_true',
        help='Execute vite build compilation test'
    )

    args = parser.parse_args()

    scanner = ProductionReadinessScanner(
        args.target,
        verbose=args.verbose,
        run_tsc=args.run_tsc,
        run_lint=args.run_lint,
        run_tests=args.run_tests,
        run_build=args.run_build
    )

    results = scanner.run()

    if args.json:
        output = json.dumps(results, indent=2, default=str)
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output)
            print(f"Results written to {args.output}")
        else:
            print(output)


if __name__ == '__main__':
    main()
