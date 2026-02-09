---
name: configure-alerts
description: Issue alerts, metric alerts, uptime monitors, and cron monitors for Sentry
---

# Skill: Configure Sentry Alerts

Configure Sentry alerts to get notified about errors, performance degradations, and uptime issues. This skill covers issue alerts, metric alerts, and uptime monitors.

## Prerequisites

- A Sentry account with a configured project
- Owner or Manager role in the Sentry organization (required to create alerts)
- Notification integrations set up (Slack, PagerDuty, email, etc.)

---

## Issue Alerts

Issue alerts trigger when a new or existing issue matches specific conditions. They are the most common alert type.

### Creating an Issue Alert (UI)

1. Go to **Alerts → Create Alert → Issues**.
2. Select the project.
3. Configure conditions:

| Section | Description | Example |
|---|---|---|
| **When** | The trigger event | "A new issue is created" |
| **If** | Filter conditions | "The issue's level is `error` or `fatal`" |
| **Then** | Actions to perform | "Send a Slack notification to #engineering-alerts" |

### Creating an Issue Alert (API)

```bash
curl -X POST "https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Critical Error Alert",
    "actionMatch": "all",
    "filterMatch": "all",
    "conditions": [
      {
        "id": "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"
      }
    ],
    "filters": [
      {
        "id": "sentry.rules.filters.level.LevelFilter",
        "match": "gte",
        "level": "40"
      }
    ],
    "actions": [
      {
        "id": "sentry.integrations.slack.notify_action.SlackNotifyServiceAction",
        "workspace": "<slack-workspace-id>",
        "channel": "#engineering-alerts",
        "tags": "environment,release,level"
      }
    ],
    "frequency": 30
  }'
```

### Recommended Issue Alert Rules

#### 1. New Critical Errors

- **When:** A new issue is created
- **If:** Level is `error` or `fatal`
- **Then:** Notify Slack channel + assign to on-call

#### 2. Regression Alert

- **When:** A resolved issue changes state from resolved to unresolved (regression)
- **Then:** Notify the issue owner and the team Slack channel

#### 3. High-Volume Error Spike

- **When:** Number of events in an issue exceeds 100 in 1 hour
- **If:** Level is `error` or higher
- **Then:** Page on-call via PagerDuty

#### 4. First Error in New Release

- **When:** A new issue is created
- **If:** The issue's tag `release` matches the latest release
- **Then:** Notify the release channel

---

## Metric Alerts

Metric alerts trigger based on aggregate data over time — error counts, transaction durations, failure rates, crash rates, etc.

### Creating a Metric Alert (UI)

1. Go to **Alerts → Create Alert → Metric**.
2. Choose the metric type:
   - **Number of Errors** — Total error event count.
   - **Users Experiencing Errors** — Unique users hitting errors.
   - **Transaction Duration** — p50, p75, p95, or p99 latency.
   - **Failure Rate** — Percentage of transactions with non-OK status.
   - **Apdex** — Application Performance Index score.
   - **Crash Free Session Rate** — For mobile/desktop apps.

3. Configure thresholds:
   - **Critical:** Immediate action required.
   - **Warning:** Something to watch.
   - **Resolved:** When the metric returns to normal.

### Creating a Metric Alert (API)

```bash
curl -X POST "https://sentry.io/api/0/organizations/${SENTRY_ORG}/alert-rules/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High P95 Latency — API",
    "dataset": "transactions",
    "query": "transaction:/api/*",
    "aggregate": "p95(transaction.duration)",
    "timeWindow": 5,
    "thresholdType": 0,
    "triggers": [
      {
        "label": "critical",
        "alertThreshold": 5000,
        "actions": [
          {
            "type": "slack",
            "targetIdentifier": "#sre-alerts",
            "targetType": "specific"
          }
        ]
      },
      {
        "label": "warning",
        "alertThreshold": 3000,
        "actions": [
          {
            "type": "email",
            "targetIdentifier": "team-backend",
            "targetType": "team"
          }
        ]
      }
    ],
    "projects": ["my-project"],
    "environment": "production"
  }'
```

### Recommended Metric Alerts

#### 1. Error Rate Spike

- **Metric:** `count()` on error events
- **Threshold:** > 50 errors in 5 minutes (warning), > 200 in 5 minutes (critical)
- **Filter:** `environment:production`
- **Action:** Slack + PagerDuty (critical)

