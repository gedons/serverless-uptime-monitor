# System Architecture — Serverless Uptime Monitor

## Overview

The system is a fully serverless, multi-tenant uptime monitoring SaaS. Every component runs on managed AWS services — there are no servers to provision or maintain.

---

## High-Level Flow

```text
                    User Browser
                         │
                         ▼
              AWS Amplify (Nuxt 3 SSR)
              https://master.d271vygs1aytqt.amplifyapp.com
                         │
                         │  HTTPS (Cognito JWT)
                         ▼
              API Gateway (REST API)
              + Cognito Authorizer
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    Lambda Handlers  Lambda Handlers  Lambda Handlers
    (CRUD monitors)  (Check history)  (Incidents/Stats)
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 DynamoDB (3 tables)
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   MonitorsTable              CheckResultsTable
                                        │
                                 IncidentsTable

                EventBridge Schedule (every 1 minute)
                         │
                         ▼
                [MonitorWorkerFunction]
                         │
             reads MonitorsTable (due monitors)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    HTTP check     write result    detect incident
    (with SSRF     to Checks-      (UP ↔ DOWN
     protection)    Table           transition)
                                        │
                              ┌─────────┴──────────┐
                              ▼                     ▼
                       SES (email alert)     IncidentsTable
                       on outage/recovery    (open/close record)
```

---

## Data Model

### MonitorsTable
| Attribute | Type | Description |
|---|---|---|
| `monitorId` | PK (S) | Unique monitor ID (`mon_...`) |
| `userId` | GSI PK | Owner's Cognito `sub` claim |
| `createdAt` | GSI SK | ISO timestamp |
| `name` | S | Human-readable label |
| `url` | S | Target endpoint |
| `method` | S | HTTP method (`GET`, `POST`, etc.) |
| `interval` | N | Check interval in minutes |
| `timeout` | N | Request timeout in seconds |
| `enabled` | BOOL | Whether monitor is active |
| `status` | S | `UP` / `DOWN` / `UNKNOWN` |
| `nextCheckAt` | S | ISO timestamp for next scheduled check |

**GSI:** `UserMonitorsIndex` (`userId` PK, `createdAt` SK) — list all monitors for a user.

### CheckResultsTable
| Attribute | Type | Description |
|---|---|---|
| `checkId` | PK (S) | Unique check ID |
| `monitorId` | GSI PK | Parent monitor |
| `checkedAt` | GSI SK | ISO timestamp |
| `status` | S | `UP` / `DOWN` |
| `httpStatus` | N | HTTP response code |
| `responseTime` | N | Latency in milliseconds |
| `error` | S | Error message (if DOWN) |

**GSI:** `MonitorHistoryIndex` (`monitorId` PK, `checkedAt` SK) — paginated check history per monitor.

### IncidentsTable
| Attribute | Type | Description |
|---|---|---|
| `incidentId` | PK (S) | Unique incident ID |
| `monitorId` | GSI PK | Parent monitor |
| `startedAt` | GSI SK | Outage start ISO timestamp |
| `resolvedAt` | S | Recovery ISO timestamp (when resolved) |
| `durationSeconds` | N | Total outage duration |
| `status` | S | `OPEN` / `RESOLVED` |

**GSI:** `MonitorIncidentsIndex` (`monitorId` PK, `startedAt` SK) — incident timeline per monitor.

---

## Security

### Authentication
- All API endpoints require a valid Cognito JWT ID Token (`Authorization: Bearer <token>`).
- API Gateway validates tokens via the `CognitoAuthorizer` before invoking any Lambda.
- CORS preflight (`OPTIONS`) requests bypass the authorizer (`AddDefaultAuthorizerToCorsPreflight: false`).
- Gateway responses for 4XX/5XX include CORS headers to prevent browser errors on auth failures.

### Multi-tenancy
- Every Lambda handler extracts the user's `sub` claim from the Cognito token.
- All DynamoDB queries are scoped to `userId`; cross-user access returns `404 Not Found`.

### SSRF Protection
URL validation blocks monitoring of:
- Loopback addresses (`127.0.0.1`, `::1`, `localhost`)
- RFC 1918 private ranges (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- IPv6 link-local and private ranges
- Cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`, etc.)

---

## Scheduling & Worker

The `MonitorWorkerFunction` runs on a fixed 1-minute EventBridge schedule. On each invocation:
1. Scans `MonitorsTable` for all enabled monitors where `nextCheckAt ≤ now`.
2. Performs an HTTP check with timeout protection and SSRF validation.
3. Writes a `CheckResult` record.
4. Detects `UP ↔ DOWN` transitions:
   - `DOWN`: Opens a new `Incident` record, sends SES email alert.
   - `UP` (was DOWN): Closes the open `Incident`, calculates `durationSeconds`, sends SES recovery email.
5. Updates `status` and `nextCheckAt` on the monitor record.

---

## CI/CD Pipeline

```text
GitHub push to master
        │
        ├── backend-deploy.yml
        │       │
        │       ├── 1. npm ci + typecheck + vitest (22 tests)
        │       ├── 2. sam validate
        │       ├── 3. npm install -g esbuild
        │       ├── 4. sam build (esbuild bundles all 10 Lambda handlers)
        │       └── 5. sam deploy → uptime-monitor-dev CloudFormation stack
        │
        └── frontend-deploy.yml
                │
                └── npm ci + npm run build (CI validation only)

        Amplify native build ← triggers independently on master push
                │
                └── Nuxt 3 SSR → https://master.d271vygs1aytqt.amplifyapp.com
```
