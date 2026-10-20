#!/usr/bin/env python3
"""
Fullstack Architecture Analyzer
Analyzes fullstack project structure, detects anti-patterns, and validates architecture health.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional


class ArchitectureAnalyzer:
    """Analyzes fullstack project architecture for anti-patterns and best practices."""

    # Common fullstack project indicators
    FRONTEND_MARKERS = {
        'package.json', 'next.config.js', 'next.config.ts', 'next.config.mjs',
        'vite.config.ts', 'vite.config.js', 'nuxt.config.ts', 'svelte.config.js',
        'astro.config.mjs',
    }
    BACKEND_MARKERS = {
        'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml',
        'pom.xml', 'build.gradle', 'Gemfile',
    }
    INFRA_MARKERS = {
        'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
        'terraform.tf', 'main.tf', 'pulumi.yaml', 'serverless.yml',
        'k8s/', 'kubernetes/', 'helm/',
    }
    CONFIG_MARKERS = {
        '.env', '.env.example', '.env.local',
        'tsconfig.json', 'eslint.config.js', '.eslintrc.js',
    }

    def __init__(self, target_path: str, verbose: bool = False):
        self.target_path = Path(target_path)
        self.verbose = verbose
        self.results: Dict = {
            'status': 'pending',
            'target': str(self.target_path),
            'stack': {},
            'findings': [],
            'score': 100,
        }

    def run(self) -> Dict:
        """Execute the full architecture analysis."""
        print(f"🏗️  Running Architecture Analyzer...")
        print(f"📁 Target: {self.target_path}")

        try:
            self.validate_target()
            self.detect_stack()
            self.check_project_structure()
            self.check_security_basics()
            self.check_database_patterns()
            self.check_testing_setup()
            self.check_ci_cd()
            self.check_docker_setup()
            self.generate_report()

            self.results['status'] = 'success'
            print("✅ Analysis completed!")
            return self.results

        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)

    def validate_target(self):
        """Validate the target path exists."""
        if not self.target_path.exists():
            raise ValueError(f"Target path does not exist: {self.target_path}")
        if self.verbose:
            print(f"✓ Target validated: {self.target_path}")

    def detect_stack(self):
        """Detect the technology stack used in the project."""
        stack = {'frontend': [], 'backend': [], 'infrastructure': [], 'database': []}

        # Check for frontend frameworks
        if (self.target_path / 'next.config.js').exists() or \
           (self.target_path / 'next.config.ts').exists() or \
           (self.target_path / 'next.config.mjs').exists():
            stack['frontend'].append('Next.js')

        if (self.target_path / 'vite.config.ts').exists() or \
           (self.target_path / 'vite.config.js').exists():
            stack['frontend'].append('Vite')

        if (self.target_path / 'nuxt.config.ts').exists():
            stack['frontend'].append('Nuxt')

        # Check for backend languages
        if (self.target_path / 'go.mod').exists():
            stack['backend'].append('Go')
        if (self.target_path / 'Cargo.toml').exists():
            stack['backend'].append('Rust')
        if (self.target_path / 'pyproject.toml').exists() or \
           (self.target_path / 'requirements.txt').exists():
            stack['backend'].append('Python')

        # Check package.json for more details
        pkg_json = self.target_path / 'package.json'
        if pkg_json.exists():
            try:
                with open(pkg_json) as f:
                    pkg = json.load(f)
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}

                if 'drizzle-orm' in deps:
                    stack['database'].append('Drizzle ORM')
                if 'prisma' in deps or '@prisma/client' in deps:
                    stack['database'].append('Prisma')
                if 'hono' in deps:
                    stack['backend'].append('Hono')
                if 'fastify' in deps:
                    stack['backend'].append('Fastify')
                if 'express' in deps:
                    stack['backend'].append('Express')
            except (json.JSONDecodeError, IOError):
                pass

        # Check for infrastructure
        if (self.target_path / 'Dockerfile').exists():
            stack['infrastructure'].append('Docker')
        if (self.target_path / 'docker-compose.yml').exists() or \
           (self.target_path / 'docker-compose.yaml').exists():
            stack['infrastructure'].append('Docker Compose')
        if (self.target_path / 'main.tf').exists():
            stack['infrastructure'].append('Terraform')

        self.results['stack'] = stack
        if self.verbose:
            print(f"✓ Stack detected: {stack}")

    def check_project_structure(self):
        """Check for proper project structure and organization."""
        # Check for src/ or app/ directory
        has_src = (self.target_path / 'src').is_dir()
        has_app = (self.target_path / 'app').is_dir()
        has_lib = (self.target_path / 'lib').is_dir()

        if not has_src and not has_app:
            self._add_finding('warning', 'Missing organized source directory (src/ or app/)')

        # Check for proper separation of concerns
        if has_src:
            src = self.target_path / 'src'
            subdirs = [d.name for d in src.iterdir() if d.is_dir()]
            expected = {'routes', 'handlers', 'services', 'middleware', 'lib', 'utils', 'db', 'models'}
            found = set(subdirs) & expected
            if len(found) < 2:
                self._add_finding('info', f'Consider organizing src/ with subdirectories: {expected - found}')

    def check_security_basics(self):
        """Check for basic security configurations."""
        # Check for .env in .gitignore
        gitignore = self.target_path / '.gitignore'
        if gitignore.exists():
            content = gitignore.read_text()
            if '.env' not in content:
                self._add_finding('critical', '.env is not in .gitignore — secrets may be committed!')
                self.results['score'] -= 20
        else:
            self._add_finding('warning', 'No .gitignore found')
            self.results['score'] -= 10

        # Check for hardcoded secrets in common config files
        env_file = self.target_path / '.env'
        if env_file.exists():
            self._add_finding('info', '.env file found — ensure it is not committed to version control')

        # Check for .env.example
        env_example = self.target_path / '.env.example'
        if not env_example.exists():
            self._add_finding('warning', 'No .env.example found — document required environment variables')

    def check_database_patterns(self):
        """Check for database best practices."""
        # Check for migration files
        migration_dirs = ['migrations', 'prisma/migrations', 'drizzle', 'alembic']
        has_migrations = any((self.target_path / d).is_dir() for d in migration_dirs)

        if not has_migrations and self.results['stack'].get('database'):
            self._add_finding('warning', 'No database migration directory found — use managed migrations')
            self.results['score'] -= 10

    def check_testing_setup(self):
        """Check for testing configuration."""
        test_configs = [
            'vitest.config.ts', 'vitest.config.js',
            'jest.config.ts', 'jest.config.js',
            'playwright.config.ts', 'pytest.ini', 'conftest.py',
        ]
        has_tests = any((self.target_path / c).exists() for c in test_configs)

        test_dirs = ['__tests__', 'tests', 'test', 'e2e', 'spec']
        has_test_dir = any((self.target_path / d).is_dir() for d in test_dirs)

        if not has_tests and not has_test_dir:
            self._add_finding('warning', 'No testing setup detected — add unit and integration tests')
            self.results['score'] -= 15

    def check_ci_cd(self):
        """Check for CI/CD pipeline configuration."""
        ci_paths = [
            '.github/workflows',
            '.gitlab-ci.yml',
            '.circleci',
            'Jenkinsfile',
            '.drone.yml',
        ]
        has_ci = any(
            (self.target_path / p).exists() or (self.target_path / p).is_dir()
            for p in ci_paths
        )

        if not has_ci:
            self._add_finding('info', 'No CI/CD pipeline detected — consider adding automated checks')

    def check_docker_setup(self):
        """Check Docker configuration best practices."""
        dockerfile = self.target_path / 'Dockerfile'
        if dockerfile.exists():
            content = dockerfile.read_text()
            if 'FROM' in content:
                # Check for multi-stage build
                from_count = content.count('FROM ')
                if from_count < 2:
                    self._add_finding('info', 'Consider using multi-stage Docker builds for smaller images')

                # Check for non-root user
                if 'USER ' not in content and 'useradd' not in content and 'adduser' not in content:
                    self._add_finding('warning', 'Dockerfile runs as root — add a non-root USER')
                    self.results['score'] -= 5

                # Check for HEALTHCHECK
                if 'HEALTHCHECK' not in content:
                    self._add_finding('info', 'Consider adding HEALTHCHECK to Dockerfile')

    def _add_finding(self, severity: str, message: str):
        """Add a finding to the results."""
        self.results['findings'].append({
            'severity': severity,
            'message': message,
        })
        if self.verbose:
            icon = {'critical': '🔴', 'warning': '🟡', 'info': '🔵'}.get(severity, '⚪')
            print(f"  {icon} [{severity.upper()}] {message}")

    def generate_report(self):
        """Generate and display the analysis report."""
        findings = self.results['findings']
        critical = len([f for f in findings if f['severity'] == 'critical'])
        warnings = len([f for f in findings if f['severity'] == 'warning'])
        info = len([f for f in findings if f['severity'] == 'info'])

        score = max(0, self.results['score'])
        self.results['score'] = score

        print(f"\n{'='*60}")
        print("🏗️  ARCHITECTURE ANALYSIS REPORT")
        print(f"{'='*60}")
        print(f"Target:   {self.results['target']}")
        print(f"Score:    {score}/100")
        print(f"Findings: {critical} critical, {warnings} warnings, {info} info")
        print(f"\nStack Detected:")
        for layer, techs in self.results['stack'].items():
            if techs:
                print(f"  {layer}: {', '.join(techs)}")
        print(f"\nFindings:")
        for f in findings:
            icon = {'critical': '🔴', 'warning': '🟡', 'info': '🔵'}.get(f['severity'], '⚪')
            print(f"  {icon} [{f['severity'].upper()}] {f['message']}")
        print(f"{'='*60}\n")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Fullstack Architecture Analyzer — detects anti-patterns and validates best practices"
    )
    parser.add_argument(
        'target',
        help='Target project path to analyze'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
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

    args = parser.parse_args()

    analyzer = ArchitectureAnalyzer(
        args.target,
        verbose=args.verbose
    )

    results = analyzer.run()

    if args.json:
        output = json.dumps(results, indent=2)
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Results written to {args.output}")
        else:
            print(output)


if __name__ == '__main__':
    main()
