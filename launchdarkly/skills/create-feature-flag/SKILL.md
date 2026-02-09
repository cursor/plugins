---
name: create-feature-flag
description: Flag lifecycle from creation through rollout, experimentation, and cleanup with LaunchDarkly
---

# Skill: Create and Manage Feature Flags

## Description

This skill covers the end-to-end process of creating, implementing, rolling out, and cleaning up feature flags with LaunchDarkly — from planning the flag in the dashboard to removing it from the codebase after full rollout.

## Prerequisites

- LaunchDarkly account with at least Writer access
- LaunchDarkly SDK integrated in your project (see `setup-launchdarkly` skill)
- Access to the LaunchDarkly dashboard or API
- LaunchDarkly CLI (optional): `npm install -g @launchdarkly/ldcli`

## Steps

### 1. Plan the Feature Flag

Before creating a flag, answer these questions:

| Question | Example Answer |
|----------|---------------|
| What feature are you gating? | New checkout flow |
| Is this flag **temporary** or **permanent**? | Temporary (remove after rollout) |
| What type of flag? | Boolean (on/off) |
| What is the default (off) behavior? | Show the existing checkout |
| Who should see it first? | Internal users, then beta testers |
| What metrics indicate success? | Checkout conversion rate ≥ current baseline |
| When should the flag be removed? | 2 weeks after reaching 100% rollout |
| Who owns this flag? | @checkout-team |

### 2. Create the Flag in the Dashboard

1. Navigate to **Feature Flags** → **Create Flag**.
2. Fill in the details:

| Field | Value |
|-------|-------|
| **Name** | Checkout V2 |
| **Key** | `checkout-v2` |
| **Description** | Gates the new checkout flow with improved UX and express pay |
| **Tags** | `checkout`, `q1-2026`, `temporary` |
| **Flag type** | Boolean |
| **Variations** | `true` (new checkout), `false` (legacy checkout) |
| **Default (off)** | `false` |
| **Client-side availability** | Check if the flag is needed in the frontend |
| **Temporary** | Yes |

3. Click **Save Flag**.

### 3. Create the Flag via CLI or API (Alternative)

Using the LaunchDarkly CLI:

```bash
ldcli flags create \
  --project default \
  --key checkout-v2 \
  --name "Checkout V2" \
  --description "Gates the new checkout flow with improved UX and express pay" \
  --kind boolean \
  --tags checkout,q1-2026,temporary \
  --temporary
```

Using the LaunchDarkly REST API:

```bash
curl -X POST 'https://app.launchdarkly.com/api/v2/flags/default' \
  -H "Authorization: YOUR_API_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "checkout-v2",
    "name": "Checkout V2",
    "description": "Gates the new checkout flow with improved UX and express pay",
    "tags": ["checkout", "q1-2026", "temporary"],
    "variations": [
      { "value": true, "name": "New Checkout", "description": "Show the new checkout flow" },
      { "value": false, "name": "Legacy Checkout", "description": "Show the existing checkout" }
    ],
    "defaults": {
      "onVariation": 0,
      "offVariation": 1
    },
    "temporary": true,
    "clientSideAvailability": {
      "usingMobileKey": false,
      "usingEnvironmentId": true
    }
  }'
```

### 4. Implement the Flag in Code

#### Server-Side (Node.js)

```typescript
import { getLDClient } from "../lib/launchdarkly";
import { buildUserContext } from "../lib/ld-context";

export async function handleCheckout(req: Request, res: Response) {
  const client = await getLDClient();
  const context = buildUserContext(req.user);

  const useNewCheckout = await client.boolVariation("checkout-v2", context, false);

  if (useNewCheckout) {
    return newCheckoutHandler(req, res);
  }
  return legacyCheckoutHandler(req, res);
}
```

#### Client-Side (React)

```tsx
import { useFlags } from "launchdarkly-react-client-sdk";

function CheckoutPage() {
  const { checkoutV2 } = useFlags();

  if (checkoutV2) {
    return <NewCheckout />;
  }
  return <LegacyCheckout />;
}
```

#### With Event Tracking

```typescript
// Track conversion event for experimentation
function onCheckoutComplete(orderId: string, revenue: number) {
  const client = await getLDClient();
  const context = buildUserContext(currentUser);

  client.track("checkout-completed", context, { orderId }, revenue);
}
```

### 5. Set Up Targeting Rules

Configure targeting in the LaunchDarkly dashboard:

#### Rule 1: Internal Users (100%)

```
If user.email ends with "@yourcompany.com"
  Serve: true
```

#### Rule 2: Beta Testers (100%)

```
If user is in segment "beta-testers"
  Serve: true
```

#### Rule 3: Enterprise Customers (100%)

```
If organization.plan = "enterprise"
  Serve: true
```

#### Rule 4: Default Rule — Progressive Rollout

```
Default rule: Percentage rollout
  true: 0% → gradually increase
  false: 100%
  Bucket by: user.key
```

### 6. Execute the Progressive Rollout

Follow this phased plan:

```
Day 1:    Internal users only (targeting rule)         → Monitor for 4 hours
Day 1:    Add beta testers (targeting rule)            → Monitor for 24 hours
Day 2:    Default rule → 5%                            → Monitor for 24 hours
Day 3:    Default rule → 10%                           → Monitor for 24 hours
Day 5:    Default rule → 25%                           → Monitor for 48 hours
Day 7:    Default rule → 50%                           → Monitor for 48 hours
Day 9:    Default rule → 100%                          → Monitor for 1 week
Day 16:   Remove flag from code, archive in dashboard
```

### Monitoring at Each Phase

Check these metrics at each rollout phase:

