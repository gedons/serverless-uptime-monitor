# Serverless Uptime Monitor

A production-ready, multi-tenant serverless uptime monitoring SaaS built on AWS — fully deployed via GitHub Actions CI/CD.

[![Backend CI/CD](https://github.com/gedons/serverless-uptime-monitor/actions/workflows/backend-deploy.yml/badge.svg)](https://github.com/gedons/serverless-uptime-monitor/actions/workflows/backend-deploy.yml)
[![Frontend CI](https://github.com/gedons/serverless-uptime-monitor/actions/workflows/frontend-deploy.yml/badge.svg)](https://github.com/gedons/serverless-uptime-monitor/actions/workflows/frontend-deploy.yml)

---

## Features

- **AWS Cognito Authentication** — Email sign-in, auto-verification, JWT-based API Gateway authorizer, password reset flow.
- **Automated Health Checks** — Per-monitor interval scheduling via EventBridge + Lambda worker running every minute.
- **Live Dashboard Polling** — Frontend polls the API every 10 seconds for real-time check history updates without page refresh.
- **SSRF Protection** — Blocks private IPv4/IPv6, loopbacks (`127.0.0.1`, `::1`), RFC 1918 ranges, and cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).
- **Incident Detection & Tracking** — Automatically opens incidents on `UP → DOWN` transitions, records outage duration, and closes them on recovery.
- **SES Email Alerts** — AWS SES sends transactional email notifications on outage and recovery events.
- **SNS Alert Topic** — Supports email subscription for operational alerting via AWS SNS.
- **Cascade Delete** — Deleting a monitor removes all its associated check results and incidents from DynamoDB.
- **Analytics** — Uptime percentage, average/min/max response time, and total incident count per monitor.
- **Full REST API** — Multi-tenant user isolation, monitor CRUD, check history, manual triggers, incident timeline, and aggregated stats.
- **Nuxt 3 Dashboard** — SSR Nuxt 3 app hosted on AWS Amplify with Cognito sign-in, status indicators, and responsive views.

---

## Production Architecture

```text
GitHub
│
├── backend-deploy.yml ──► AWS SAM ──► CloudFormation
│                                         │
│                          ┌──────────────┴───────────────────────┐
│                          │              │                         │
│                     API Gateway    Lambda Functions          DynamoDB Tables
│                     + Cognito      (10 handlers)             (3 tables + GSIs)
│                          │              │
│                          │         EventBridge ──► MonitorWorker (every 1 min)
│                          │              │
│                          │         SNS + SES (email alerts)
│
└── frontend-deploy.yml ──► CI validation only
    (Amplify native build picks up frontend on push)
         │
    AWS Amplify Hosting ──► Nuxt 3 SSR ──► https://master.d271vygs1aytqt.amplifyapp.com
```

---

## Project Structure

```text
serverless-uptime-monitor/
├── .github/
│   └── workflows/
│       ├── backend-deploy.yml    # SAM build, test & deploy to AWS on push to master
│       └── frontend-deploy.yml  # Nuxt build validation CI (Amplify handles deploy)
├── backend/
│   ├── src/
│   │   ├── handlers/             # Lambda entry points (10 handlers)
│   │   ├── repositories/         # DynamoDB data access (monitors, checks, incidents)
│   │   ├── services/             # Business logic: monitorService, httpChecker, alertService
│   │   ├── types/                # TypeScript interfaces
│   │   └── utils/                # SSRF guard, auth, JSON helpers
│   └── tests/                    # Vitest unit & security test suite (22 tests)
├── frontend/                     # Nuxt 3 SSR dashboard (AWS Amplify hosted)
│   ├── composables/              # useApi, useAuth composables
│   ├── layouts/                  # App shell with header & sidebar
│   └── pages/                   # Overview, monitor detail, check history, incidents
├── infrastructure/
│   ├── template.yaml             # AWS SAM CloudFormation template
│   └── samconfig.toml            # SAM deployment config (stack, region, CORS)
└── docs/
    ├── API.md                    # Full REST API specification
    ├── ARCHITECTURE.md           # System architecture detail
    ├── AWS.md                    # AWS resource inventory
    └── DEPLOYMENT.md             # Local dev & CI/CD deployment guide
```

---

## CI/CD Pipeline

### Backend (Auto-deploys on push to `master`)
1. **Validate** — TypeScript typecheck + 22 Vitest unit tests
2. **SAM Validate** — CloudFormation template linting
3. **SAM Build** — esbuild bundles all 10 Lambda functions
4. **SAM Deploy** — Deploys/updates `uptime-monitor-dev` CloudFormation stack

> Requires GitHub Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### Frontend (AWS Amplify native build)
- Amplify watches the `master` branch and auto-builds on push.
- `frontend-deploy.yml` runs a separate CI validation (typecheck + build) to catch errors before Amplify picks up the change.

---

## Quick Start (Local Development)

### 1. Backend
```bash
cd backend
npm install
npm run typecheck
npm test
```

### 2. Infrastructure
```bash
cd infrastructure
sam build
sam deploy --guided   # first time only; subsequent deploys use samconfig.toml
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev           # http://localhost:3000
```

### 4. Environment Variables (frontend `.env`)
```env
NUXT_PUBLIC_API_BASE=https://<api-id>.execute-api.eu-west-1.amazonaws.com/Prod
NUXT_PUBLIC_COGNITO_USER_POOL_ID=<UserPoolId>
NUXT_PUBLIC_COGNITO_CLIENT_ID=<UserPoolClientId>
NUXT_PUBLIC_AWS_REGION=eu-west-1
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Nuxt 3, Vue 3, Tailwind CSS |
| Hosting | AWS Amplify (SSR via Nitro) |
| API | AWS API Gateway (REST) + Cognito Authorizer |
| Compute | AWS Lambda (Node.js 22, esbuild bundled) |
| Database | AWS DynamoDB (3 tables, PAY_PER_REQUEST) |
| Scheduler | AWS EventBridge (1-minute schedule) |
| Alerts | AWS SES (transactional email) + SNS |
| Auth | AWS Cognito User Pool |
| IaC | AWS SAM (CloudFormation) |
| CI/CD | GitHub Actions |
| Runtime | Node.js 22, TypeScript |
| Testing | Vitest |

---

## Documentation

- [API Specification](docs/API.md)
- [Architecture Guide](docs/ARCHITECTURE.md)
- [AWS Infrastructure](docs/AWS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)