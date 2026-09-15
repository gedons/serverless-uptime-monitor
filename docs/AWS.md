# AWS Infrastructure — Serverless Uptime Monitor

## Overview

All infrastructure is defined in `infrastructure/template.yaml` as an AWS SAM (Serverless Application Model) CloudFormation template. Resources are deployed to `eu-west-1` under the stack name `uptime-monitor-dev`.

---

## Resource Inventory

### Authentication — Amazon Cognito

| Resource | Logical ID | Description |
|---|---|---|
| User Pool | `UserPool` | Email-based sign-in, auto email verification, secure password policy (8+ chars, upper, lower, numbers, symbols) |
| App Client | `UserPoolClient` | SPA client (no secret). Auth flows: `USER_PASSWORD_AUTH`, `USER_SRP_AUTH`, `REFRESH_TOKEN_AUTH` |
| API Authorizer | `CognitoAuthorizer` | Default authorizer on all REST API routes; validates Cognito ID tokens |

---

### API — Amazon API Gateway (REST)

- SAM auto-creates a `ServerlessRestApi` resource.
- **CORS** configured globally: `GET,POST,PATCH,DELETE,OPTIONS` allowed from `FrontendCorsOrigin`.
- **Preflight bypass**: `AddDefaultAuthorizerToCorsPreflight: false` — OPTIONS requests skip auth.
- **Gateway responses** (`GatewayResponseDefault4XX`, `GatewayResponseDefault5XX`): Include CORS headers so browser auth errors don't result in opaque failures.

---

### Compute — AWS Lambda (Node.js 22, x86_64)

All functions are bundled with **esbuild** via SAM's `BuildMethod: esbuild`.

| Logical ID | HTTP Route | Auth | Description |
|---|---|---|---|
| `CreateMonitorFunction` | `POST /monitors` | ✅ Cognito | Create a new monitor |
| `ListMonitorsFunction` | `GET /monitors` | ✅ Cognito | List authenticated user's monitors |
| `GetMonitorFunction` | `GET /monitors/{monitorId}` | ✅ Cognito | Get single monitor (ownership checked) |
| `UpdateMonitorFunction` | `PATCH /monitors/{monitorId}` | ✅ Cognito | Update or pause/resume monitor |
| `DeleteMonitorFunction` | `DELETE /monitors/{monitorId}` | ✅ Cognito | Delete monitor + cascade delete checks & incidents |
| `GetCheckHistoryFunction` | `GET /monitors/{monitorId}/checks` | ✅ Cognito | Paginated check history |
| `TriggerManualCheckFunction` | `POST /monitors/{monitorId}/check` | ✅ Cognito | Trigger immediate health check |
| `GetMonitorIncidentsFunction` | `GET /monitors/{monitorId}/incidents` | ✅ Cognito | Incident timeline |
| `GetMonitorStatsFunction` | `GET /monitors/{monitorId}/stats` | ✅ Cognito | Uptime %, avg/min/max latency |
| `MonitorWorkerFunction` | EventBridge (schedule) | ❌ Internal | Scheduled worker — no API auth |

---

### Database — Amazon DynamoDB

All tables use `PAY_PER_REQUEST` billing (no capacity planning needed).

#### MonitorsTable (`uptime-monitor-dev-monitors`)
- **PK**: `monitorId` (String)
- **GSI**: `UserMonitorsIndex` — PK: `userId`, SK: `createdAt` — used by `ListMonitors`

#### CheckResultsTable (`uptime-monitor-dev-check-results`)
- **PK**: `checkId` (String)
- **GSI**: `MonitorHistoryIndex` — PK: `monitorId`, SK: `checkedAt` — used by `GetCheckHistory`

#### IncidentsTable (`uptime-monitor-dev-incidents`)
- **PK**: `incidentId` (String)
- **GSI**: `MonitorIncidentsIndex` — PK: `monitorId`, SK: `startedAt` — used by `GetMonitorIncidents`

---

### Scheduling — Amazon EventBridge

| Resource | Schedule | Target |
|---|---|---|
| `MonitorSchedule` | `rate(1 minute)` | `MonitorWorkerFunction` |

The worker queries `MonitorsTable` for all enabled monitors where `nextCheckAt ≤ now`, performs HTTP checks, and updates status/incidents accordingly.

---

### Messaging & Alerts

| Service | Resource | Purpose |
|---|---|---|
| **SNS** | `AlertTopic` (`uptime-monitor-dev-alerts`) | Optional ops subscription for outage events |
| **SES** | (IAM policy, no named resource) | Transactional email alerts on `UP ↔ DOWN` transitions |

Both `MonitorWorkerFunction` and `TriggerManualCheckFunction` have `ses:SendEmail` permission on `"*"`.

> [!IMPORTANT]
> SES runs in sandbox mode by default. Request production access in the SES console to send to unverified recipients.

---

## IAM Policies

SAM managed policies are used where possible:

| Function | Policies |
|---|---|
| `CreateMonitorFunction` | `DynamoDBCrudPolicy` on `MonitorsTable` |
| `ListMonitorsFunction` | `DynamoDBReadPolicy` on `MonitorsTable` |
| `GetMonitorFunction` | `DynamoDBReadPolicy` on `MonitorsTable` |
| `UpdateMonitorFunction` | `DynamoDBCrudPolicy` on `MonitorsTable` |
| `DeleteMonitorFunction` | `DynamoDBCrudPolicy` on `MonitorsTable`, `CheckResultsTable`, `IncidentsTable` |
| `GetCheckHistoryFunction` | `DynamoDBReadPolicy` on `MonitorsTable`, `CheckResultsTable` |
| `TriggerManualCheckFunction` | `DynamoDBCrudPolicy` on all 3 tables + `ses:SendEmail` |
| `GetMonitorIncidentsFunction` | `DynamoDBReadPolicy` on `MonitorsTable`, `IncidentsTable` |
| `GetMonitorStatsFunction` | `DynamoDBReadPolicy` on all 3 tables |
| `MonitorWorkerFunction` | `DynamoDBCrudPolicy` on all 3 tables + `SNSPublishMessagePolicy` + `ses:SendEmail` |

---

## Stack Outputs

After deploying `infrastructure/template.yaml`, the following outputs are available:

| Output Key | Description | Used For |
|---|---|---|
| `ApiUrl` | API Gateway base URL | `NUXT_PUBLIC_API_BASE` env var |
| `UserPoolId` | Cognito User Pool ID | `NUXT_PUBLIC_COGNITO_USER_POOL_ID` env var |
| `UserPoolClientId` | Cognito App Client ID | `NUXT_PUBLIC_COGNITO_CLIENT_ID` env var |
| `AlertTopicArn` | SNS Topic ARN | SNS email subscription |
| `MonitorsTableName` | DynamoDB table name | Reference / debugging |
| `CheckResultsTableName` | DynamoDB table name | Reference / debugging |
| `IncidentsTableName` | DynamoDB table name | Reference / debugging |

Retrieve outputs at any time:
```bash
aws cloudformation describe-stacks \
  --stack-name uptime-monitor-dev \
  --region eu-west-1 \
  --query "Stacks[0].Outputs"
```

---

## Configuration Parameters

`infrastructure/samconfig.toml`:

```toml
[default.deploy.parameters]
stack_name          = "uptime-monitor-dev"
resolve_s3          = true
s3_prefix           = "uptime-monitor-dev"
confirm_changeset   = true
capabilities        = "CAPABILITY_IAM"
parameter_overrides = "FrontendCorsOrigin=\"https://master.d271vygs1aytqt.amplifyapp.com\""

[default.global.parameters]
region = "eu-west-1"
```