- **Error rate**: Should not increase beyond baseline + 0.1%
- **Latency** (p50, p95, p99): Should not regress more than 10%
- **Conversion rate**: Should be ≥ baseline
- **Support tickets**: No spike in checkout-related issues
- **Client-side errors**: No new JavaScript exceptions

### Rollback Procedure

If any metric exceeds thresholds:

1. In the LaunchDarkly dashboard, toggle the flag **off** → all users see legacy checkout instantly.
2. Investigate the issue using LaunchDarkly's flag evaluation debugger and your application logs.
3. Fix the issue, deploy, and resume the rollout from the previous safe percentage.

### 7. Create a Multivariate Flag (for Experiments)

For A/B tests or experiments with multiple variations:

```bash
ldcli flags create \
  --project default \
  --key checkout-button-experiment \
  --name "Checkout Button Experiment" \
  --kind multivariate \
  --variations '[
    {"key": "control", "name": "Control", "value": "control"},
    {"key": "green-cta", "name": "Green CTA", "value": "green-cta"},
    {"key": "animated", "name": "Animated", "value": "animated"}
  ]'
```

Implementation:

```typescript
const variant = await client.stringVariation(
  "checkout-button-experiment",
  context,
  "control"
);

switch (variant) {
  case "green-cta":
    return <GreenCheckoutButton onClick={handleCheckout} />;
  case "animated":
    return <AnimatedCheckoutButton onClick={handleCheckout} />;
  default:
    return <DefaultCheckoutButton onClick={handleCheckout} />;
}
```

### 8. Create a JSON Configuration Flag

For complex runtime configuration:

```json
{
  "key": "dashboard-config",
  "name": "Dashboard Configuration",
  "kind": "json",
  "variations": [
    {
      "value": {
        "maxWidgets": 5,
        "refreshInterval": 60,
        "theme": "light",
        "enableExport": false
      },
      "name": "Default Config"
    },
    {
      "value": {
        "maxWidgets": 20,
        "refreshInterval": 15,
        "theme": "dark",
        "enableExport": true
      },
      "name": "Power User Config"
    }
  ]
}
```

```typescript
interface DashboardConfig {
  maxWidgets: number;
  refreshInterval: number;
  theme: "light" | "dark";
  enableExport: boolean;
}

const config = await client.jsonVariation<DashboardConfig>(
  "dashboard-config",
  context,
  { maxWidgets: 5, refreshInterval: 60, theme: "light", enableExport: false }
);
```

### 9. Write Tests for Flagged Code

```typescript
import { createTestClient } from "../test/ld-test-helper";

describe("CheckoutHandler", () => {
  it("routes to new checkout when flag is on", async () => {
    const { client } = await createTestClient({ "checkout-v2": true });
    const context = { kind: "user" as const, key: "user-123" };

    const useNew = await client.boolVariation("checkout-v2", context, false);
    expect(useNew).toBe(true);

    await client.close();
  });

  it("routes to legacy checkout when flag is off", async () => {
    const { client } = await createTestClient({ "checkout-v2": false });
    const context = { kind: "user" as const, key: "user-123" };

    const useNew = await client.boolVariation("checkout-v2", context, false);
    expect(useNew).toBe(false);

    await client.close();
  });

  it("defaults to legacy checkout when client is unavailable", async () => {
    // When the client cannot connect, variation calls return the default value
    const { client } = await createTestClient({});
    const context = { kind: "user" as const, key: "user-123" };

    const useNew = await client.boolVariation("checkout-v2", context, false);
    expect(useNew).toBe(false);

    await client.close();
  });
});
```

### 10. Clean Up After Full Rollout

Once the flag has been at 100% for the agreed-upon period:

#### Step 1: Archive the Flag in LaunchDarkly

```bash
# Archive via CLI
ldcli flags archive --project default --key checkout-v2

# Or via API
curl -X PATCH 'https://app.launchdarkly.com/api/v2/flags/default/checkout-v2' \
  -H "Authorization: YOUR_API_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{ "op": "replace", "path": "/archived", "value": true }]'
```

#### Step 2: Remove the Flag from Code

Before:

```typescript
const useNewCheckout = await client.boolVariation("checkout-v2", context, false);
if (useNewCheckout) {
  return newCheckoutHandler(req, res);
}
return legacyCheckoutHandler(req, res);
```

After:

```typescript
return newCheckoutHandler(req, res);
```

#### Step 3: Remove Dead Code

- Delete `legacyCheckoutHandler` and any associated legacy components.
- Remove imports and test cases that reference the old code path.
- Remove the flag key from any configuration files or constants.

#### Step 4: Verify

```bash
# Search for any remaining references to the flag key
grep -r "checkout-v2" --include="*.ts" --include="*.tsx" --include="*.js"

# Run tests to ensure nothing breaks
npm test
```

## Creating Flags — Quick Reference

| Flag Type | Use Case | Example Key | Cleanup |
|-----------|----------|-------------|---------|
| Boolean (temporary) | Feature rollout | `checkout-v2` | Remove after GA |
| Boolean (permanent) | Kill switch | `payments-kill-switch` | Keep forever |
| String (multivariate) | A/B experiment | `checkout-button-experiment` | Remove after experiment concludes |
| Number | Runtime config | `api-rate-limit` | Keep as operational control |
| JSON | Complex config | `dashboard-config` | Keep as operational control |

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Flag not evaluating as expected | Check targeting rules order — rules are evaluated top-down, first match wins |
| Percentage rollout not sticky | Ensure `bucketBy` is set to a stable attribute (e.g., `key`) |
| Flag changes not taking effect | Check if streaming is enabled; verify the correct environment |
| Cannot find flag in code references | Ensure the LaunchDarkly GitHub integration is configured |
| Experiment results inconclusive | Increase sample size or run longer; check that `track()` calls are firing |
| Flag default value type mismatch | Ensure the default value type matches the flag type |
