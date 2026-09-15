# Serverless Uptime Monitor SaaS MVP

A production-ready serverless uptime monitoring platform built with AWS Lambda, API Gateway, DynamoDB, EventBridge, SNS, and Nuxt 3.

---

## Features

- **AWS Cognito Authentication**: User Pool with email verification, secure password policy, and JWT-based API Gateway authorizer.
- **Automated Health Checks**: Scheduled per-minute execution via AWS EventBridge & Lambda worker.
- **SSRF Protection**: Prevents monitoring private IPv4/IPv6 addresses, loopbacks (127.0.0.1, ::1), RFC1918 ranges, and cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).
- **Incident Detection & Tracking**: Automatically detects `UP` $\leftrightarrow$ `DOWN` transitions, opens incidents, records outage duration, and resolves incidents on recovery.
- **SNS Notifications**: Real-time email alerts sent via AWS SNS topic when services go down or recover.
- **Complete REST API**: Multi-tenant user isolation (UserMonitorsIndex), monitor CRUD, history querying, manual check triggers, incident timelines, and aggregated uptime stats.
- **Nuxt 3 Dashboard**: Polished SaaS interface with Cognito sign-in, account confirmation, password reset, Vue 3, Tailwind CSS, status indicators, and responsive management views..

---

## System Architecture

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

## Project Structure

```text
serverless-uptime-monitor/
├── backend/                  # TypeScript Lambda handlers & services
│   ├── src/
│   │   ├── handlers/         # API Gateway & EventBridge handlers
│   │   ├── repositories/     # DynamoDB data access objects
│   │   ├── services/         # Business logic, checker & notifications
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # SSRF validation & JSON responses
│   └── tests/                # Vitest unit & security test suite
├── frontend/                 # Nuxt 3 + Tailwind CSS Dashboard
│   ├── composables/          # API client
│   ├── layouts/              # App header & sidebar
│   └── pages/                # Overview, monitor manager & details
├── infrastructure/           # AWS SAM CloudFormation template
│   └── template.yaml
└── docs/                     # Documentation
    ├── API.md
    ├── AWS.md
    └── DEPLOYMENT.md
```

---

## Quick Start

### 1. Backend Build & Test
```powershell
cd backend
npm install
npm run typecheck
npm test
```

### 2. Infrastructure SAM Build
```powershell
cd infrastructure
sam build
```

### 3. Frontend Dev Server
```powershell
cd frontend
npm install
npm run dev
```

---

## Documentation Links

- [API Specification](docs/API.md)
- [AWS Infrastructure Guide](docs/AWS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)