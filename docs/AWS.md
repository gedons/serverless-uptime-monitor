# AWS Infrastructure Architecture - Serverless Uptime Monitor

## Overview
The platform is designed around AWS Serverless primitives for maximum availability, automated elasticity, and minimal operational cost.

```text
               EventBridge Schedule (Every 1 min)
                               │
                               ▼
                       [MonitorWorker]
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     MonitorsTable     CheckResultsTable   IncidentsTable
                                                  │ (On Outage/Recovery)
                                                  ▼
                                             AlertTopic (SNS)
                                                  │
                                                  ▼
                                            Email Subscriber
```

---

## AWS Resources

### 1. Amazon Cognito
- **`UserPool`**: User management pool configured for email sign-in, auto email verification, and secure password policy (min 8 chars, uppercase, lowercase, numbers).
- **`UserPoolClient`**: Client application interface configured for `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_SRP_AUTH`, and `ALLOW_REFRESH_TOKEN_AUTH` without client secret (SPA compatible).
- **`CognitoAuthorizer`**: Default API Gateway Authorizer attaching Cognito User Pool token verification to all REST API endpoints (except internal workers).

### 2. DynamoDB Tables
- **`MonitorsTable`**: Stores monitor definitions (`monitorId`, `userId`, `name`, `url`, `interval`, `enabled`, `status`, `nextCheckAt`). Includes GSI **`UserMonitorsIndex`** (`PK: userId`, `SK: createdAt`) for user-isolated queries.
- **`CheckResultsTable`**: Log of individual checks (`checkId`, `monitorId`, `status`, `httpStatus`, `responseTime`, `checkedAt`). Has GSI **`MonitorHistoryIndex`** (`PK: monitorId`, `SK: checkedAt`).
- **`IncidentsTable`**: Log of outage events (`incidentId`, `monitorId`, `startedAt`, `resolvedAt`, `durationSeconds`, `status`). Has GSI **`MonitorIncidentsIndex`** (`PK: monitorId`, `SK: startedAt`).

### 3. Lambda Functions
- `CreateMonitorFunction`: `POST /monitors` (Auth required)
- `ListMonitorsFunction`: `GET /monitors` (Auth required, user-isolated)
- `GetMonitorFunction`: `GET /monitors/{id}` (Auth required, ownership verified)
- `UpdateMonitorFunction`: `PATCH /monitors/{id}` (Auth required, ownership verified)
- `DeleteMonitorFunction`: `DELETE /monitors/{id}` (Auth required, ownership verified)
- `GetCheckHistoryFunction`: `GET /monitors/{id}/checks` (Auth required, ownership verified)
- `TriggerManualCheckFunction`: `POST /monitors/{id}/check` (Auth required, ownership verified)
- `GetMonitorIncidentsFunction`: `GET /monitors/{id}/incidents` (Auth required, ownership verified)
- `GetMonitorStatsFunction`: `GET /monitors/{id}/stats` (Auth required, ownership verified)
- `MonitorWorkerFunction`: Scheduled worker executed every minute by EventBridge (No API auth, internal batch process).

### 4. EventBridge & SNS
- **EventBridge Schedule Rule**: Triggers `MonitorWorkerFunction` every 1 minute.
- **`AlertTopic` (SNS)**: Sends email notifications on status transitions (`UP` $\rightarrow$ `DOWN` and `DOWN` $\rightarrow$ `UP`).

---

## SAM CloudFormation Outputs

Deploying `infrastructure/template.yaml` produces the following stack outputs:
- `ApiUrl`: API Gateway Base URL
- `UserPoolId`: Amazon Cognito User Pool ID
- `UserPoolClientId`: Amazon Cognito App Client ID
- `AlertTopicArn`: SNS Topic ARN for outage notifications
- `MonitorsTableName`: DynamoDB Monitors table name
- `CheckResultsTableName`: DynamoDB CheckResults table name
