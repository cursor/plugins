#!/usr/bin/env python3
"""
API Contract Validator
Validates API contracts (OpenAPI specs) and checks for best practices.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional


class ApiContractValidator:
    """Validates OpenAPI specs and API route files for best practices."""

    def __init__(self, target_path: str, verbose: bool = False):
        self.target_path = Path(target_path)
        self.verbose = verbose
        self.results: Dict = {
            'status': 'pending',
            'target': str(self.target_path),
            'findings': [],
            'api_routes': [],
            'score': 100,
        }

    def run(self) -> Dict:
        """Execute the API contract validation."""
        print(f"📋 Running API Contract Validator...")
        print(f"📁 Target: {self.target_path}")

        try:
            self.validate_target()
            self.scan_api_routes()
            self.check_openapi_spec()
            self.check_validation_schemas()
            self.check_error_handling()
            self.check_authentication()
            self.check_rate_limiting()
            self.generate_report()

            self.results['status'] = 'success'
            print("✅ Validation completed!")
            return self.results

        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)

    def validate_target(self):
        """Validate the target path exists."""
        if not self.target_path.exists():
            raise ValueError(f"Target path does not exist: {self.target_path}")

    def scan_api_routes(self):
        """Scan for API route definitions."""
        api_dirs = [
            'app/api', 'src/routes', 'src/api', 'routes',
            'internal/handler', 'src/handlers',
        ]
        route_files = []

        for api_dir in api_dirs:
            dir_path = self.target_path / api_dir
            if dir_path.is_dir():
                for f in dir_path.rglob('*'):
                    if f.is_file() and f.suffix in {'.ts', '.tsx', '.js', '.py', '.go', '.rs'}:
                        route_files.append(str(f.relative_to(self.target_path)))

        self.results['api_routes'] = route_files
        if self.verbose:
            print(f"✓ Found {len(route_files)} API route files")

        if not route_files:
            self._add_finding('info', 'No API routes found in standard directories')

    def check_openapi_spec(self):
        """Check for OpenAPI specification file."""
        spec_files = ['openapi.yaml', 'openapi.yml', 'openapi.json', 'swagger.yaml', 'swagger.json']
        has_spec = any((self.target_path / f).exists() for f in spec_files)

        # Also check in docs/ or api/ directories
        for subdir in ['docs', 'api', 'spec']:
            if (self.target_path / subdir).is_dir():
                has_spec = has_spec or any(
                    (self.target_path / subdir / f).exists() for f in spec_files
                )

        if not has_spec and self.results['api_routes']:
            self._add_finding('warning', 'No OpenAPI spec found — consider spec-first API design')
            self.results['score'] -= 10

    def check_validation_schemas(self):
        """Check for input validation schemas (Zod, Pydantic, etc.)."""
        validation_patterns = ['zod', 'pydantic', 'joi', 'yup', 'class-validator']
        has_validation = False

        pkg_json = self.target_path / 'package.json'
        if pkg_json.exists():
            try:
                with open(pkg_json) as f:
                    pkg = json.load(f)
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                has_validation = any(v in deps for v in validation_patterns)
            except (json.JSONDecodeError, IOError):
                pass

        # Check Python
        pyproject = self.target_path / 'pyproject.toml'
        if pyproject.exists():
            try:
                content = pyproject.read_text()
                has_validation = has_validation or 'pydantic' in content
            except IOError:
                pass

        if not has_validation and self.results['api_routes']:
            self._add_finding('warning', 'No input validation library detected (Zod, Pydantic, etc.)')
            self.results['score'] -= 15

    def check_error_handling(self):
        """Check for structured error handling patterns."""
        error_files = []
        for pattern in ['**/error*.ts', '**/error*.py', '**/error*.go', '**/error*.rs']:
            error_files.extend(self.target_path.glob(pattern))

        if not error_files and self.results['api_routes']:
            self._add_finding('info', 'No dedicated error handling module found — consider structured error responses (RFC 7807)')

    def check_authentication(self):
        """Check for authentication middleware setup."""
        auth_indicators = ['auth', 'jwt', 'clerk', 'nextauth', 'lucia', 'passport']
        has_auth = False

        pkg_json = self.target_path / 'package.json'
        if pkg_json.exists():
            try:
                with open(pkg_json) as f:
                    pkg = json.load(f)
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                has_auth = any(
                    any(indicator in dep for indicator in auth_indicators)
                    for dep in deps
                )
            except (json.JSONDecodeError, IOError):
                pass

        if not has_auth and self.results['api_routes']:
            self._add_finding('info', 'No authentication library detected — ensure API endpoints are protected')

    def check_rate_limiting(self):
        """Check for rate limiting setup."""
        rate_limit_deps = ['rate-limit', 'ratelimit', 'limiter', 'throttle']
        has_rate_limit = False

        pkg_json = self.target_path / 'package.json'
        if pkg_json.exists():
            try:
                with open(pkg_json) as f:
                    pkg = json.load(f)
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                has_rate_limit = any(
                    any(rl in dep for rl in rate_limit_deps)
                    for dep in deps
                )
            except (json.JSONDecodeError, IOError):
                pass

        if not has_rate_limit and self.results['api_routes']:
            self._add_finding('warning', 'No rate limiting detected — protect API endpoints from abuse')
            self.results['score'] -= 5

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
        """Generate and display the validation report."""
        findings = self.results['findings']
        critical = len([f for f in findings if f['severity'] == 'critical'])
        warnings = len([f for f in findings if f['severity'] == 'warning'])
        info = len([f for f in findings if f['severity'] == 'info'])

        score = max(0, self.results['score'])
        self.results['score'] = score

        print(f"\n{'='*60}")
        print("📋 API CONTRACT VALIDATION REPORT")
        print(f"{'='*60}")
        print(f"Target:     {self.results['target']}")
        print(f"Score:      {score}/100")
        print(f"API Routes: {len(self.results['api_routes'])} files found")
        print(f"Findings:   {critical} critical, {warnings} warnings, {info} info")
        print(f"\nFindings:")
        for f in findings:
            icon = {'critical': '🔴', 'warning': '🟡', 'info': '🔵'}.get(f['severity'], '⚪')
            print(f"  {icon} [{f['severity'].upper()}] {f['message']}")
        print(f"{'='*60}\n")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="API Contract Validator — validates API design best practices"
    )
    parser.add_argument(
        'target',
        help='Target project path to validate'
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

    validator = ApiContractValidator(
        args.target,
        verbose=args.verbose
    )

    results = validator.run()

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
