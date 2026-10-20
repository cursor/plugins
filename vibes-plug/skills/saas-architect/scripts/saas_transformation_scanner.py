#!/usr/bin/env python3
"""
SaaS Transformation Scanner
Automated scanner that runs a SaaS transformation readiness audit against a target project.
"""

import os
import sys
import json
import argparse
import re
from pathlib import Path
from typing import Dict, List

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


class SaasTransformationScanner:
    """Scans an existing codebase for SaaS transformation readiness across 7 key pillars."""

    PILLAR_WEIGHTS = {
        'tenancy': 0.20,
        'auth': 0.15,
        'billing': 0.20,
        'teams': 0.15,
        'frontend': 0.10,
        'api': 0.10,
        'hardening': 0.10,
    }

    def __init__(self, target_path: str, verbose: bool = False):
        self.target_path = Path(target_path)
        self.verbose = verbose
        self.pillars: Dict[str, Dict] = {}
        self.overall_score = 0

    def run(self) -> Dict:
        """Execute the full SaaS transformation readiness scan."""
        print("🚀 SaaS Transformation Scanner")
        print(f"📁 Target Project: {self.target_path}")
        print("=" * 60)

        if not self.target_path.exists():
            print(f"❌ Target path does not exist: {self.target_path}")
            sys.exit(1)

        # Run audits
        self._audit_tenancy()
        self._audit_auth()
        self._audit_billing()
        self._audit_teams()
        self._audit_frontend()
        self._audit_api()
        self._audit_hardening()

        # Calculate score and report
        self._calculate_overall_score()
        self._generate_report()

        return {
            'target': str(self.target_path),
            'overall_score': self.overall_score,
            'pillars': self.pillars,
        }

    def _init_pillar(self, name: str, display_name: str) -> Dict:
        """Initialize a pillar result structure."""
        pillar = {
            'name': display_name,
            'score': 100,
            'checks': [],
            'critical': 0,
            'warnings': 0,
            'passed': 0,
        }
        self.pillars[name] = pillar
        if self.verbose:
            print(f"\n📋 Pillar: {display_name}")
            print("-" * 40)
        return pillar

    def _check(self, pillar: Dict, name: str, passed: bool, severity: str = 'warning', penalty: int = 15):
        """Record check result and adjust scores."""
        pillar['checks'].append({
            'name': name,
            'passed': passed,
            'severity': severity,
        })
        if passed:
            pillar['passed'] += 1
            if self.verbose:
                print(f"  ✅ {name}")
        else:
            if severity == 'critical':
                pillar['critical'] += 1
                pillar['score'] -= max(penalty, 25)
            else:
                pillar['warnings'] += 1
                pillar['score'] -= penalty
            pillar['score'] = max(0, pillar['score'])
            icon = '🔴' if severity == 'critical' else '🟡'
            if self.verbose:
                print(f"  {icon} {name}")

    def _file_exists(self, *paths: str) -> bool:
        return any((self.target_path / p).exists() for p in paths)

    def _dir_exists(self, *paths: str) -> bool:
        return any((self.target_path / p).is_dir() for p in paths)

    def _grep_project(self, pattern: str, extensions: List[str] = None) -> List[str]:
        matches = []
        exts = extensions or ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.prisma', '.sql', '.yaml', '.yml', '.json']
        for ext in exts:
            for f in self.target_path.rglob(f'*{ext}'):
                if any(x in str(f) for x in ['node_modules', '.next', 'dist', '.git', 'target', '.venv']):
                    continue
                try:
                    content = f.read_text(encoding='utf-8', errors='ignore')
                    if re.search(pattern, content, re.IGNORECASE):
                        matches.append(str(f.relative_to(self.target_path)))
                except (IOError, OSError):
                    continue
        return matches

    def _audit_tenancy(self):
        p = self._init_pillar('tenancy', 'Multi-Tenancy Foundation')
        
        # Check database schema structure
        has_db_schema = self._file_exists('prisma/schema.prisma', 'drizzle.config.ts', 'drizzle.config.js') or self._grep_project(r'pgTable|sqliteTable|mysqlTable|schema\.createTable|Base\.metadata', ['.ts', '.js', '.py'])
        self._check(p, 'Database schema config exists', bool(has_db_schema), severity='critical')

        # Check tenant id usage
        tenant_cols = self._grep_project(r'tenant_id|tenantId|workspace_id|workspaceId|org_id|orgId', ['.prisma', '.ts', '.js', '.py', '.go', '.sql'])
        self._check(p, 'tenant_id/workspace_id column configured in models', len(tenant_cols) > 0, severity='critical')

        # Check RLS
        has_rls = self._grep_project(r'ROW LEVEL SECURITY|ENABLE RLS|enableRowLevelSecurity|createPolicy', ['.sql', '.ts', '.js', '.py'])
        self._check(p, 'PostgreSQL RLS setup or database isolation policies present', len(has_rls) > 0)

        # Check Tenant Middleware
        has_mw = self._grep_project(r'tenantMiddleware|app\.current_tenant_id|tenantContext|workspaceMiddleware', ['.ts', '.js', '.py', '.go'])
        self._check(p, 'Tenant-aware middleware initialized', len(has_mw) > 0)

    def _audit_auth(self):
        p = self._init_pillar('auth', 'Authentication & Authorization')

        # Auth service provider detection
        has_clerk = self._grep_project(r'clerkMiddleware|@clerk/nextjs|@clerk/clerk-sdk-node', ['.ts', '.tsx', '.json'])
        has_nextauth = self._grep_project(r'NextAuth|auth\.js|@auth/core|next-auth', ['.ts', '.js', '.json'])
        has_supabase_auth = self._grep_project(r'supabase\.auth|@supabase/ssr|@supabase/auth-helpers', ['.ts', '.tsx', '.js'])
        has_firebase_auth = self._grep_project(r'firebase/auth|firebase-admin/auth', ['.ts', '.tsx', '.js', '.json'])
        has_custom_jwt = self._grep_project(r'jsonwebtoken|jose|PyJWT', ['.ts', '.js', '.py', '.json'])

        has_auth_provider = bool(has_clerk or has_nextauth or has_supabase_auth or has_firebase_auth or has_custom_jwt)
        self._check(p, 'Production auth provider configured (Clerk/NextAuth/Supabase/Firebase/JWT)', 
                    has_auth_provider, severity='critical')

        # Roles / RBAC
        has_roles = self._grep_project(r'role\s*:\s*["\'](admin|owner|member|viewer)["\']|requireRole|checkPermission|hasPermission|RBAC', ['.ts', '.tsx', '.js', '.py', '.go'])
        self._check(p, 'Role-Based Access Control (RBAC) definitions exist', len(has_roles) > 0)

    def _audit_billing(self):
        p = self._init_pillar('billing', 'Billing & Subscription')

        # Payment Provider dependencies
        has_stripe = self._grep_project(r'stripe|lemonsqueezy|paddle-sdk|doku-payment|midtrans', ['.json', '.ts', '.js', '.py', '.go'])
        self._check(p, 'Payment processor integrated (Stripe/LemonSqueezy/DOKU/Midtrans)', len(has_stripe) > 0, severity='critical')

        # Webhooks
        has_webhook = self._grep_project(r'stripe\.webhooks|constructEvent|webhooks/stripe|doku.*webhook|verifySignature', ['.ts', '.js', '.py', '.go'])
        self._check(p, 'Webhook listener for payment events implemented', len(has_webhook) > 0)

        # Pricing and Plans config
        has_pricing = self._grep_project(r'pricing|plans|subscriptionStatus|tier|PLAN_LIMITS', ['.ts', '.tsx', '.js', '.py'])
        self._check(p, 'Pricing plan definitions present', len(has_pricing) > 0)

    def _audit_teams(self):
        p = self._init_pillar('teams', 'Workspace & Team Management')

        # Member list / Workspace switcher check
        has_switcher = self._grep_project(r'workspaceSwitcher|WorkspaceSelect|switchWorkspace|orgSwitcher', ['.tsx', '.ts', '.js'])
        self._check(p, 'Workspace switching controls found', len(has_switcher) > 0)

        # Invite flow
        has_invites = self._grep_project(r'workspace_invitations|inviteMember|invitationToken|team_members', ['.prisma', '.ts', '.js', '.py', '.sql'])
        self._check(p, 'Team invitation system models or methods exist', len(has_invites) > 0)

    def _audit_frontend(self):
        p = self._init_pillar('frontend', 'SaaS App Shell & Dashboard')

        # Shell and settings pages
        has_billing_ui = self._grep_project(r'/settings/billing|BillingSettings|SubscriptionSettings', ['.tsx', '.ts', '.js'])
        self._check(p, 'Billing/subscription settings page implemented', len(has_billing_ui) > 0)

        has_team_ui = self._grep_project(r'/settings/team|TeamSettings|MembersSettings', ['.tsx', '.ts', '.js'])
        self._check(p, 'Team/member settings page implemented', len(has_team_ui) > 0)

    def _audit_api(self):
        p = self._init_pillar('api', 'API Layer & Feature Gating')

        # Gated flags or plan limits
        has_gating = self._grep_project(r'PLAN_LIMITS|PLAN_CONFIGS|hasFeature|assertHasFeature|useFeatureFlag|checkFeatureGating', ['.ts', '.tsx', '.js', '.py'])
        self._check(p, 'Feature gating / usage limit configuration map defined', len(has_gating) > 0)

        # Usage metering log
        has_metering = self._grep_project(r'usage_records|usageRecords|usageMeter|incrementUsage|trackUsage', ['.prisma', '.ts', '.js', '.py', '.sql'])
        self._check(p, 'Usage metering / metric tracking database model exists', len(has_metering) > 0)

    def _audit_hardening(self):
        p = self._init_pillar('hardening', 'Production Hardening')

        # Basic rate limits
        has_rate_limit = self._grep_project(r'rate.?limit|upstash/ratelimit|limiter|slowDown|governor', ['.ts', '.js', '.py', '.go'])
        self._check(p, 'API Rate Limiting setup configured', len(has_rate_limit) > 0)

        # Env validation
        has_env_spec = self._file_exists('.env.example', '.env.template', '.env.schema')
        self._check(p, 'Environment example schema exists', has_env_spec)

    def _calculate_overall_score(self):
        total = 0
        for pillar_key, weight in self.PILLAR_WEIGHTS.items():
            if pillar_key in self.pillars:
                total += self.pillars[pillar_key]['score'] * weight
        self.overall_score = round(total)

    def _get_grade(self, score: int) -> str:
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        return 'F'

    def _generate_report(self):
        grade = self._get_grade(self.overall_score)
        print(f"\n🎯 Overall SaaS Readiness: {self.overall_score}/100 ({grade})")
        print("-" * 60)
        
        for k, p in self.pillars.items():
            icon = '✅' if p['score'] >= 85 else ('🟡' if p['score'] >= 50 else '🔴')
            print(f"  {icon} {p['name']:<30} {p['score']:>4}/100 (Crit: {p['critical']}, Warn: {p['warnings']})")


def main():
    parser = argparse.ArgumentParser(description="SaaS Transformation Scanner")
    parser.add_argument('target', help='Path of project to audit')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show check details')
    args = parser.parse_args()

    scanner = SaasTransformationScanner(args.target, verbose=args.verbose)
    scanner.run()


if __name__ == '__main__':
    main()
