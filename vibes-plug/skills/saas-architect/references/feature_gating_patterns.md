# Feature Gating & Usage Limits Patterns

Standard patterns for restricting access to features and enforcing quotas based on plan configurations.

---

## 1. Feature Map Definitions

Define a clear schema mapping plans to features and usage limits.

```typescript
export interface PlanConfig {
  name: string;
  maxMembers: number;
  maxProjects: number;
  features: {
    advancedReporting: boolean;
    apiAccess: boolean;
    customDomain: boolean;
  };
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    name: 'Free',
    maxMembers: 1,
    maxProjects: 3,
    features: {
      advancedReporting: false,
      apiAccess: false,
      customDomain: false
    }
  },
  pro: {
    name: 'Professional',
    maxMembers: 10,
    maxProjects: 50,
    features: {
      advancedReporting: true,
      apiAccess: true,
      customDomain: false
    }
  },
  enterprise: {
    name: 'Enterprise',
    maxMembers: 100,
    maxProjects: 999999,
    features: {
      advancedReporting: true,
      apiAccess: true,
      customDomain: true
    }
  }
};
```

---

## 2. Server-side Gate Keepers (Next.js Actions / Routes)

Implement standard assertions in your data access layer.

```typescript
import { getWorkspaceSubscription } from './billing';
import { PLAN_CONFIGS } from './plan-configs';
import { db } from './db';
import { projects } from './db/schema';
import { count, eq } from 'drizzle-orm';

// Feature gate assertion
export async function assertHasFeature(workspaceId: string, feature: keyof PlanConfig['features']) {
  const { plan, isActive } = await getWorkspaceSubscription(workspaceId);
  const activePlan = isActive ? plan : 'free';
  
  const hasFeature = PLAN_CONFIGS[activePlan]?.features[feature];
  if (!hasFeature) {
    throw new Error(`Your plan (${activePlan}) does not support the feature: ${feature}`);
  }
}

// Usage limits assertion
export async function assertWithinProjectLimit(workspaceId: string) {
  const { plan, isActive } = await getWorkspaceSubscription(workspaceId);
  const activePlan = isActive ? plan : 'free';
  
  const limit = PLAN_CONFIGS[activePlan].maxProjects;
  
  const [projectCount] = await db
    .select({ val: count() })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  if (projectCount.val >= limit) {
    throw new Error(`Project limit reached (${projectCount.val}/${limit}). Please upgrade your plan.`);
  }
}
```

---

## 3. UI Graceful Degradation / Upgrade Banner

Wrap component gates clean in React to encourage high conversion paths.

```tsx
import React from 'react';
import { Button } from '@/components/ui/button';

interface UpgradeGuardProps {
  hasFeature: boolean;
  featureName: string;
  children: React.ReactNode;
}

export function UpgradeGuard({ hasFeature, featureName, children }: UpgradeGuardProps) {
  if (hasFeature) {
    return <>{children}</>;
  }

  return (
    <div className="relative border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50/50">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-lg" />
      <div className="relative z-10 max-w-sm mx-auto">
        <h3 className="text-lg font-semibold text-gray-900">Unlock {featureName}</h3>
        <p className="mt-2 text-sm text-gray-500">
          This feature is available on our Professional and Enterprise plans. Upgrade today to scale.
        </p>
        <div className="mt-4">
          <Button href="/settings/billing" variant="default">
            View Pricing Plans
          </Button>
        </div>
      </div>
    </div>
  );
}
```