#### 2. P95 Latency Regression

- **Metric:** `p95(transaction.duration)`
- **Threshold:** > 3 s warning, > 5 s critical
- **Filter:** `transaction:/api/*`
- **Window:** 5 minutes
- **Action:** Slack notification

#### 3. Apdex Drop

- **Metric:** `apdex(300)` (300 ms threshold)
- **Threshold:** < 0.9 warning, < 0.7 critical
- **Window:** 10 minutes
- **Action:** Email the team lead

#### 4. Failure Rate Surge

- **Metric:** `failure_rate()`
- **Threshold:** > 5 % warning, > 15 % critical
- **Filter:** `transaction:/api/checkout`
- **Window:** 5 minutes
- **Action:** Page on-call

#### 5. Crash Free Rate Drop (Mobile)

- **Metric:** `crash_free_rate(session)`
- **Threshold:** < 99.5 % warning, < 98 % critical
- **Window:** 1 hour
- **Action:** Slack + mobile team email

---

## Uptime Monitors

Uptime monitors check whether your endpoints are reachable and responding correctly.

### Creating an Uptime Monitor (UI)

1. Go to **Alerts → Uptime Monitors → Create Monitor**.
2. Configure:
   - **URL:** `https://api.myapp.com/health`
   - **Interval:** every 1 minute
   - **Regions:** US, EU (checks from multiple locations)
   - **Expected status:** 200
   - **Timeout:** 10 seconds

### Creating an Uptime Monitor (API)

```bash
curl -X POST "https://sentry.io/api/0/organizations/${SENTRY_ORG}/monitors/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Health Check",
    "type": "uptime",
    "config": {
      "url": "https://api.myapp.com/health",
      "schedule_type": "interval",
      "schedule": [1, "minute"],
      "checkin_margin": 2,
      "max_runtime": 10,
      "timezone": "UTC"
    },
    "alert_rule": {
      "targets": [
        { "target_type": "specific", "target_identifier": "#sre-alerts" }
      ]
    }
  }'
```

### Recommended Uptime Monitors

| Monitor | URL | Interval | Alert After |
|---|---|---|---|
| API Health | `/health` or `/api/healthz` | 1 min | 2 consecutive failures |
| Homepage | `https://myapp.com` | 1 min | 2 consecutive failures |
| Auth Service | `/api/auth/health` | 1 min | 1 failure |
| Webhook Endpoint | `/api/webhooks/status` | 5 min | 3 consecutive failures |

---

## Cron Monitors

For scheduled jobs and background tasks, use Sentry Crons to detect missed or failed runs.

### Setup

```ts
// Wrap your cron job
import * as Sentry from "@sentry/node";

const checkInId = Sentry.captureCheckIn({
  monitorSlug: "daily-report-generation",
  status: "in_progress",
});

try {
  await generateDailyReport();

  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "daily-report-generation",
    status: "ok",
  });
} catch (error) {
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "daily-report-generation",
    status: "error",
  });
  Sentry.captureException(error);
}
```

### Configuration (API)

```bash
curl -X POST "https://sentry.io/api/0/organizations/${SENTRY_ORG}/monitors/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Report Generation",
    "slug": "daily-report-generation",
    "type": "cron_job",
    "config": {
      "schedule_type": "crontab",
      "schedule": "0 2 * * *",
      "checkin_margin": 10,
      "max_runtime": 30,
      "timezone": "UTC"
    }
  }'
```

---

## Alert Routing Best Practices

1. **Route by severity:** Critical alerts → PagerDuty / on-call. Warnings → Slack. Info → email digest.
2. **Set rate limits:** Use the `frequency` field (in minutes) to avoid alert fatigue — e.g., at most once per 30 minutes per issue.
3. **Use ownership rules:** Assign issues to teams based on file path or URL pattern so alerts go to the right people.
4. **Create environment-specific alerts:** Production alerts should have stricter thresholds and faster notification than staging.
5. **Review and tune regularly:** Audit alert rules monthly. Disable or tune noisy alerts. Add alerts for new critical paths.
6. **Use alert actions wisely:** Combine multiple actions (Slack + PagerDuty + assign issue) for critical alerts; use a single action (email) for low-priority alerts.
